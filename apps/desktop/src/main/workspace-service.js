'use strict';

const { ipcMain, dialog } = require('electron');
const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.worktrees', 'coverage']);
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

  async #listRecursive() {
    const entries = [];
    const walk = async absDir => {
      const dirents = await fsp.readdir(absDir, { withFileTypes: true });
      for (const d of dirents) {
        if (d.isDirectory() && SKIP_DIRS.has(d.name)) continue;
        const abs = path.join(absDir, d.name);
        const rel = path.relative(this.root, abs).split(path.sep).join('/');
        if (d.isDirectory()) {
          entries.push({ path: rel, type: 'dir' });
          await walk(abs);
        } else if (d.isFile()) {
          entries.push({ path: rel, type: 'file' });
        }
      }
    };
    await walk(this.root);
    return entries;
  }

  #startWatch() {
    this.#stopWatch();
    try {
      // recursive watch is supported on Windows + macOS; on Linux we still get
      // top-level events, which is acceptable for the Dev surface.
      let timer = null;
      this.watcher = fs.watch(this.root, { recursive: true }, () => {
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
    const result = await dialog.showOpenDialog(browserWindow, {
      title: 'Open Nova64 project folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return this.#setRoot(result.filePaths[0]);
  }

  /** Open a folder by absolute path (no native dialog — WSLg-safe). */
  async openPath(inputPath) {
    const resolved = path.resolve(String(inputPath || '').trim());
    const stat = await fsp.stat(resolved); // throws if it doesn't exist
    if (!stat.isDirectory()) throw new Error(`not a directory: ${resolved}`);
    return this.#setRoot(resolved);
  }

  async #setRoot(absRoot) {
    this.root = absRoot;
    const entries = await this.#listRecursive();
    this.#startWatch();
    return { root: this.root, name: path.basename(this.root), entries };
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
      'workspace:list',
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
    ipcMain.handle('workspace:list', event => {
      guard(event);
      return this.root ? this.#listRecursive() : [];
    });
    ipcMain.handle('workspace:read', async (event, rel) => {
      guard(event);
      const abs = this.#resolveInside(rel);
      const stat = await fsp.stat(abs);
      if (stat.size > MAX_FILE_BYTES) throw new Error('file too large to open as text');
      return fsp.readFile(abs, 'utf8');
    });
    ipcMain.handle('workspace:write', async (event, rel, data) => {
      guard(event);
      const abs = this.#resolveInside(rel);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, String(data), 'utf8');
      return true;
    });
    ipcMain.handle('workspace:mkdir', async (event, rel) => {
      guard(event);
      await fsp.mkdir(this.#resolveInside(rel), { recursive: true });
      return true;
    });
    ipcMain.handle('workspace:remove', async (event, rel) => {
      guard(event);
      await fsp.rm(this.#resolveInside(rel), { recursive: true, force: true });
      return true;
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
