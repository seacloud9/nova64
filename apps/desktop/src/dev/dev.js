// Absolute custom-scheme specifier avoids needing an inline import map (which
// the strict CSP would block). The `lib` host maps to packages/workspace-core.
import { Workspace } from 'nova64-app://lib/index.js';
import { parseToolCalls, formatToolResult } from 'nova64-app://agent/index.js';
import { lineDiff, diffStat } from './diff.js';
import { TextareaEditorAdapter, languageForPath } from './editor-adapter.js';
import { MonacoEditorAdapter } from './monaco-adapter.js';
import { RuntimePreview } from './preview.js';

const ws = new Workspace();
let editor = new TextareaEditorAdapter();
const fsapi = window.novaWorkspace || null;
const agentapi = window.novaAgent || null;

// Safety net so a stalled filesystem call (dead network mount, permission hang)
// can never freeze the Dev surface — the open/expand fails gracefully instead.
const OPEN_TIMEOUT_MS = 10000; // opening a workspace folder
const LISTDIR_TIMEOUT_MS = 8000; // expanding a single folder
const COUNT_TIMEOUT_MS = 60000; // background recursive file count (a full walk is slow over 9p)

/** Reject if `promise` doesn't settle within `ms`. Clears its timer either way. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const el = {
  project: document.getElementById('project'),
  openBtn: document.getElementById('open-btn'),
  openPathBtn: document.getElementById('open-path-btn'),
  pathInput: document.getElementById('path-input'),
  saveBtn: document.getElementById('save-btn'),
  tree: document.getElementById('tree'),
  explorerEmpty: document.getElementById('explorer-empty'),
  tabs: document.getElementById('tabs'),
  editorHost: document.getElementById('editor-host'),
  editorEmpty: document.getElementById('editor-empty'),
  statusPath: document.getElementById('status-path'),
  statusCount: document.getElementById('status-count'),
  statusDirty: document.getElementById('status-dirty'),
  runBtn: document.getElementById('run-btn'),
  workbench: document.getElementById('workbench'),
  previewPane: document.getElementById('preview-pane'),
  previewHost: document.getElementById('preview-host'),
  runConsole: document.getElementById('run-console'),
  previewReload: document.getElementById('preview-reload'),
  previewClose: document.getElementById('preview-close'),
  aiBtn: document.getElementById('ai-btn'),
  aiPane: document.getElementById('ai-pane'),
  aiMode: document.getElementById('ai-mode'),
  aiProvider: document.getElementById('ai-provider'),
  aiSettings: document.getElementById('ai-settings'),
  aiClose: document.getElementById('ai-close'),
  aiConfig: document.getElementById('ai-config'),
  aiPreset: document.getElementById('ai-preset'),
  aiBaseurl: document.getElementById('ai-baseurl'),
  aiModel: document.getElementById('ai-model'),
  aiKey: document.getElementById('ai-key'),
  aiTemp: document.getElementById('ai-temp'),
  aiTempRow: document.getElementById('ai-temp-row'),
  aiTopp: document.getElementById('ai-topp'),
  aiToppRow: document.getElementById('ai-topp-row'),
  aiMaxtokens: document.getElementById('ai-maxtokens'),
  aiPromptSelect: document.getElementById('ai-prompt-select'),
  aiPromptNew: document.getElementById('ai-prompt-new'),
  aiPromptDel: document.getElementById('ai-prompt-del'),
  aiPromptName: document.getElementById('ai-prompt-name'),
  aiPromptText: document.getElementById('ai-prompt-text'),
  aiSaveConfig: document.getElementById('ai-save-config'),
  aiMessages: document.getElementById('ai-messages'),
  aiInput: document.getElementById('ai-input'),
  aiSend: document.getElementById('ai-send'),
};

// ── AI chat (host-side providers via novaAi bridge) ─────────────────────────
const aiapi = window.novaAi || null;
let aiHistory = [];
let aiStreaming = false;
let aiAssistantEl = null;

// Agent mode (Phase 5): ask | plan | edit | agent. Persisted per machine; sent
// with each chat so the host injects the matching system prompt.
const AI_MODES = ['ask', 'plan', 'edit', 'agent'];
const MODE_HINTS = {
  ask: 'Ask a question…  (Enter to send, Shift+Enter for newline)',
  plan: 'Describe a task to plan…  (read-only: proposes steps, no edits)',
  edit: 'Describe an edit…  (proposes changes to review before applying)',
  agent: 'Give the agent a task…  (reads, edits & runs tools with approval)',
};
let aiMode = (() => {
  try {
    const saved = localStorage.getItem('nova64.dev.aiMode');
    return AI_MODES.includes(saved) ? saved : 'ask';
  } catch {
    return 'ask';
  }
})();
function applyAiMode(mode) {
  aiMode = AI_MODES.includes(mode) ? mode : 'ask';
  if (el.aiMode) el.aiMode.value = aiMode;
  if (el.aiInput) el.aiInput.placeholder = MODE_HINTS[aiMode];
  try {
    localStorage.setItem('nova64.dev.aiMode', aiMode);
  } catch {
    /* ignore quota */
  }
}

function showAi(show) {
  el.aiPane.hidden = !show;
  el.workbench.classList.toggle('with-ai', show);
  if (show) {
    loadAiState();
    el.aiInput.focus();
  }
}

let aiPresets = []; // provider presets from the host
let aiPrompts = []; // system-prompt library (local mirror of config.systemPrompts)
let aiActivePromptId = '';

function fillSelect(select, items, value, toOption) {
  select.innerHTML = '';
  for (const it of items) {
    const opt = document.createElement('option');
    const { v, label } = toOption(it);
    opt.value = v;
    opt.textContent = label;
    if (v === value) opt.selected = true;
    select.appendChild(opt);
  }
}

// Hide temperature/top-p when the active preset's models reject them (e.g. Claude).
function reflectSamplingSupport() {
  const preset = aiPresets.find(p => p.id === el.aiPreset.value);
  const sampling = preset ? preset.sampling !== false : true;
  if (el.aiTempRow) el.aiTempRow.style.display = sampling ? '' : 'none';
  if (el.aiToppRow) el.aiToppRow.style.display = sampling ? '' : 'none';
}

function loadPromptIntoEditor(id) {
  aiActivePromptId = id || '';
  const p = aiPrompts.find(x => x.id === aiActivePromptId);
  el.aiPromptName.value = p ? p.name : '';
  el.aiPromptText.value = p ? p.text : '';
}

async function loadAiState() {
  if (!aiapi) return;
  const st = await aiapi.state();
  aiPresets = st.presets || [];
  aiPrompts = (st.config.systemPrompts || []).slice();
  aiActivePromptId = st.config.activeSystemPromptId || '';

  // Provider dropdown (in the header).
  fillSelect(el.aiProvider, st.providers, st.config.providerId, p => ({ v: p.id, label: p.displayName }));

  // Preset dropdown: match the current config to a preset by provider+baseUrl.
  if (el.aiPreset) {
    const match = aiPresets.find(p => p.providerId === st.config.providerId && p.baseUrl === st.config.baseUrl);
    el.aiPreset.innerHTML = '<option value="">Custom…</option>';
    for (const p of aiPresets) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label + (p.needsKey ? '' : ' · no key');
      if (match && p.id === match.id) opt.selected = true;
      el.aiPreset.appendChild(opt);
    }
  }

  el.aiBaseurl.value = st.config.baseUrl || '';
  el.aiModel.value = st.config.model || '';
  el.aiKey.placeholder = st.hasKey ? '•••• saved' : '(optional — added when you have one)';
  if (el.aiTemp) el.aiTemp.value = st.config.temperature ?? 0.7;
  if (el.aiTopp) el.aiTopp.value = st.config.topP ?? 1;
  if (el.aiMaxtokens) el.aiMaxtokens.value = st.config.maxOutputTokens ?? 4096;

  // System-prompt library.
  if (el.aiPromptSelect) {
    el.aiPromptSelect.innerHTML = '<option value="">None (mode default only)</option>';
    for (const p of aiPrompts) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === aiActivePromptId) opt.selected = true;
      el.aiPromptSelect.appendChild(opt);
    }
    loadPromptIntoEditor(aiActivePromptId);
  }

  reflectSamplingSupport();
}

// Gather the whole config panel and persist it via the host.
async function saveAiConfig() {
  if (!aiapi) return;
  // Capture the current editor into the active prompt (or as a new one).
  const name = el.aiPromptName.value.trim();
  const text = el.aiPromptText.value;
  if (text.trim() || name) {
    let p = aiPrompts.find(x => x.id === aiActivePromptId);
    if (!p) {
      p = { id: `sp_${Math.random().toString(36).slice(2, 9)}`, name: name || 'Untitled', text };
      aiPrompts.push(p);
      aiActivePromptId = p.id;
    } else {
      p.name = name || p.name;
      p.text = text;
    }
  }
  const st = await aiapi.setConfig({
    providerId: el.aiProvider.value,
    baseUrl: el.aiBaseurl.value.trim(),
    model: el.aiModel.value.trim(),
    temperature: parseFloat(el.aiTemp.value),
    topP: parseFloat(el.aiTopp.value),
    maxOutputTokens: parseInt(el.aiMaxtokens.value, 10),
    systemPrompts: aiPrompts,
    activeSystemPromptId: aiActivePromptId,
  });
  if (el.aiKey.value) {
    await aiapi.setKey(el.aiKey.value);
    el.aiKey.value = '';
  }
  return st;
}

function addAiMessage(role, content) {
  aiHistory.push({ role, content });
  const div = document.createElement('div');
  div.className = `ai-msg ai-${role}`;
  div.textContent = content;
  el.aiMessages.appendChild(div);
  el.aiMessages.scrollTop = el.aiMessages.scrollHeight;
  return div;
}

async function sendAiMessage() {
  if (!aiapi || aiStreaming) return;
  const text = el.aiInput.value.trim();
  if (!text) return;
  agentIterations = 0; // fresh tool-loop budget per user message
  addAiMessage('user', text);
  el.aiInput.value = '';
  aiAssistantEl = addAiMessage('assistant', '');
  aiStreaming = true;
  el.aiSend.textContent = 'Stop';
  await aiapi.chat(aiHistory.slice(0, -1), { mode: aiMode }); // history without the empty assistant
}

if (aiapi) {
  aiapi.onEvent(ev => {
    const last = aiHistory[aiHistory.length - 1];
    if (ev.type === 'delta') {
      if (aiAssistantEl) {
        aiAssistantEl.textContent += ev.text;
        el.aiMessages.scrollTop = el.aiMessages.scrollHeight;
      }
      if (last) last.content += ev.text;
    } else if (ev.type === 'error' && aiAssistantEl) {
      aiAssistantEl.textContent += `\n⚠ ${ev.error || 'error'}`;
      aiAssistantEl.classList.add('ai-error');
    }
    if (ev.type === 'done' || ev.type === 'cancelled' || ev.type === 'error') {
      aiStreaming = false;
      el.aiSend.textContent = 'Send';
      aiAssistantEl = null;
      if (ev.type === 'done') maybeRunAgentTools();
    }
  });
}

// ── agent tool loop (Phase 5) ───────────────────────────────────────────────
// In edit/agent mode, the model requests tools via fenced ```tool blocks. We
// run each against the workspace (via the host ToolRunner), surface an approval
// card for mutating tools, feed the results back as the next turn, and continue
// until the model replies without a tool call (or we hit the per-message cap).
const MAX_AGENT_ITERATIONS = 8;
let agentIterations = 0;

function uiBubble(cls, content) {
  const div = document.createElement('div');
  div.className = `ai-msg ${cls}`;
  div.textContent = content;
  el.aiMessages.appendChild(div);
  el.aiMessages.scrollTop = el.aiMessages.scrollHeight;
  return div;
}

function summarizeResult(r) {
  if (r == null) return 'done';
  if (typeof r === 'string') return r.slice(0, 140);
  if (Array.isArray(r.entries)) return `${r.entries.length} entries`;
  if (Array.isArray(r.matches)) return `${r.matches.length} matches`;
  if (r.content != null) return `${String(r.content).length} chars read`;
  if (r.written) return `wrote ${r.path}`;
  try {
    return JSON.stringify(r).slice(0, 140);
  } catch {
    return 'done';
  }
}

function renderToolResult(call, res) {
  const icon = res.status === 'ok' ? '✓' : res.status === 'denied' ? '⛔' : '⚠';
  const detail = res.status === 'ok' ? summarizeResult(res.result) : res.reason || res.error || res.status;
  uiBubble('ai-tool', `${icon} ${call.tool} — ${detail}`);
}

function approvalDetail(call) {
  if (call.tool === 'write_file') {
    return `write ${call.args.path} (${String(call.args.content ?? '').length} chars)`;
  }
  if (call.tool === 'delete_path') return `delete ${call.args.path}`;
  try {
    return JSON.stringify(call.args).slice(0, 120);
  } catch {
    return '';
  }
}

// Render an approval card and resolve with the run result (approve → run;
// deny → a denied result). Mutating tools go through here.
function requestApproval(call, res) {
  return new Promise(resolve => {
    const card = document.createElement('div');
    card.className = 'ai-approval';
    const desc = document.createElement('div');
    desc.className = 'ai-approval-desc';
    desc.textContent = `Approve ${res.title || call.tool}? ${approvalDetail(call)}`;
    const row = document.createElement('div');
    row.className = 'ai-approval-actions';
    const approve = document.createElement('button');
    approve.className = 'ai-approve';
    approve.type = 'button';
    approve.textContent = 'Approve';
    const deny = document.createElement('button');
    deny.className = 'ai-deny';
    deny.type = 'button';
    deny.textContent = 'Deny';
    row.append(approve, deny);
    card.append(desc, row);
    el.aiMessages.appendChild(card);
    el.aiMessages.scrollTop = el.aiMessages.scrollHeight;

    // For write_file, show a diff of the proposed change so it's reviewable.
    if (call.tool === 'write_file' && fsapi && call.args && call.args.path) {
      renderWriteDiff(card, row, call);
    }

    const finish = result => {
      approve.disabled = true;
      deny.disabled = true;
      resolve(result);
    };
    approve.addEventListener('click', async () => {
      desc.textContent = `Running ${call.tool}…`;
      let r;
      try {
        r = await agentapi.runTool({ tool: call.tool, args: call.args, mode: aiMode, approved: true });
      } catch (err) {
        r = { status: 'error', error: err.message || String(err) };
      }
      card.classList.add('approved');
      finish(r);
    });
    deny.addEventListener('click', () => {
      card.classList.add('denied');
      finish({ status: 'denied', reason: 'user denied' });
    });
  });
}

function appendDiffLine(box, type, text) {
  const line = document.createElement('div');
  line.className = `diff-line diff-${type}`;
  line.textContent = (type === 'add' ? '+ ' : type === 'del' ? '- ' : '  ') + text;
  box.appendChild(line);
}

// Render a diff of the proposed write into the approval card (header + lines).
async function renderWriteDiff(card, beforeEl, call) {
  const box = document.createElement('div');
  box.className = 'ai-diff';
  box.textContent = 'Loading diff…';
  card.insertBefore(box, beforeEl);

  let oldText = null; // null = file does not exist yet (new file)
  try {
    oldText = await fsapi.read(call.args.path);
  } catch {
    oldText = null;
  }
  const newText = String(call.args.content ?? '');
  box.textContent = '';

  const header = document.createElement('div');
  header.className = 'ai-diff-head';
  if (oldText === null) {
    const lines = newText === '' ? [] : newText.split('\n');
    header.textContent = `${call.args.path}  (new file, +${lines.length})`;
    for (const text of lines) appendDiffLine(box, 'add', text);
  } else {
    const diff = lineDiff(oldText, newText);
    const { add, del } = diffStat(diff);
    header.textContent = `${call.args.path}  (+${add} −${del})`;
    const MAX = 400;
    for (const d of diff.slice(0, MAX)) appendDiffLine(box, d.type, d.text);
    if (diff.length > MAX) appendDiffLine(box, 'ctx', `… ${diff.length - MAX} more lines`);
  }
  card.insertBefore(header, box);
}

// After the agent writes a file, reflect it in the Dev surface: reload an open
// tab from disk (unless it has unsaved edits — don't clobber the user) and
// refresh the explorer so new files appear.
async function syncFileFromDisk(relPath) {
  if (!fsapi || !relPath) return;
  if (ws.tabs.has(relPath)) {
    if (ws.isDirty(relPath)) {
      uiBubble(
        'ai-tool',
        `⚠ ${relPath} was written by the agent but has unsaved edits open — not reloaded.`
      );
    } else {
      try {
        const content = await fsapi.read(relPath);
        ws.markSaved(relPath, content); // content + baseline = on-disk truth (not dirty)
        if (ws.activePath === relPath) editor.setModel(relPath, content, languageForPath(relPath));
        renderTabs();
        updateStatus();
      } catch {
        /* file vanished — ignore */
      }
    }
  }
  await refreshEntries();
}

// After the agent deletes a path, close its tab if open and refresh the tree.
async function syncDeletedFromDisk(relPath) {
  if (!relPath) return;
  if (ws.tabs.has(relPath)) {
    ws.closeTab(relPath, { force: true });
    showActive();
  }
  await refreshEntries();
}

async function maybeRunAgentTools() {
  if (!agentapi || aiStreaming) return;
  if (aiMode !== 'edit' && aiMode !== 'agent') return;
  const last = aiHistory[aiHistory.length - 1];
  if (!last || last.role !== 'assistant') return;
  const calls = parseToolCalls(last.content);
  if (!calls.length) return;
  if (agentIterations >= MAX_AGENT_ITERATIONS) {
    uiBubble('ai-tool', '⚠ Reached the tool-call limit for this turn — stopping.');
    return;
  }
  agentIterations++;

  for (const call of calls) {
    let res;
    try {
      res = await agentapi.runTool({ tool: call.tool, args: call.args, mode: aiMode });
    } catch (err) {
      res = { status: 'error', error: err.message || String(err) };
    }
    if (res.status === 'needs-approval') res = await requestApproval(call, res);
    renderToolResult(call, res);
    const payload =
      res.status === 'ok' ? res.result : { status: res.status, error: res.error, reason: res.reason };
    aiHistory.push({ role: 'user', content: formatToolResult(call.tool, payload) });
    // Reflect a successful agent mutation into the editor/tree.
    if (call.tool === 'write_file' && res.status === 'ok') await syncFileFromDisk(call.args.path);
    else if (call.tool === 'delete_path' && res.status === 'ok') await syncDeletedFromDisk(call.args.path);
  }

  // Continue the conversation with the tool results now in context.
  aiAssistantEl = addAiMessage('assistant', '');
  aiStreaming = true;
  el.aiSend.textContent = 'Stop';
  await aiapi.chat(aiHistory.slice(0, -1), { mode: aiMode });
}

let preview = null;
function ensurePreview() {
  if (!preview) preview = new RuntimePreview({ host: el.previewHost, consoleEl: el.runConsole });
  return preview;
}
function showPreview(show) {
  el.previewPane.hidden = !show; // modal overlay — no workbench resize
}
function runActiveCart() {
  const p = ws.activePath;
  if (!p) return;
  showPreview(true);
  ensurePreview().run(editor.getValue());
}

// ── session persistence (per opened root) ───────────────────────────────────
const sessionKey = root => `nova64.dev.session:${root}`;
function persistSession() {
  if (!ws.root) return;
  try {
    localStorage.setItem(sessionKey(ws.root), JSON.stringify(ws.serialize()));
  } catch {
    /* ignore quota */
  }
}
function readSession(root) {
  try {
    return JSON.parse(localStorage.getItem(sessionKey(root)) || 'null');
  } catch {
    return null;
  }
}

// ── lazy file tree ───────────────────────────────────────────────────────────
// The explorer loads ONE directory level at a time: opening a folder lists only
// its top level, and each folder fetches its children the first time it's
// expanded. Browsing a huge tree (the whole repo is ~10k files over WSL's slow
// 9p mount) stays instant — we never do an upfront recursive walk.
//
// Node shape: dirs = { name, path, type:'dir', children:null, loaded:false };
// files = { name, path, type:'file' }. `children` is null until first expand.
let treeRoots = [];
const expandedDirs = new Set(); // dir paths currently expanded

function toNode(entry) {
  return entry.type === 'dir'
    ? { name: entry.name, path: entry.path, type: 'dir', children: null, loaded: false }
    : { name: entry.name, path: entry.path, type: 'file' };
}

/** Fetch and cache a directory's immediate children (times out gracefully). */
async function loadDir(node) {
  if (!fsapi) return;
  try {
    const kids = await withTimeout(fsapi.listDir(node.path), LISTDIR_TIMEOUT_MS, `Reading ${node.name}`);
    node.children = kids.map(toNode);
  } catch (err) {
    node.children = []; // render as empty rather than hanging the tree
    el.statusPath.textContent = `Could not read ${node.path}: ${err.message || err}`;
  }
  node.loaded = true; // mark loaded either way so we don't retry-storm a bad dir
}

/** Walk `dirPath`, loading + expanding every directory along it (inclusive). */
async function ensureExpanded(dirPath) {
  if (!dirPath) return;
  let nodes = treeRoots;
  let acc = '';
  for (const seg of dirPath.split('/')) {
    acc = acc ? `${acc}/${seg}` : seg;
    const dir = nodes.find(n => n.type === 'dir' && n.name === seg);
    if (!dir) return; // segment not present (e.g. a skipped dir)
    if (!dir.loaded) await loadDir(dir);
    expandedDirs.add(dir.path);
    nodes = dir.children || [];
  }
}

/** Reveal a file in the tree by expanding its ancestor folders. */
async function revealInTree(relPath) {
  const segs = String(relPath).split('/');
  segs.pop(); // drop the file segment
  if (segs.length) await ensureExpanded(segs.join('/'));
}

async function toggleDir(node) {
  if (expandedDirs.has(node.path)) {
    expandedDirs.delete(node.path);
  } else {
    if (!node.loaded) await loadDir(node); // lazy fetch on first open
    expandedDirs.add(node.path);
  }
  renderTree();
}

function renderTree() {
  el.tree.textContent = '';
  const hasFiles = treeRoots.length > 0;
  el.explorerEmpty.style.display = hasFiles ? 'none' : '';
  if (!hasFiles) return;

  const buildNode = (node, depth) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = `tree-row ${node.type}`;
    row.style.paddingLeft = `${8 + depth * 12}px`;
    row.tabIndex = 0;
    row.dataset.path = node.path;

    if (node.type === 'dir') {
      const isOpen = expandedDirs.has(node.path);
      row.textContent = `${isOpen ? '▾' : '▸'} 📁 ${node.name}`;
      row.addEventListener('click', () => toggleDir(node));
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleDir(node);
        }
      });
      li.appendChild(row);
      if (isOpen && node.children && node.children.length) {
        const ul = document.createElement('ul');
        ul.className = 'tree';
        for (const child of node.children) ul.appendChild(buildNode(child, depth + 1));
        li.appendChild(ul);
      }
    } else {
      row.textContent = `📄 ${node.name}`;
      if (node.path === ws.activePath) row.classList.add('is-active');
      row.addEventListener('click', () => openFile(node.path));
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFile(node.path);
        }
      });
      li.appendChild(row);
    }
    return li;
  };

  for (const child of treeRoots) el.tree.appendChild(buildNode(child, 0));
}

function renderTabs() {
  el.tabs.textContent = '';
  for (const tab of ws.listTabs()) {
    const chip = document.createElement('div');
    chip.className = `tab${tab.active ? ' is-active' : ''}`;
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', String(tab.active));

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.path.split('/').pop();
    label.title = tab.path;
    label.addEventListener('click', () => {
      ws.setActive(tab.path);
      showActive();
    });

    const dot = document.createElement('span');
    dot.className = `tab-dirty${tab.dirty ? ' on' : ''}`;
    dot.textContent = tab.dirty ? '●' : '';

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', `Close ${tab.path}`);
    close.addEventListener('click', e => {
      e.stopPropagation();
      closeTab(tab.path);
    });

    chip.append(label, dot, close);
    el.tabs.appendChild(chip);
  }
}

function updateStatus() {
  const p = ws.activePath;
  el.statusPath.textContent = p || '';
  el.statusDirty.textContent = p && ws.isDirty(p) ? 'unsaved' : '';
  el.saveBtn.disabled = !(p && ws.isDirty(p));
  el.runBtn.disabled = !p;
}

function showActive() {
  const p = ws.activePath;
  const hasActive = Boolean(p);
  // Keep the editor host mounted/visible (Monaco needs a sized container); the
  // empty-state overlay simply sits on top when nothing is open.
  el.editorEmpty.style.display = hasActive ? 'none' : '';
  if (hasActive) {
    editor.setModel(p, ws.tabs.get(p).content, languageForPath(p));
    editor.focus();
  } else {
    editor.clear();
  }
  renderTree();
  renderTabs();
  updateStatus();
}

// ── actions ─────────────────────────────────────────────────────────────────
async function openFile(path) {
  if (!fsapi) return;
  if (!ws.tabs.has(path)) {
    try {
      const content = await fsapi.read(path);
      ws.openTab(path, content);
    } catch (err) {
      el.statusPath.textContent = `Failed to open ${path}: ${err.message || err}`;
      return;
    }
  } else {
    ws.setActive(path);
  }
  await revealInTree(path); // lazily expand ancestor folders so the file is visible
  showActive();
  persistSession();
}

function closeTab(path) {
  if (ws.isDirty(path) && !confirm(`Discard unsaved changes to ${path}?`)) return;
  ws.closeTab(path, { force: true });
  showActive();
  persistSession();
}

async function saveActive() {
  const p = ws.activePath;
  if (!p || !ws.isDirty(p) || !fsapi) return;
  try {
    await fsapi.write(p, ws.tabs.get(p).content);
    ws.markSaved(p);
    renderTabs();
    updateStatus();
    persistSession();
  } catch (err) {
    el.statusPath.textContent = `Save failed: ${err.message || err}`;
  }
}

async function loadWorkspace(info) {
  const { root, name, children } = info;
  ws.root = root;
  ws.name = name;
  el.project.textContent = name || root;
  // Reset the lazy tree to just this folder's top level (collapsed).
  treeRoots = (children || []).map(toNode);
  expandedDirs.clear();

  // Restore previously-open tabs for this folder (best-effort).
  const session = readSession(root);
  if (session && Array.isArray(session.open)) {
    for (const relPath of session.open) {
      try {
        const content = await fsapi.read(relPath);
        ws.openTab(relPath, content);
        await revealInTree(relPath); // expand ancestors so restored tabs are visible
      } catch {
        /* file gone — skip */
      }
    }
    if (session.active && ws.tabs.has(session.active)) ws.setActive(session.active);
  }
  showActive();
  countWorkspaceFiles(); // background total-file count — never blocks the open
}

let countToken = 0;
/** Recursively count files in the open folder in the background, then show the total. */
async function countWorkspaceFiles() {
  if (!fsapi || !fsapi.count || !el.statusCount) return;
  const token = ++countToken; // a newer open supersedes this count
  el.statusCount.textContent = 'Counting files…';
  try {
    const res = await withTimeout(fsapi.count(), COUNT_TIMEOUT_MS, 'Counting files');
    if (token !== countToken) return; // stale — another folder was opened
    const files = res.files.toLocaleString();
    const dirs = res.dirs.toLocaleString();
    el.statusCount.textContent = `${files} files · ${dirs} folders${res.truncated ? ' (capped)' : ''}`;
  } catch {
    if (token === countToken) el.statusCount.textContent = 'File count unavailable';
  }
}

async function refreshEntries() {
  if (!fsapi || !ws.root) return;
  try {
    // Re-list the root, then reload the folders the user had expanded so their
    // contents reflect on-disk changes. Collapsed folders stay untouched (lazy).
    const wasExpanded = [...expandedDirs].sort(); // shallow → deep, so parents load first
    treeRoots = (await fsapi.listDir('')).map(toNode);
    expandedDirs.clear();
    for (const dirPath of wasExpanded) await ensureExpanded(dirPath);
    renderTree();
  } catch {
    /* ignore */
  }
}

// ── wire-up ─────────────────────────────────────────────────────────────────
const wireEditorChange = () =>
  editor.onChange(value => {
    const p = ws.activePath;
    if (!p) return;
    ws.setContent(p, value);
    renderTabs();
    updateStatus();
  });

let suggestedPath = '';
let openInFlight = false;

async function openByPath(rawPath) {
  const target = (rawPath && rawPath.trim()) || suggestedPath;
  if (!fsapi || !target) {
    el.pathInput.focus();
    el.statusPath.textContent = 'Enter a folder path to open.';
    return;
  }
  if (openInFlight) return; // ignore double-clicks while a folder is opening
  openInFlight = true;
  el.openPathBtn.disabled = true;
  el.openBtn.disabled = true;
  el.statusPath.textContent = `Opening ${target}…`;
  try {
    const info = await withTimeout(fsapi.openPath(target), OPEN_TIMEOUT_MS, 'Opening folder');
    if (info) {
      el.pathInput.value = info.root;
      await loadWorkspace(info);
      el.statusPath.textContent = `Opened ${info.root} (${(info.children || []).length} top-level items)`;
    }
  } catch (err) {
    const msg = `Could not open "${target}": ${err.message || err}`;
    el.statusPath.textContent = msg;
    el.project.textContent = 'Open failed — see status bar';
  } finally {
    openInFlight = false;
    el.openPathBtn.disabled = false;
    el.openBtn.disabled = false;
  }
}
el.openPathBtn.addEventListener('click', () => openByPath(el.pathInput.value));
el.pathInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') openByPath(el.pathInput.value);
});

async function requestOpenFolder() {
  if (!fsapi) {
    el.project.textContent = 'Workspace bridge unavailable (run in the desktop app)';
    return;
  }
  // The native GTK picker hangs under WSLg, so on Linux drive the path input.
  if (fsapi.platform === 'linux') {
    el.pathInput.focus();
    el.pathInput.select();
    el.statusPath.textContent =
      'Edit the folder path and press Enter (native picker is unreliable under WSLg/Linux).';
    return;
  }
  const info = await fsapi.open();
  if (info) {
    el.pathInput.value = info.root;
    await loadWorkspace(info);
  }
}
el.openBtn.addEventListener('click', requestOpenFolder);

// File-menu commands routed from the chrome frame's menu bar.
if (window.novaDev && typeof window.novaDev.onCommand === 'function') {
  window.novaDev.onCommand(cmd => {
    if (cmd === 'open') requestOpenFolder();
    else if (cmd === 'run') runActiveCart();
    else if (cmd === 'save') saveActive();
  });
}
el.saveBtn.addEventListener('click', saveActive);
el.runBtn.addEventListener('click', runActiveCart);
el.previewReload.addEventListener('click', () => preview && preview.reload());
el.previewClose.addEventListener('click', () => showPreview(false));
// Dismiss the preview modal by clicking the backdrop or pressing Escape.
const previewBackdrop = document.getElementById('preview-backdrop');
if (previewBackdrop) previewBackdrop.addEventListener('click', () => showPreview(false));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && el.previewPane && !el.previewPane.hidden) showPreview(false);
});

el.aiBtn.addEventListener('click', () => showAi(el.aiPane.hidden));
el.aiClose.addEventListener('click', () => showAi(false));
el.aiSettings.addEventListener('click', () => {
  el.aiConfig.hidden = !el.aiConfig.hidden;
});
el.aiSend.addEventListener('click', () => {
  if (aiStreaming) aiapi && aiapi.cancel();
  else sendAiMessage();
});
el.aiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAiMessage();
  }
});
el.aiProvider.addEventListener('change', () => {
  if (aiapi) aiapi.setConfig({ providerId: el.aiProvider.value }).then(loadAiState);
});
if (el.aiMode) {
  applyAiMode(aiMode); // reflect the saved mode into the selector + input hint
  el.aiMode.addEventListener('change', () => applyAiMode(el.aiMode.value));
}

// Selecting a preset prefills provider + endpoint + default model (key stays optional).
if (el.aiPreset) {
  el.aiPreset.addEventListener('change', () => {
    const preset = aiPresets.find(p => p.id === el.aiPreset.value);
    if (preset) {
      el.aiProvider.value = preset.providerId;
      el.aiBaseurl.value = preset.baseUrl;
      el.aiModel.value = preset.defaultModel;
      el.aiKey.placeholder = preset.needsKey ? 'API key required for this provider' : '(no key needed)';
    }
    reflectSamplingSupport();
  });
}

// System-prompt library controls.
if (el.aiPromptSelect) {
  el.aiPromptSelect.addEventListener('change', () => loadPromptIntoEditor(el.aiPromptSelect.value));
}
if (el.aiPromptNew) {
  el.aiPromptNew.addEventListener('click', () => {
    aiActivePromptId = ''; // clearing the id makes the next save create a new prompt
    el.aiPromptName.value = '';
    el.aiPromptText.value = '';
    el.aiPromptName.focus();
  });
}
if (el.aiPromptDel) {
  el.aiPromptDel.addEventListener('click', async () => {
    if (!aiapi || !aiActivePromptId) return;
    aiPrompts = aiPrompts.filter(p => p.id !== aiActivePromptId);
    aiActivePromptId = '';
    await aiapi.setConfig({ systemPrompts: aiPrompts, activeSystemPromptId: '' });
    loadAiState();
  });
}

el.aiSaveConfig.addEventListener('click', async () => {
  await saveAiConfig();
  el.aiConfig.hidden = true;
  loadAiState();
});

// Prefill a sensible default folder so "Open" works with one click.
if (fsapi && typeof fsapi.suggestPath === 'function') {
  fsapi
    .suggestPath()
    .then(p => {
      if (p) {
        suggestedPath = p;
        if (!el.pathInput.value) el.pathInput.value = p;
      }
    })
    .catch(() => {});
}

window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveActive();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runActiveCart();
  }
});

if (fsapi && typeof fsapi.onChanged === 'function') fsapi.onChanged(refreshEntries);

// Select the editor implementation (Monaco, with a textarea fallback), then boot.
(async () => {
  try {
    editor = await MonacoEditorAdapter.create();
  } catch (err) {
    console.warn('Monaco unavailable, using textarea editor:', err?.message || err);
    editor = new TextareaEditorAdapter();
  }
  editor.mount(el.editorHost);
  wireEditorChange();
  // Verification hook (headless smoke): load a sample file into the editor.
  window.__novaDev = {
    editorKind: editor.constructor.name,
    openPath: p => openByPath(p),
    openFile: p => openFile(p),
    run: () => runActiveCart(),
    runConsoleText: () => (el.runConsole ? el.runConsole.textContent : ''),
    sendAi: text => {
      showAi(true);
      el.aiInput.value = text;
      return sendAiMessage();
    },
    aiMessagesText: () => (el.aiMessages ? el.aiMessages.textContent : ''),
    setSample() {
      editor.setModel(
        'sample.js',
        'function init() {\n  // Nova64 cart\n  print("hello, nova64");\n}\n\nfunction update(dt) {}\n',
        'javascript'
      );
      el.editorEmpty.style.display = 'none';
    },
  };
  if (window.novaTheme && editor.setEditorTheme) {
    try {
      const s = await window.novaTheme.get();
      editor.setEditorTheme(s.theme);
    } catch {
      /* ignore */
    }
    window.novaTheme.onChanged(s => editor.setEditorTheme && editor.setEditorTheme(s.theme));
  }
  showActive();
})();
