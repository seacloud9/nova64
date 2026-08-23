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
  /** List one directory level (immediate children). '' or omitted = workspace root. */
  listDir: rel => ipcRenderer.invoke('workspace:list-dir', rel || ''),
  /** Recursively count files + folders under the root. Resolves { files, dirs, truncated }. */
  count: () => ipcRenderer.invoke('workspace:count'),
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

// Agent tools bridge — run one agent-core tool against the workspace (Phase 5).
// req: { tool, args, mode, approved? } → ToolRunResult (may be 'needs-approval').
contextBridge.exposeInMainWorld('novaAgent', {
  runTool: req => ipcRenderer.invoke('agent:run-tool', req),
});

// Menu bridge — File-menu commands (open/run/save) dispatched from the chrome frame.
contextBridge.exposeInMainWorld('novaDev', {
  onCommand: callback => {
    const listener = (_e, cmd) => callback(cmd);
    ipcRenderer.on('dev:command', listener);
    return () => ipcRenderer.removeListener('dev:command', listener);
  },
});

// AI bridge — the Dev surface drives the host-side AI service.
contextBridge.exposeInMainWorld('novaAi', {
  state: () => ipcRenderer.invoke('ai:state'),
  setConfig: config => ipcRenderer.invoke('ai:set-config', config),
  setKey: key => ipcRenderer.invoke('ai:set-key', key),
  chat: (messages, options) => ipcRenderer.invoke('ai:chat', messages, options),
  cancel: () => ipcRenderer.invoke('ai:cancel'),
  onEvent: callback => {
    const listener = (_e, ev) => callback(ev);
    ipcRenderer.on('ai:event', listener);
    return () => ipcRenderer.removeListener('ai:event', listener);
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
