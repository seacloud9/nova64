/**
 * @nova64/app-contracts — host-neutral shared contracts.
 *
 * The canonical runtime⇄Studio message-protocol implementation lives in
 * `runtime/studio-protocol.js` so that the published `nova64` package (whose npm
 * `files` whitelist ships `runtime/` but NOT `packages/`) stays self-contained.
 * This package re-exports it as the shared, host-neutral entry point that the
 * desktop app, the VS Code extension, and os9-shell import going forward, and
 * layers typed contracts on top via `index.d.ts` (RuntimeCommand / RuntimeEvent).
 *
 * Keep this package free of React / Electron / VS Code / browser globals.
 */
export * from '../../runtime/studio-protocol.js';
