import { coerceMode, allowsMutation } from './modes.js';

/**
 * Tool catalogue for the agent. Each spec is host-neutral metadata only — the
 * actual implementation is supplied by the host (Electron/VS Code) at run time
 * via a `host` object whose method names match `handler`.
 *
 * Fields:
 *  - name        stable id the model / UI references
 *  - title       human label for approval cards + history
 *  - handler     method name to invoke on the injected host
 *  - mutating    true if it changes the workspace or runs a command
 *  - external    true if it reaches outside the workspace (network, shell to the OS)
 *  - modes       which agent modes may use it
 */
export const TOOL_SPECS = Object.freeze([
  { name: 'read_file', title: 'Read file', handler: 'readFile', mutating: false, external: false, modes: ['plan', 'edit', 'agent'] },
  { name: 'list_dir', title: 'List directory', handler: 'listDir', mutating: false, external: false, modes: ['plan', 'edit', 'agent'] },
  { name: 'search_text', title: 'Search workspace', handler: 'searchText', mutating: false, external: false, modes: ['plan', 'edit', 'agent'] },
  { name: 'write_file', title: 'Write file', handler: 'writeFile', mutating: true, external: false, modes: ['edit', 'agent'] },
  { name: 'delete_path', title: 'Delete path', handler: 'deletePath', mutating: true, external: true, modes: ['agent'] },
  { name: 'run_tests', title: 'Run tests', handler: 'runTests', mutating: true, external: true, modes: ['agent'] },
  // Runs a cart in the sandboxed preview and returns its console output. Executed
  // renderer-side (not host), sandboxed, so no approval — like clicking Run.
  { name: 'run_cart', title: 'Run cart in preview', handler: 'runCart', mutating: false, external: false, modes: ['edit', 'agent'] },
]);

const BY_NAME = new Map(TOOL_SPECS.map(t => [t.name, t]));

/** Look up a tool spec by name (or undefined). */
export function getTool(name) {
  return BY_NAME.get(name);
}

/** Tool specs usable in a given mode. */
export function toolsForMode(mode) {
  const m = coerceMode(mode);
  return TOOL_SPECS.filter(t => t.modes.includes(m));
}

/** Whether a tool may run in a mode at all (mode gating). */
export function toolAllowedInMode(name, mode) {
  const tool = getTool(name);
  return Boolean(tool && tool.modes.includes(coerceMode(mode)));
}

/**
 * Whether invoking a tool requires explicit user approval. Mutations and any
 * external/destructive action always need approval; read-only tools never do.
 * (A tool disallowed by the mode is a hard error, handled separately.)
 */
export function approvalRequired(name, mode) {
  const tool = getTool(name);
  if (!tool) return true; // unknown → be safe, require approval
  if (!allowsMutation(mode)) return false; // read-only modes can't reach mutating tools anyway
  return Boolean(tool.mutating || tool.external);
}
