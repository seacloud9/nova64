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
import { systemPromptFor, coerceMode } from '@nova64/agent-core';

// Nova64 VS Code extension (Phase 6). Reuses the host-neutral @nova64/ai-providers
// + @nova64/agent-core packages — the same seam the Electron desktop uses — so
// provider profiles and agent modes behave identically across both hosts. This
// first cut delivers a streaming AI chat panel; the agent tool loop (read/edit/
// run over vscode.workspace.fs) is the documented follow-up.

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

  let abort: AbortController | undefined;

  panel.webview.onDidReceiveMessage(async (msg: { type: string; messages?: ChatMessage[]; mode?: string }) => {
    if (msg.type === 'cancel') {
      abort?.abort();
      return;
    }
    if (msg.type !== 'chat' || !panel) return;

    abort?.abort();
    abort = new AbortController();

    const cfg = vscode.workspace.getConfiguration('nova64');
    const providerId = cfg.get<string>('ai.provider', 'echo');
    const provider: Provider = registry.get(providerId) ?? registry.get('echo')!;
    const mode = coerceMode(msg.mode ?? cfg.get<string>('ai.mode', 'ask'));
    const apiKey = (await context.secrets.get('nova64.apiKey')) ?? '';

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPromptFor(mode) },
      ...(msg.messages ?? []),
    ];
    const config = {
      baseUrl: cfg.get<string>('ai.baseUrl', ''),
      apiKey,
      model: cfg.get<string>('ai.model', ''),
      temperature: 0.7,
    };

    try {
      for await (const ev of provider.chat(config, messages, { signal: abort.signal })) {
        panel?.webview.postMessage(ev);
      }
    } catch (err) {
      panel?.webview.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  });
}

function nonce(): string {
  let s = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function chatHtml(webview: vscode.Webview): string {
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
  const history = [];
  let streaming = false, current = null;

  function bubble(cls, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function submit() {
    if (streaming) { vscode.postMessage({ type: 'cancel' }); return; }
    const text = input.value.trim(); if (!text) return;
    history.push({ role: 'user', content: text });
    bubble('user', text); input.value = '';
    current = bubble('assistant', ''); history.push({ role: 'assistant', content: '' });
    streaming = true; send.textContent = 'Stop';
    vscode.postMessage({ type: 'chat', messages: history.slice(0, -1), mode: mode.value });
  }
  send.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  window.addEventListener('message', e => {
    const ev = e.data;
    if (ev.type === 'delta') {
      if (current) { current.textContent += ev.text; log.scrollTop = log.scrollHeight; }
      const last = history[history.length - 1]; if (last) last.content += ev.text;
    } else if (ev.type === 'error') {
      if (current) { current.textContent += '\\n⚠ ' + ev.error; current.classList.add('err'); }
    }
    if (ev.type === 'done' || ev.type === 'error') { streaming = false; send.textContent = 'Send'; current = null; }
  });
</script>
</body></html>`;
}

export function deactivate(): void {
  panel?.dispose();
}
