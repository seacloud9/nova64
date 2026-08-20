'use strict';

const path = require('node:path');
const { BrowserWindow, WebContentsView, ipcMain } = require('electron');
const { APP_PROTOCOL, VIEW, DEV_SERVER_URL } = require('./constants');
const { layout } = require('./view-layout');
const { secureWebPreferences, hardenWebContents, applyContentSecurityPolicy } = require('./security');
const { WorkspaceService } = require('./workspace-service');

const NAV_PRELOAD = path.join(__dirname, '..', 'preload', 'nav-preload.js');
const DEV_PRELOAD = path.join(__dirname, '..', 'preload', 'dev-preload.js');

/** Resolve the URL for a surface, dev-server-aware. */
function urlFor(surface) {
  if (surface === VIEW.OS) {
    return DEV_SERVER_URL
      ? `${DEV_SERVER_URL.replace(/\/$/, '')}/os9-shell/index.html`
      : `${APP_PROTOCOL}://os/os9-shell/index.html`;
  }
  if (surface === VIEW.DEV) return `${APP_PROTOCOL}://dev/index.html`;
  throw new Error(`unknown surface: ${surface}`);
}

class WindowController {
  constructor() {
    this.win = null;
    this.rail = null;
    /** @type {Record<string, import('electron').WebContentsView>} */
    this.content = {};
    this.active = VIEW.OS;
  }

  create() {
    this.win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      backgroundColor: '#0b0b12',
      title: 'Nova64',
      show: false,
      webPreferences: secureWebPreferences(),
    });

    applyContentSecurityPolicy(this.win.webContents.session);

    // Activity rail (app chrome) — the only view with a preload/IPC bridge.
    this.rail = new WebContentsView({
      webPreferences: secureWebPreferences({ preload: NAV_PRELOAD }),
    });
    hardenWebContents(this.rail.webContents);
    this.rail.webContents.loadURL(`${APP_PROTOCOL}://nav/index.html`);

    // Isolated content surfaces. OS has no privileged preload; Dev gets the
    // narrow workspace bridge. Both sandboxed.
    for (const surface of [VIEW.OS, VIEW.DEV]) {
      const prefs =
        surface === VIEW.DEV ? secureWebPreferences({ preload: DEV_PRELOAD }) : secureWebPreferences();
      const view = new WebContentsView({ webPreferences: prefs });
      hardenWebContents(view.webContents);
      view.webContents.loadURL(urlFor(surface));
      this.content[surface] = view;
    }

    // Disk-backed workspace for the Dev surface — only trusts the Dev view.
    this.workspace = new WorkspaceService(wc => wc === this.content[VIEW.DEV].webContents);
    this.workspace.registerIpc(() => this.content[VIEW.DEV].webContents);

    this.win.contentView.addChildView(this.rail);
    this.win.contentView.addChildView(this.content[VIEW.DEV]);
    this.win.contentView.addChildView(this.content[VIEW.OS]);

    layout({
      win: this.win,
      rail: this.rail,
      contentViews: [this.content[VIEW.OS], this.content[VIEW.DEV]],
    });

    this.setActive(VIEW.OS);
    this.registerIpc();

    // The window itself hosts no web document (only child views), so its
    // 'ready-to-show' never fires. Reveal it once the OS surface paints, with a
    // fallback so a slow/failed load can't leave the window hidden forever.
    let shown = false;
    const reveal = () => {
      if (shown || !this.win) return;
      shown = true;
      this.win.show();
    };
    this.content[VIEW.OS].webContents.once('did-finish-load', reveal);
    setTimeout(reveal, 4000);

    this.win.on('closed', () => {
      if (this.workspace) this.workspace.dispose();
      this.win = null;
    });
    return this.win;
  }

  /** Show one content surface, hide the other. Neither reloads. */
  setActive(surface) {
    if (surface !== VIEW.OS && surface !== VIEW.DEV) return;
    this.active = surface;
    for (const key of [VIEW.OS, VIEW.DEV]) {
      this.content[key].setVisible(key === surface);
    }
    // Raise the active surface above its sibling.
    this.win.contentView.addChildView(this.content[surface]);
    if (this.rail) this.win.contentView.addChildView(this.rail);
    this.broadcastActive();
  }

  broadcastActive() {
    if (this.rail && !this.rail.webContents.isDestroyed()) {
      this.rail.webContents.send('nav:active-view-changed', this.active);
    }
  }

  registerIpc() {
    ipcMain.removeHandler('nav:switch-view');
    ipcMain.removeHandler('nav:get-active-view');
    ipcMain.handle('nav:switch-view', (event, target) => {
      // Only accept from our own rail webContents.
      if (!this.rail || event.sender !== this.rail.webContents) return this.active;
      if (target !== VIEW.OS && target !== VIEW.DEV) return this.active;
      this.setActive(target);
      return this.active;
    });
    ipcMain.handle('nav:get-active-view', event => {
      if (!this.rail || event.sender !== this.rail.webContents) return null;
      return this.active;
    });
  }
}

module.exports = { WindowController };
