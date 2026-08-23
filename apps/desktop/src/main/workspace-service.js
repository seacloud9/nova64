'use strict';

const { ipcMain, dialog } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fsp = require('node:fs/promises');
const fs = require('node:fs');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.worktrees',
  'coverage',
  '.godot', // Godot import cache — regenerated, huge, never edited
  '.cache',
]);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // refuse to open huge/binary blobs as text

/**
 * Owns the opened workspace folder and performs all disk I/O for the Dev
 * surface. Every path is validated to stay inside the opened root — the
 * authoritative containment guard (the renderer model has its own first-line
 * guard). IPC is only honoured from the trusted Dev webContents.
 */
class WorkspaceService {
  /** @param {(wc: Electron.WebContents) => boolean} isTrustedSender */
  constructor(isTrustedSender) {
    this.isTrusted = isTrustedSender || (() => true);
    this.root = null;
    this.watcher = null;
    /** @type {Electron.WebContents|null} */
    this.notify = null;
  }

  /** Resolve a workspace-relative path to an absolute path inside the root. */
  #resolveInside(rel) {
    if (!this.root) throw new Error('no workspace open');
    const clean = String(rel == null ? '' : rel).replace(/\\/g, '/');
    if (/^([a-zA-Z]:|\/|\\)/.test(clean) || clean.split('/').includes('..')) {
      throw new Error(`unsafe path: ${rel}`);
    }
    const abs = path.resolve(this.root, clean);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (abs !== this.root && !abs.startsWith(rootWithSep)) {
      throw new Error(`path escapes workspace: ${rel}`);
    }
    return abs;
  }

  /**
   * List the immediate children of one directory (dirs first, then files, both
   * alphabetical). This is the lazy building block for the Dev explorer: opening
   * a folder and expanding a node each cost a single readdir, so browsing a huge
   * tree (e.g. the whole repo, ~10k files over WSL's slow 9p mount) stays instant
   * instead of blocking on a full recursive walk.
   */
  async listChildren(rel) {
    const absDir = rel ? this.#resolveInside(rel) : this.root;
    let dirents;
    try {
      dirents = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return []; // unreadable dir (perms/races) — treat as empty
    }
    const out = [];
    for (const d of dirents) {
      const isDir = d.isDirectory();
      if (isDir && SKIP_DIRS.has(d.name)) continue;
      if (!isDir && !d.isFile()) continue; // skip sockets/fifos/symlink-to-missing
      out.push({ name: d.name, path: rel ? `${rel}/${d.name}` : d.name, type: isDir ? 'dir' : 'file' });
    }
    out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    return out;
  }

  /**
   * Recursively count files + folders under the workspace root (honouring the
   * skip-list). This IS a full walk, so callers run it in the background after a
   * folder is already open — it must never gate the initial open. Capped so a
   * pathological tree can't run unbounded.
   */
  async countTree(cap = 500000) {
    let files = 0;
    let dirs = 0;
    let truncated = false;
    const walk = async absDir => {
      if (truncated) return;
      let dirents;
      try {
        dirents = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const d of dirents) {
        if (d.isDirectory() && SKIP_DIRS.has(d.name)) continue;
        if (files + dirs >= cap) {
          truncated = true;
          return;
        }
        if (d.isDirectory()) {
          dirs++;
          await walk(path.join(absDir, d.name));
        } else if (d.isFile()) {
          files++;
        }
      }
    };
    if (this.root) await walk(this.root);
    return { files, dirs, truncated };
  }

  /** Read a workspace file as UTF-8 text (containment-guarded, size-capped). */
  async readFile(rel) {
    const abs = this.#resolveInside(rel);
    const stat = await fsp.stat(abs);
    if (stat.size > MAX_FILE_BYTES) throw new Error('file too large to open as text');
    return fsp.readFile(abs, 'utf8');
  }

  /** Write UTF-8 text to a workspace file (creates parent dirs). */
  async writeFile(rel, data) {
    const abs = this.#resolveInside(rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, String(data), 'utf8');
    return true;
  }

  /** Delete a workspace file or directory (recursive, containment-guarded). */
  async remove(rel) {
    await fsp.rm(this.#resolveInside(rel), { recursive: true, force: true });
    return true;
  }

  /**
   * Recursively search text files under the root for a literal query string.
   * Skips the same heavy dirs as the explorer, skips binary/oversized files, and
   * caps the number of matches. Returns { query, matches:[{path,line,text}], truncated }.
   */
  async searchText(query, { max = 200 } = {}) {
    const q = String(query || '');
    if (!q || !this.root) return { query: q, matches: [], truncated: false };
    const matches = [];
    let truncated = false;
    const walk = async absDir => {
      if (truncated) return;
      let dirents;
      try {
        dirents = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const d of dirents) {
        if (truncated) return;
        if (d.isDirectory() && SKIP_DIRS.has(d.name)) continue;
        const abs = path.join(absDir, d.name);
        if (d.isDirectory()) {
          await walk(abs);
          continue;
        }
        if (!d.isFile()) continue;
        let content;
        try {
          const stat = await fsp.stat(abs);
          if (stat.size > MAX_FILE_BYTES) continue;
          content = await fsp.readFile(abs, 'utf8');
        } catch {
          continue;
        }
        if (content.indexOf(String.fromCharCode(0)) !== -1) continue; // skip binary (NUL byte)
        const rel = path.relative(this.root, abs).split(path.sep).join('/');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(q)) {
            matches.push({ path: rel, line: i + 1, text: lines[i].slice(0, 240) });
            if (matches.length >= max) {
              truncated = true;
              break;
            }
          }
        }
      }
    };
    await walk(this.root);
    return { query: q, matches, truncated };
  }

  #startWatch() {
    this.#stopWatch();
    try {
      // NEVER use a recursive watch on Linux: Node 20's recursive fs.watch walks
      // the whole tree to install watches, and over WSL's 9p mount that call
      // HANGS indefinitely — which is what froze "open folder". Recursive watch
      // is only safe/fast on Windows + macOS; on Linux we watch the root
      // non-recursively (top-level events only, which is fine for the explorer).
      const recursive = process.platform !== 'linux';
      let timer = null;
      this.watcher = fs.watch(this.root, { recursive }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (this.notify && !this.notify.isDestroyed()) {
            this.notify.send('workspace:changed');
          }
        }, 150);
      });
    } catch {
      /* watching is best-effort */
    }
  }

  #stopWatch() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  async openFolder(browserWindow) {
    // The native GTK directory picker deadlocks the whole app under WSLg (nested
    // GLib loop, no desktop portal). Never invoke it on Linux — the Dev surface
    // routes Linux users to openPath() instead.
    if (process.platform === 'linux') {
      throw new Error('Native folder picker is disabled on Linux/WSLg — open by path instead.');
    }
    const result = await dialog.showOpenDialog(browserWindow, {
      title: 'Open Nova64 project folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return this.#setRoot(result.filePaths[0]);
  }

  /**
   * Normalize a user-typed path: strip quotes, expand `~`, and (when running as
   * the Linux binary, e.g. under WSLg) map Windows paths `C:\x` → `/mnt/c/x` so
   * a Windows user's natural input works.
   */
  #normalizeInputPath(input) {
    let s = String(input == null ? '' : input)
      .trim()
      .replace(/^["']+|["']+$/g, '');
    if (!s) return s;
    if (s === '~' || s.startsWith('~/') || s.startsWith('~\\')) {
      s = path.join(os.homedir(), s.slice(1));
    }
    if (process.platform !== 'win32') {
      const drive = s.match(/^([a-zA-Z]):[\\/]?(.*)$/);
      if (drive) s = `/mnt/${drive[1].toLowerCase()}/${drive[2]}`;
      s = s.replace(/\\/g, '/');
    }
    return s;
  }

  /** A sensible default folder to prefill (the repo examples, else home). */
  suggestPath() {
    const candidates = [path.resolve(__dirname, '..', '..', '..', '..', 'examples'), os.homedir()];
    for (const c of candidates) {
      try {
        if (fs.statSync(c).isDirectory()) return c;
      } catch {
        /* try next */
      }
    }
    return os.homedir();
  }

  /** Open a folder by path (no native dialog — WSLg-safe). */
  async openPath(inputPath) {
    const normalized = this.#normalizeInputPath(inputPath);
    if (!normalized) throw new Error('no path provided');
    const resolved = path.resolve(normalized);
    const stat = await fsp.stat(resolved); // throws if it doesn't exist
    if (!stat.isDirectory()) throw new Error(`not a directory: ${resolved}`);
    return this.#setRoot(resolved);
  }

  async #setRoot(absRoot) {
    this.root = absRoot;
    const children = await this.listChildren(''); // top level only — fast for any repo size
    this.#startWatch();
    return { root: this.root, name: path.basename(this.root), children };
  }

  registerIpc(getNotifyTarget) {
    const guard = event => {
      if (!this.isTrusted(event.sender)) throw new Error('untrusted sender');
    };
    this.notify = getNotifyTarget ? getNotifyTarget() : null;

    // Idempotent: clear any prior handlers so re-creating the window is safe.
    for (const ch of [
      'workspace:open',
      'workspace:open-path',
      'workspace:suggest-path',
      'workspace:list-dir',
      'workspace:count',
      'workspace:read',
      'workspace:write',
      'workspace:mkdir',
      'workspace:remove',
      'workspace:move',
      'workspace:exists',
    ]) {
      ipcMain.removeHandler(ch);
    }

    ipcMain.handle('workspace:open', event => {
      guard(event);
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
      return this.openFolder(win);
    });
    ipcMain.handle('workspace:open-path', (event, inputPath) => {
      guard(event);
      return this.openPath(inputPath);
    });
    ipcMain.handle('workspace:suggest-path', event => {
      guard(event);
      return this.suggestPath();
    });
    ipcMain.handle('workspace:list-dir', (event, rel) => {
      guard(event);
      return this.root ? this.listChildren(rel || '') : [];
    });
    ipcMain.handle('workspace:count', event => {
      guard(event);
      return this.root ? this.countTree() : { files: 0, dirs: 0, truncated: false };
    });
    ipcMain.handle('workspace:read', (event, rel) => {
      guard(event);
      return this.readFile(rel);
    });
    ipcMain.handle('workspace:write', (event, rel, data) => {
      guard(event);
      return this.writeFile(rel, data);
    });
    ipcMain.handle('workspace:mkdir', async (event, rel) => {
      guard(event);
      await fsp.mkdir(this.#resolveInside(rel), { recursive: true });
      return true;
    });
    ipcMain.handle('workspace:remove', (event, rel) => {
      guard(event);
      return this.remove(rel);
    });
    ipcMain.handle('workspace:move', async (event, from, to) => {
      guard(event);
      const absFrom = this.#resolveInside(from);
      const absTo = this.#resolveInside(to);
      await fsp.mkdir(path.dirname(absTo), { recursive: true });
      await fsp.rename(absFrom, absTo);
      return true;
    });
    ipcMain.handle('workspace:exists', async (event, rel) => {
      guard(event);
      try {
        await fsp.access(this.#resolveInside(rel));
        return true;
      } catch {
        return false;
      }
    });
  }

  dispose() {
    this.#stopWatch();
  }
}

module.exports = { WorkspaceService };
