'use strict';

// Sandboxed preload (CommonJS). Exposes a deliberately tiny surface to the
// navigation rail — just enough to switch surfaces and observe the active one.
// Raw ipcRenderer, Node, and filesystem access are never exposed.
const { contextBridge, ipcRenderer } = require('electron');

const VALID = new Set(['os', 'dev']);

contextBridge.exposeInMainWorld('novaDesktop', {
  /** Switch the visible surface. Returns the resulting active surface. */
  switchView(target) {
    if (!VALID.has(target)) return Promise.resolve(null);
    return ipcRenderer.invoke('nav:switch-view', target);
  },
  /** Get the currently active surface. */
  getActiveView() {
    return ipcRenderer.invoke('nav:get-active-view');
  },
  /** Subscribe to active-surface changes. Returns an unsubscribe function. */
  onActiveViewChanged(callback) {
    const listener = (_event, view) => callback(view);
    ipcRenderer.on('nav:active-view-changed', listener);
    return () => ipcRenderer.removeListener('nav:active-view-changed', listener);
  },
});
