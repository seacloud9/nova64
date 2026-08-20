import { normalizeRelative } from './paths.js';
import { buildFileTree } from './file-tree.js';

/**
 * Host-neutral workspace model: the file tree plus an ordered set of open editor
 * tabs with per-tab dirty tracking. It holds NO filesystem handles and does no
 * I/O — a host adapter reads/writes disk and feeds content in. This makes the
 * model identical across Electron and VS Code and trivially unit-testable.
 */
export class Workspace {
  constructor({ root = '', name = '' } = {}) {
    this.root = root;
    this.name = name || (root ? root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() : '');
    /** @type {{path:string, type:'file'|'dir'}[]} */
    this.entries = [];
    this.tree = buildFileTree([]);
    /** @type {Map<string, {path:string, content:string, savedContent:string}>} */
    this.tabs = new Map();
    /** @type {string[]} insertion-ordered open tab paths */
    this.order = [];
    this.activePath = null;
  }

  setEntries(entries) {
    this.entries = (entries || []).map(e => ({
      path: normalizeRelative(e.path),
      type: e.type === 'dir' ? 'dir' : 'file',
    }));
    this.tree = buildFileTree(this.entries);
    return this.tree;
  }

  /** Open (or focus) a tab and set both its saved + working content. */
  openTab(path, content = '') {
    const rel = normalizeRelative(path);
    if (!this.tabs.has(rel)) {
      this.tabs.set(rel, { path: rel, content, savedContent: content });
      this.order.push(rel);
    } else {
      const tab = this.tabs.get(rel);
      tab.content = content;
      tab.savedContent = content;
    }
    this.activePath = rel;
    return this.tabs.get(rel);
  }

  closeTab(path, { force = false } = {}) {
    const rel = normalizeRelative(path);
    const tab = this.tabs.get(rel);
    if (!tab) return true;
    if (!force && this.isDirty(rel)) return false; // caller must confirm discard
    this.tabs.delete(rel);
    this.order = this.order.filter(p => p !== rel);
    if (this.activePath === rel) {
      this.activePath = this.order.length ? this.order[this.order.length - 1] : null;
    }
    return true;
  }

  setContent(path, content) {
    const rel = normalizeRelative(path);
    const tab = this.tabs.get(rel);
    if (!tab) return;
    tab.content = content;
  }

  /** Mark a tab saved: its current (or supplied) content becomes the baseline. */
  markSaved(path, content) {
    const rel = normalizeRelative(path);
    const tab = this.tabs.get(rel);
    if (!tab) return;
    if (content !== undefined) tab.content = content;
    tab.savedContent = tab.content;
  }

  setActive(path) {
    const rel = normalizeRelative(path);
    if (this.tabs.has(rel)) this.activePath = rel;
  }

  isDirty(path) {
    const tab = this.tabs.get(normalizeRelative(path));
    return tab ? tab.content !== tab.savedContent : false;
  }

  anyDirty() {
    for (const tab of this.tabs.values()) {
      if (tab.content !== tab.savedContent) return true;
    }
    return false;
  }

  listTabs() {
    return this.order.map(p => {
      const tab = this.tabs.get(p);
      return { path: tab.path, dirty: tab.content !== tab.savedContent, active: p === this.activePath };
    });
  }

  /** Serialize just enough to restore the session (open files + active). */
  serialize() {
    return { root: this.root, open: [...this.order], active: this.activePath };
  }
}
