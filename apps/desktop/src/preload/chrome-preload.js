'use strict';

// Sandboxed preload for the chrome frame (custom titlebar + activity rail).
// Exposes navigation, frameless window controls, and the theme bridge.
const { contextBridge, ipcRenderer } = require('electron');

const SURFACES = new Set(['os', 'dev', 'settings']);
const ACTIONS = new Set(['minimize', 'toggle-maximize', 'close']);

contextBridge.exposeInMainWorld('novaShell', {
  switchView(target) {
    if (!SURFACES.has(target)) return Promise.resolve(null);
    return ipcRenderer.invoke('nav:switch-view', target);
  },
  getActiveView() {
    return ipcRenderer.invoke('nav:get-active-view');
  },
  onActiveViewChanged(callback) {
    const listener = (_e, view) => callback(view);
    ipcRenderer.on('nav:active-view-changed', listener);
    return () => ipcRenderer.removeListener('nav:active-view-changed', listener);
  },
  onRailVisibleChanged(callback) {
    const listener = (_e, visible) => callback(visible);
    ipcRenderer.on('nav:rail-visible', listener);
    return () => ipcRenderer.removeListener('nav:rail-visible', listener);
  },
  windowAction(action) {
    if (!ACTIONS.has(action)) return Promise.resolve(null);
    return ipcRenderer.invoke('window:action', action);
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
