/**
 * @nova64/workspace-core — host-neutral workspace model.
 *
 * Project file tree, editor tab/dirty tracking, workspace-relative path safety,
 * and the NovaFileSystem contract (+ an in-memory reference implementation).
 * No React / Electron / VS Code / browser globals — consumable from Electron
 * main (dynamic import), the browser Dev renderer (native ESM), and VS Code.
 */
export * from './src/paths.js';
export * from './src/file-tree.js';
export * from './src/workspace.js';
export * from './src/fs.js';
