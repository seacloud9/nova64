import * as vscode from 'vscode';
import {
  ProviderRegistry,
  createEchoProvider,
  createOpenAICompatibleProvider,
  createAnthropicProvider,
  createOpenCodeProvider,
  type Provider,
  type ChatMessage,
} from '@nova64/ai-providers';
import {
  systemPromptFor,
  coerceMode,
  toolInstructions,
  parseToolCalls,
  formatToolResult,
  ToolRunner,
  type ToolRunResult,
  type AgentMode,
} from '@nova64/agent-core';

// Nova64 VS Code extension (Phase 6). Reuses the host-neutral @nova64/ai-providers
// + @nova64/agent-core packages — the same seam the Electron desktop uses — so
// provider profiles, agent modes, and the tool/approval policy behave identically
// across both hosts. Unlike the desktop (host/renderer split), the whole agent
// loop runs in the extension host, which has agent-core bundled; the webview is
// just chat display + input, and tool approvals use native VS Code modals.

const MAX_AGENT_ITERATIONS = 8;
let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const registry = new ProviderRegistry()
    .register(createEchoProvider())
    .register(createOpenAICompatibleProvider())
    .register(createAnthropicProvider())
    .register(createOpenCodeProvider());

  context.subscriptions.push(
    vscode.commands.registerCommand('nova64.openChat', () => openChat(context, registry)),
    vscode.commands.registerCommand('nova64.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Nova64: AI API key (stored in VS Code SecretStorage)',
        password: true,
        ignoreFocusOut: true,
      });
      if (key !== undefined) {
        await context.secrets.store('nova64.apiKey', key);
        void vscode.window.showInformationMessage('Nova64: API key saved.');
      }
    })
  );
}

function openChat(context: vscode.ExtensionContext, registry: ProviderRegistry): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    return;
  }
  panel = vscode.window.createWebviewPanel('nova64Chat', 'Nova64 AI', vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  panel.onDidDispose(() => (panel = undefined), null, context.subscriptions);
  panel.webview.html = chatHtml(panel.webview);

  const conversation: ChatMessage[] = [];
  let abort: AbortController | undefined;

  panel.webview.onDidReceiveMessage(async (msg: { type: string; text?: string; mode?: string }) => {
    if (msg.type === 'cancel') {
      abort?.abort();
      return;
    }
    if (msg.type !== 'chat' || !panel || !msg.text) return;

    conversation.push({ role: 'user', content: msg.text });
    abort?.abort();
    abort = new AbortController();
    try {
      await runTurn(context, registry, panel, { conversation, mode: coerceMode(msg.mode), abort });
    } finally {
      panel?.webview.postMessage({ type: 'turn-done' });
    }
  });
}

interface TurnState {
  conversation: ChatMessage[];
  mode: AgentMode;
  abort: AbortController;
}

// The agent loop: stream a reply, run any tool calls (with native approval),
// feed results back, and continue until the model stops calling tools.
async function runTurn(
  context: vscode.ExtensionContext,
  registry: ProviderRegistry,
  view: vscode.WebviewPanel,
  state: TurnState
): Promise<void> {
  for (let iter = 0; iter < MAX_AGENT_ITERATIONS; iter++) {
    if (state.abort.signal.aborted) return;

    const cfg = vscode.workspace.getConfiguration('nova64');
    const provider: Provider = registry.get(cfg.get<string>('ai.provider', 'echo')) ?? registry.get('echo')!;
    const apiKey = (await context.secrets.get('nova64.apiKey')) ?? '';
    const system = [systemPromptFor(state.mode), toolInstructions(state.mode)].filter(Boolean).join('\n\n');
    const messages: ChatMessage[] = [{ role: 'system', content: system }, ...state.conversation];
    const config = {
      baseUrl: cfg.get<string>('ai.baseUrl', ''),
      apiKey,
      model: cfg.get<string>('ai.model', ''),
      temperature: 0.7,
    };

    let text = '';
    view.webview.postMessage({ type: 'assistant-start' });
    try {
      for await (const ev of provider.chat(config, messages, { signal: state.abort.signal })) {
        if (ev.type === 'delta') {
          text += ev.text;
          view.webview.postMessage({ type: 'delta', text: ev.text });
        }
      }
    } catch (err) {
      view.webview.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      return;
    }
    view.webview.postMessage({ type: 'assistant-done' });
    state.conversation.push({ role: 'assistant', content: text });

    if (state.abort.signal.aborted) return;
    if (state.mode !== 'edit' && state.mode !== 'agent') return;
    const calls = parseToolCalls(text);
    if (!calls.length) return;

    for (const call of calls) {
      if (state.abort.signal.aborted) return;
      const res = await runAgentTool(call, state.mode);
      view.webview.postMessage({ type: 'tool', text: toolLine(call, res) });
      const payload = res.status === 'ok' ? res.result : { status: res.status, error: res.error, reason: res.reason };
      state.conversation.push({ role: 'user', content: formatToolResult(call.tool, payload) });
    }
    // loop: re-stream with the tool results now in context
  }
  view.webview.postMessage({ type: 'tool', text: '⚠ Reached the tool-call limit for this turn.' });
}

// ── tool execution over vscode.workspace.fs ─────────────────────────────────

interface ToolCall {
  tool: string;
  args: Record<string, any>;
}

// Run one tool via agent-core's ToolRunner; mutating tools prompt a native modal.
async function runAgentTool(call: ToolCall, mode: AgentMode): Promise<ToolRunResult> {
  const host = makeFsHost();
  if (!host) return { status: 'error', tool: call.tool, error: 'no workspace folder open' };
  const runner = new ToolRunner({ host, mode });
  let res = await runner.run(call.tool, call.args, { approved: false });
  if (res.status === 'needs-approval') {
    const choice = await vscode.window.showWarningMessage(
      `Nova64 agent wants to ${approvalDetail(call)}`,
      { modal: true, detail: 'Approve this change to your workspace?' },
      'Approve'
    );
    res =
      choice === 'Approve'
        ? await runner.run(call.tool, call.args, { approved: true })
        : { status: 'denied', tool: call.tool, reason: 'user denied' };
  }
  return res;
}

type Host = Record<string, (args: Record<string, any>) => Promise<unknown>>;

function makeFsHost(): Host | null {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) return null;
  const dec = new TextDecoder();
  const enc = new TextEncoder();

  const resolve = (rel: string): vscode.Uri => {
    const clean = String(rel ?? '').replace(/\\/g, '/');
    if (/^([a-zA-Z]:|\/)/.test(clean) || clean.split('/').includes('..')) {
      throw new Error(`unsafe path: ${rel}`);
    }
    return clean ? vscode.Uri.joinPath(root, clean) : root;
  };
  const ensureParent = async (uri: vscode.Uri): Promise<void> => {
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, '..'));
    } catch {
      /* exists */
    }
  };

  return {
    async readFile(a) {
      const bytes = await vscode.workspace.fs.readFile(resolve(a.path));
      return { path: a.path, content: dec.decode(bytes).slice(0, 60000) };
    },
    async listDir(a) {
      const items = await vscode.workspace.fs.readDirectory(resolve(a.path || ''));
      const entries = items.map(([name, type]) => ({
        name,
        path: (a.path ? `${a.path}/` : '') + name,
        type: type === vscode.FileType.Directory ? 'dir' : 'file',
      }));
      return { path: a.path || '', entries };
    },
    async searchText(a) {
      return searchWorkspace(String(a.query ?? ''));
    },
    async writeFile(a) {
      const uri = resolve(a.path);
      await ensureParent(uri);
      await vscode.workspace.fs.writeFile(uri, enc.encode(String(a.content ?? '')));
      return { path: a.path, written: true };
    },
    async createDir(a) {
      await vscode.workspace.fs.createDirectory(resolve(a.path));
      return { path: a.path, created: true };
    },
    async movePath(a) {
      const to = resolve(a.to);
      await ensureParent(to);
      await vscode.workspace.fs.rename(resolve(a.from), to, { overwrite: false });
      return { from: a.from, to: a.to, moved: true };
    },
    async deletePath(a) {
      await vscode.workspace.fs.delete(resolve(a.path), { recursive: true, useTrash: true });
      return { path: a.path, deleted: true };
    },
  };
}

async function searchWorkspace(
  query: string
): Promise<{ query: string; matches: Array<{ path: string; line: number; text: string }>; truncated: boolean }> {
  if (!query) return { query, matches: [], truncated: false };
  const files = await vscode.workspace.findFiles('**/*', '**/{node_modules,.git,dist}/**', 500);
  const dec = new TextDecoder();
  const matches: Array<{ path: string; line: number; text: string }> = [];
  let truncated = false;
  for (const file of files) {
    if (truncated) break;
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(file);
      if (bytes.byteLength > 8 * 1024 * 1024) continue;
      text = dec.decode(bytes);
    } catch {
      continue;
    }
    if (text.indexOf(String.fromCharCode(0)) !== -1) continue; // binary
    const rel = vscode.workspace.asRelativePath(file, false);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(query)) {
        matches.push({ path: rel, line: i + 1, text: lines[i].slice(0, 240) });
        if (matches.length >= 100) {
          truncated = true;
          break;
        }
      }
    }
  }
  return { query, matches, truncated };
}

function approvalDetail(call: ToolCall): string {
  const a = call.args || {};
  if (call.tool === 'write_file') return `write ${a.path} (${String(a.content ?? '').length} chars)`;
  if (call.tool === 'delete_path') return `delete ${a.path}`;
  if (call.tool === 'create_dir') return `create directory ${a.path}`;
  if (call.tool === 'move_path') return `move ${a.from} → ${a.to}`;
  return `run ${call.tool}`;
}

function toolLine(call: ToolCall, res: ToolRunResult): string {
  const icon = res.status === 'ok' ? '✓' : res.status === 'denied' ? '⛔' : '⚠';
  let detail: string;
  if (res.status === 'ok') {
    const r = res.result as any;
    if (r?.written) detail = `wrote ${r.path}`;
    else if (r?.created) detail = `created ${r.path}`;
    else if (r?.moved) detail = `moved ${r.from} → ${r.to}`;
    else if (r?.deleted) detail = `deleted ${r.path}`;
    else if (Array.isArray(r?.entries)) detail = `${r.entries.length} entries`;
    else if (Array.isArray(r?.matches)) detail = `${r.matches.length} matches`;
    else if (r?.content != null) detail = `${String(r.content).length} chars`;
    else detail = 'done';
  } else {
    detail = res.reason || res.error || res.status;
  }
  return `${icon} ${call.tool} — ${detail}`;
}

function nonce(): string {
  let s = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function chatHtml(_webview: vscode.Webview): string {
  const n = nonce();
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${n}';`;
  return /* html */ `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
    background: var(--vscode-editor-background); margin: 0; display: flex; flex-direction: column; height: 100vh; }
  .head { display: flex; gap: 8px; align-items: center; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
  select, textarea, button { font: inherit; color: var(--vscode-input-foreground);
    background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; }
  #log { flex: 1; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .msg { padding: 6px 10px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; max-width: 92%; }
  .user { align-self: flex-end; background: var(--vscode-textBlockQuote-background); }
  .assistant { align-self: flex-start; background: var(--vscode-editorWidget-background); }
  .tool { align-self: stretch; max-width: 100%; font-family: var(--vscode-editor-font-family); font-size: 11px;
    color: var(--vscode-descriptionForeground); border: 1px solid var(--vscode-panel-border); }
  .err { color: var(--vscode-errorForeground); }
  .row { display: flex; gap: 8px; padding: 8px; border-top: 1px solid var(--vscode-panel-border); }
  #input { flex: 1; resize: none; padding: 6px; }
  #send { padding: 4px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
</style></head>
<body>
  <div class="head">
    <strong>Nova64 AI</strong>
    <select id="mode" title="Agent mode">
      <option value="ask">Ask</option><option value="plan">Plan</option>
      <option value="edit">Edit</option><option value="agent">Agent</option>
    </select>
    <span style="font-size:11px;color:var(--vscode-descriptionForeground)">edit/agent can change your files (with approval)</span>
  </div>
  <div id="log"></div>
  <div class="row">
    <textarea id="input" rows="2" placeholder="Ask the AI…  (Enter to send)"></textarea>
    <button id="send">Send</button>
  </div>
<script nonce="${n}">
  const vscode = acquireVsCodeApi();
  const log = document.getElementById('log');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  const mode = document.getElementById('mode');
  let busy = false, current = null;

  function bubble(cls, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function submit() {
    if (busy) { vscode.postMessage({ type: 'cancel' }); return; }
    const text = input.value.trim(); if (!text) return;
    bubble('user', text); input.value = '';
    busy = true; send.textContent = 'Stop';
    vscode.postMessage({ type: 'chat', text, mode: mode.value });
  }
  send.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  window.addEventListener('message', e => {
    const ev = e.data;
    if (ev.type === 'assistant-start') { current = bubble('assistant', ''); }
    else if (ev.type === 'delta') { if (current) { current.textContent += ev.text; log.scrollTop = log.scrollHeight; } }
    else if (ev.type === 'assistant-done') { current = null; }
    else if (ev.type === 'tool') { bubble('tool', ev.text); }
    else if (ev.type === 'error') { bubble('assistant err', '⚠ ' + ev.error); }
    else if (ev.type === 'turn-done') { busy = false; send.textContent = 'Send'; current = null; }
  });
</script>
</body></html>`;
}

export function deactivate(): void {
  panel?.dispose();
}
