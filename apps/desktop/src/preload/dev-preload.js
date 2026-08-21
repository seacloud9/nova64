'use strict';

// Sandboxed preload for the Dev surface. Exposes a narrow workspace API backed
// by the main-process WorkspaceService. No raw ipcRenderer / Node / fs handles.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novaWorkspace', {
  /** Host platform (used to route around the WSLg-unsafe native dialog). */
  platform: (typeof process !== 'undefined' && process.platform) || 'unknown',
  /** Prompt to open a project folder (native dialog). Resolves summary | null. */
  open: () => ipcRenderer.invoke('workspace:open'),
  /** Open a project folder by absolute path (no dialog). Resolves summary. */
  openPath: p => ipcRenderer.invoke('workspace:open-path', p),
  /** A sensible default folder path to prefill the input. */
  suggestPath: () => ipcRenderer.invoke('workspace:suggest-path'),
  /** Re-list the current workspace entries. */
  list: () => ipcRenderer.invoke('workspace:list'),
  read: relPath => ipcRenderer.invoke('workspace:read', relPath),
  write: (relPath, data) => ipcRenderer.invoke('workspace:write', relPath, data),
  mkdir: relPath => ipcRenderer.invoke('workspace:mkdir', relPath),
  remove: relPath => ipcRenderer.invoke('workspace:remove', relPath),
  move: (from, to) => ipcRenderer.invoke('workspace:move', from, to),
  exists: relPath => ipcRenderer.invoke('workspace:exists', relPath),
  /** Subscribe to on-disk change notifications. Returns an unsubscribe fn. */
  onChanged: callback => {
    const listener = () => callback();
    ipcRenderer.on('workspace:changed', listener);
    return () => ipcRenderer.removeListener('workspace:changed', listener);
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
