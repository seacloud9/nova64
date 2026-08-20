'use strict';

// Sandboxed preload for the Settings surface (the app control center).
const { contextBridge, ipcRenderer } = require('electron');

const versions = (typeof process !== 'undefined' && process.versions) || {};
contextBridge.exposeInMainWorld('novaSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  setTheme: theme => ipcRenderer.invoke('settings:set-theme', theme),
  info: {
    electron: versions.electron || 'unknown',
    chrome: versions.chrome || 'unknown',
    node: versions.node || 'unknown',
    platform: (typeof process !== 'undefined' && process.platform) || 'unknown',
  },
});

// Theme bridge (shared shape across every surface).
contextBridge.exposeInMainWorld('novaTheme', {
  get: () => ipcRenderer.invoke('settings:get'),
  onChanged(callback) {
    const listener = (_e, settings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
});
