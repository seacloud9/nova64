// Absolute custom-scheme specifier avoids needing an inline import map (which
// the strict CSP would block). The `lib` host maps to packages/workspace-core.
import { Workspace } from 'nova64-app://lib/index.js';
import { TextareaEditorAdapter, languageForPath } from './editor-adapter.js';

const ws = new Workspace();
const editor = new TextareaEditorAdapter();
const fsapi = window.novaWorkspace || null;

const el = {
  project: document.getElementById('project'),
  openBtn: document.getElementById('open-btn'),
  saveBtn: document.getElementById('save-btn'),
  tree: document.getElementById('tree'),
  explorerEmpty: document.getElementById('explorer-empty'),
  tabs: document.getElementById('tabs'),
  editorHost: document.getElementById('editor-host'),
  editorEmpty: document.getElementById('editor-empty'),
  statusPath: document.getElementById('status-path'),
  statusDirty: document.getElementById('status-dirty'),
};

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
}

function showActive() {
  const p = ws.activePath;
  const hasActive = Boolean(p);
  el.editorEmpty.style.display = hasActive ? 'none' : '';
  el.editorHost.style.display = hasActive ? '' : 'none';
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
editor.mount(el.editorHost);
editor.onChange(value => {
  const p = ws.activePath;
  if (!p) return;
  ws.setContent(p, value);
  renderTabs();
  updateStatus();
});

el.openBtn.addEventListener('click', async () => {
  if (!fsapi) {
    el.project.textContent = 'Workspace bridge unavailable (run in the desktop app)';
    return;
  }
  const info = await fsapi.open();
  if (info) await loadWorkspace(info);
});
el.saveBtn.addEventListener('click', saveActive);

window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveActive();
  }
});

if (fsapi && typeof fsapi.onChanged === 'function') fsapi.onChanged(refreshEntries);

showActive();
