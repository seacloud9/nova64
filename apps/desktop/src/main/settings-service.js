'use strict';

const { app, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/** Built-in theme ids (must match shared/theme.css `[data-theme]` blocks). */
const THEMES = ['dark', 'midnight', 'light', 'high-contrast'];
const DEFAULTS = { theme: 'dark' };

/**
 * App-wide settings, persisted to userData/settings.json. Owns the theme and
 * broadcasts changes to every surface so the whole app restyles live. This is
 * the backing store for the Settings "control center".
 */
class SettingsService {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.values = { ...DEFAULTS, ...this.#read() };
    if (!THEMES.includes(this.values.theme)) this.values.theme = DEFAULTS.theme;
    /** @type {Set<Electron.WebContents>} */
    this.subscribers = new Set();
  }

  #read() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return {};
    }
  }

  #write() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.values, null, 2), 'utf8');
    } catch {
      /* best-effort persistence */
    }
  }

  get() {
    return { ...this.values, themes: THEMES };
  }

  setTheme(theme) {
    if (!THEMES.includes(theme) || theme === this.values.theme) return this.values.theme;
    this.values.theme = theme;
    this.#write();
    this.#broadcast();
    return theme;
  }

  /** Register a webContents to receive theme/settings updates. */
  subscribe(webContents) {
    this.subscribers.add(webContents);
    webContents.once('destroyed', () => this.subscribers.delete(webContents));
  }

  #broadcast() {
    for (const wc of this.subscribers) {
      if (!wc.isDestroyed()) wc.send('settings:changed', this.get());
    }
    if (this.onChange) this.onChange(this.get());
  }

  registerIpc() {
    ipcMain.removeHandler('settings:get');
    ipcMain.removeHandler('settings:set-theme');
    ipcMain.handle('settings:get', () => this.get());
    ipcMain.handle('settings:set-theme', (_event, theme) => this.setTheme(theme));
  }
}

module.exports = { SettingsService, THEMES };
