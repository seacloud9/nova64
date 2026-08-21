'use strict';

const path = require('node:path');
const { BrowserWindow, WebContentsView, ipcMain } = require('electron');
const { APP_PROTOCOL, VIEW, DEV_SERVER_URL } = require('./constants');
const { layout } = require('./view-layout');
const { secureWebPreferences, hardenWebContents, applyContentSecurityPolicy } = require('./security');
const { WorkspaceService } = require('./workspace-service');
const { SettingsService } = require('./settings-service');
const { SecretService } = require('./secret-service');
const { AiService } = require('./ai-service');

const CHROME_PRELOAD = path.join(__dirname, '..', 'preload', 'chrome-preload.js');
const DEV_PRELOAD = path.join(__dirname, '..', 'preload', 'dev-preload.js');
const SETTINGS_PRELOAD = path.join(__dirname, '..', 'preload', 'settings-preload.js');

const CONTENT_SURFACES = [VIEW.OS, VIEW.DEV, VIEW.SETTINGS];

function urlFor(surface) {
  if (surface === VIEW.OS) {
    return DEV_SERVER_URL
      ? `${DEV_SERVER_URL.replace(/\/$/, '')}/os9-shell/index.html`
      : `${APP_PROTOCOL}://os/os9-shell/index.html`;
  }
  if (surface === VIEW.DEV) return `${APP_PROTOCOL}://dev/index.html`;
  if (surface === VIEW.SETTINGS) return `${APP_PROTOCOL}://settings/index.html`;
  throw new Error(`unknown surface: ${surface}`);
}

function preloadFor(surface) {
  if (surface === VIEW.DEV) return DEV_PRELOAD;
  if (surface === VIEW.SETTINGS) return SETTINGS_PRELOAD;
  return undefined; // OS (os9-shell) gets no privileged preload
}

class WindowController {
  constructor() {
    this.win = null;
    this.chrome = null;
    /** @type {Record<string, import('electron').WebContentsView>} */
    this.content = {};
    this.active = VIEW.OS;
    this.settings = null;
    this.workspace = null;
  }

  create() {
    this.win = new BrowserWindow({
      width: 1360,
      height: 860,
      minWidth: 920,
      minHeight: 600,
      frame: false, // edge-to-edge; we render a custom titlebar + controls
      backgroundColor: '#0b0b12',
      title: 'Nova64',
      show: false,
      webPreferences: secureWebPreferences(),
    });

    applyContentSecurityPolicy(this.win.webContents.session);

    this.settings = new SettingsService();
    this.settings.registerIpc();

    // Chrome frame: custom titlebar + activity rail. The only view with the
    // window-control + navigation bridge.
    this.chrome = new WebContentsView({
      webPreferences: secureWebPreferences({ preload: CHROME_PRELOAD }),
    });
    // Transparent so that when we raise the chrome frame above the content views
    // to show a dropdown menu, the content still shows through the empty areas.
    this.chrome.setBackgroundColor('#00000000');
    hardenWebContents(this.chrome.webContents);
    this.chrome.webContents.loadURL(`${APP_PROTOCOL}://nav/index.html`);

    // Isolated content surfaces.
    for (const surface of CONTENT_SURFACES) {
      const preload = preloadFor(surface);
      const view = new WebContentsView({
        webPreferences: preload ? secureWebPreferences({ preload }) : secureWebPreferences(),
      });
      hardenWebContents(view.webContents);
      view.webContents.loadURL(urlFor(surface));
      this.content[surface] = view;
    }

    // z-order: chrome frame at the bottom, content surfaces above it.
    this.win.contentView.addChildView(this.chrome);
    for (const surface of CONTENT_SURFACES) this.win.contentView.addChildView(this.content[surface]);

    this.railVisible = true;
    this.relayout = layout({
      win: this.win,
      chrome: this.chrome,
      contentViews: CONTENT_SURFACES.map(s => this.content[s]),
      isRailVisible: () => this.railVisible,
    });

    // Command/Ctrl+B toggles the icon rail, caught from any surface.
    const onKey = (event, input) => {
      if (
        input.type === 'keyDown' &&
        (input.meta || input.control) &&
        !input.alt &&
        input.key.toLowerCase() === 'b'
      ) {
        event.preventDefault();
        this.toggleRail();
      }
    };
    this.chrome.webContents.on('before-input-event', onKey);
    for (const s of CONTENT_SURFACES) this.content[s].webContents.on('before-input-event', onKey);

    // Disk-backed workspace for the Dev surface — only trusts the Dev view.
    const trustsDev = wc => wc === this.content[VIEW.DEV].webContents;
    this.workspace = new WorkspaceService(trustsDev);
    this.workspace.registerIpc(() => this.content[VIEW.DEV].webContents);

    // AI runs entirely in the host; only the Dev view may drive it.
    this.secrets = new SecretService();
    this.ai = new AiService({ secrets: this.secrets, isTrustedSender: trustsDev });
    this.ai.registerIpc();

    // Live theming: chrome + our content surfaces receive settings updates.
    this.settings.subscribe(this.chrome.webContents);
    this.settings.subscribe(this.content[VIEW.DEV].webContents);
    this.settings.subscribe(this.content[VIEW.SETTINGS].webContents);

    this.setActive(VIEW.OS);
    this.registerIpc();

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
      if (this.ai) this.ai.dispose();
      this.win = null;
    });
    return this.win;
  }

  setActive(surface) {
    if (!CONTENT_SURFACES.includes(surface)) return;
    this.active = surface;
    for (const key of CONTENT_SURFACES) this.content[key].setVisible(key === surface);
    // Raise the active surface above its siblings. The chrome frame stays at the
    // bottom — it is full-window but only visible in the titlebar/rail gutters the
    // inset content doesn't cover, so it must never be raised over the content.
    this.win.contentView.addChildView(this.content[surface]);
    this.broadcastActive();
  }

  broadcastActive() {
    if (this.chrome && !this.chrome.webContents.isDestroyed()) {
      this.chrome.webContents.send('nav:active-view-changed', this.active);
    }
  }

  /**
   * Raise/lower the chrome frame relative to the content surfaces. Dropdown menus
   * are painted by the chrome view, but it normally sits *below* the content
   * views — so an open menu would be hidden behind the active surface. While a
   * menu is open we raise chrome to the top (it's transparent, so content still
   * shows through); when it closes we drop the active content back on top.
   */
  setChromeOverlay(on) {
    if (!this.win) return;
    if (on) this.win.contentView.addChildView(this.chrome);
    else this.win.contentView.addChildView(this.content[this.active]);
  }

  toggleRail() {
    this.railVisible = !this.railVisible;
    if (this.relayout) this.relayout();
    if (this.chrome && !this.chrome.webContents.isDestroyed()) {
      this.chrome.webContents.send('nav:rail-visible', this.railVisible);
    }
  }

  registerIpc() {
    const fromChrome = event => this.chrome && event.sender === this.chrome.webContents;

    ipcMain.removeHandler('nav:switch-view');
    ipcMain.removeHandler('nav:get-active-view');
    ipcMain.handle('nav:switch-view', (event, target) => {
      if (!fromChrome(event) || !CONTENT_SURFACES.includes(target)) return this.active;
      this.setActive(target);
      return this.active;
    });
    ipcMain.handle('nav:get-active-view', event => (fromChrome(event) ? this.active : null));

    // Raise/lower the chrome frame so open dropdown menus aren't hidden behind
    // the content surfaces.
    ipcMain.removeHandler('nav:overlay');
    ipcMain.handle('nav:overlay', (event, on) => {
      if (!fromChrome(event)) return false;
      this.setChromeOverlay(Boolean(on));
      return true;
    });

    // Menu-bar commands (File / Window dropdowns in the chrome frame).
    ipcMain.removeHandler('menu:command');
    ipcMain.handle('menu:command', (event, cmd) => {
      if (!fromChrome(event)) return false;
      if (cmd === 'toggle-rail') {
        this.toggleRail();
        return true;
      }
      // File → Open / Run / Save: focus the Dev surface, then hand the action to it.
      if (cmd === 'dev:open' || cmd === 'dev:run' || cmd === 'dev:save') {
        this.setActive(VIEW.DEV);
        const dev = this.content[VIEW.DEV] && this.content[VIEW.DEV].webContents;
        if (dev && !dev.isDestroyed()) dev.send('dev:command', cmd.slice(4)); // open|run|save
        return true;
      }
      return false;
    });

    // Window controls for the frameless window.
    ipcMain.removeHandler('window:action');
    ipcMain.handle('window:action', (event, action) => {
      if (!fromChrome(event) || !this.win) return null;
      if (action === 'minimize') this.win.minimize();
      else if (action === 'toggle-maximize')
        this.win.isMaximized() ? this.win.unmaximize() : this.win.maximize();
      else if (action === 'close') this.win.close();
      return this.win ? this.win.isMaximized() : false;
    });
  }
}

module.exports = { WindowController };
