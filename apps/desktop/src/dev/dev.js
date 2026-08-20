// Absolute custom-scheme specifier avoids needing an inline import map (which
// the strict CSP would block). The `lib` host maps to packages/workspace-core.
import { Workspace } from 'nova64-app://lib/index.js';
import { TextareaEditorAdapter, languageForPath } from './editor-adapter.js';
import { MonacoEditorAdapter } from './monaco-adapter.js';
import { RuntimePreview } from './preview.js';

const ws = new Workspace();
let editor = new TextareaEditorAdapter();
const fsapi = window.novaWorkspace || null;

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
  aiProvider: document.getElementById('ai-provider'),
  aiSettings: document.getElementById('ai-settings'),
  aiClose: document.getElementById('ai-close'),
  aiConfig: document.getElementById('ai-config'),
  aiBaseurl: document.getElementById('ai-baseurl'),
  aiModel: document.getElementById('ai-model'),
  aiKey: document.getElementById('ai-key'),
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

function showAi(show) {
  el.aiPane.hidden = !show;
  el.workbench.classList.toggle('with-ai', show);
  if (show) {
    loadAiState();
    el.aiInput.focus();
  }
}

async function loadAiState() {
  if (!aiapi) return;
  const st = await aiapi.state();
  el.aiProvider.innerHTML = '';
  for (const p of st.providers) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.displayName;
    if (p.id === st.config.providerId) opt.selected = true;
    el.aiProvider.appendChild(opt);
  }
  el.aiBaseurl.value = st.config.baseUrl || '';
  el.aiModel.value = st.config.model || '';
  el.aiKey.placeholder = st.hasKey ? '•••• saved' : '(optional for local)';
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
  addAiMessage('user', text);
  el.aiInput.value = '';
  aiAssistantEl = addAiMessage('assistant', '');
  aiStreaming = true;
  el.aiSend.textContent = 'Stop';
  await aiapi.chat(aiHistory.slice(0, -1)); // history without the empty assistant
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
    }
  });
}

let preview = null;
function ensurePreview() {
  if (!preview) preview = new RuntimePreview({ host: el.previewHost, consoleEl: el.runConsole });
  return preview;
}
function showPreview(show) {
  el.previewPane.hidden = !show;
  el.workbench.classList.toggle('with-preview', show);
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

// ── rendering ───────────────────────────────────────────────────────────────
function renderTree() {
  el.tree.textContent = '';
  const hasFiles = ws.tree.children && ws.tree.children.length > 0;
  el.explorerEmpty.style.display = hasFiles ? 'none' : '';
  if (!hasFiles) return;

  const build = (node, depth) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = `tree-row ${node.type}`;
    row.style.paddingLeft = `${8 + depth * 12}px`;
    row.textContent = `${node.type === 'dir' ? '📁' : '📄'} ${node.name}`;
    if (node.type === 'file') {
      row.tabIndex = 0;
      row.dataset.path = node.path;
      if (node.path === ws.activePath) row.classList.add('is-active');
      row.addEventListener('click', () => openFile(node.path));
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFile(node.path);
        }
      });
    }
    li.appendChild(row);
    if (node.children && node.children.length) {
      const ul = document.createElement('ul');
      ul.className = 'tree';
      for (const child of node.children) ul.appendChild(build(child, depth + 1));
      li.appendChild(ul);
    }
    return li;
  };
  for (const child of ws.tree.children) el.tree.appendChild(build(child, 0));
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
  const { root, name, entries } = info;
  ws.root = root;
  ws.name = name;
  ws.setEntries(entries);
  el.project.textContent = name || root;

  // Restore previously-open tabs for this folder (best-effort).
  const session = readSession(root);
  if (session && Array.isArray(session.open)) {
    for (const relPath of session.open) {
      try {
        const content = await fsapi.read(relPath);
        ws.openTab(relPath, content);
      } catch {
        /* file gone — skip */
      }
    }
    if (session.active && ws.tabs.has(session.active)) ws.setActive(session.active);
  }
  showActive();
}

async function refreshEntries() {
  if (!fsapi || !ws.root) return;
  try {
    ws.setEntries(await fsapi.list());
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

async function openByPath(rawPath) {
  const target = (rawPath && rawPath.trim()) || suggestedPath;
  if (!fsapi || !target) {
    el.pathInput.focus();
    el.statusPath.textContent = 'Enter a folder path to open.';
    return;
  }
  el.statusPath.textContent = `Opening ${target}…`;
  try {
    const info = await fsapi.openPath(target);
    if (info) {
      el.pathInput.value = info.root;
      await loadWorkspace(info);
      el.statusPath.textContent = `Opened ${info.root} (${info.entries.length} entries)`;
    }
  } catch (err) {
    const msg = `Could not open "${target}": ${err.message || err}`;
    el.statusPath.textContent = msg;
    el.project.textContent = 'Open failed — see status bar';
  }
}
el.openPathBtn.addEventListener('click', () => openByPath(el.pathInput.value));
el.pathInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') openByPath(el.pathInput.value);
});

el.openBtn.addEventListener('click', async () => {
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
});
el.saveBtn.addEventListener('click', saveActive);
el.runBtn.addEventListener('click', runActiveCart);
el.previewReload.addEventListener('click', () => preview && preview.reload());
el.previewClose.addEventListener('click', () => showPreview(false));

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
el.aiSaveConfig.addEventListener('click', async () => {
  if (!aiapi) return;
  await aiapi.setConfig({
    providerId: el.aiProvider.value,
    baseUrl: el.aiBaseurl.value.trim(),
    model: el.aiModel.value.trim(),
  });
  if (el.aiKey.value) {
    await aiapi.setKey(el.aiKey.value);
    el.aiKey.value = '';
  }
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
