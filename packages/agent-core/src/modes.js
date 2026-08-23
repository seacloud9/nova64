/**
 * Agent interaction modes. Each mode changes how the assistant is instructed and
 * what it is allowed to do:
 *
 *  - ask   : plain Q&A. No tools, no edits. (default)
 *  - plan  : read-only reasoning. May use read/search tools to investigate and
 *            produce a step-by-step plan, but must NOT mutate files.
 *  - edit  : may propose concrete edits to files (write tool), each reviewable.
 *  - agent : full loop — read/search + edit + run tests/build, with approvals.
 */
export const MODES = Object.freeze(['ask', 'plan', 'edit', 'agent']);
export const DEFAULT_MODE = 'ask';

/** True if `value` is one of the known modes. */
export function isMode(value) {
  return MODES.includes(value);
}

/** Normalize an arbitrary value to a valid mode (falls back to the default). */
export function coerceMode(value) {
  return isMode(value) ? value : DEFAULT_MODE;
}

/** Whether a mode is permitted to mutate the workspace (write/delete/run). */
export function allowsMutation(mode) {
  const m = coerceMode(mode);
  return m === 'edit' || m === 'agent';
}

const SYSTEM_PROMPTS = Object.freeze({
  ask:
    'You are the Nova64 coding assistant. Answer questions clearly and concisely. ' +
    'Do not modify files — this is a read-only conversation.',
  plan:
    'You are the Nova64 coding assistant in PLAN mode. Investigate using read-only ' +
    'tools, then produce a clear, numbered, step-by-step plan. Do NOT edit files or ' +
    'run mutating commands — planning only.',
  edit:
    'You are the Nova64 coding assistant in EDIT mode. Propose concrete, minimal edits ' +
    'to the relevant files. Present each change so it can be reviewed and approved ' +
    'before it is applied.',
  agent:
    'You are the Nova64 coding assistant in AGENT mode. You may read and search the ' +
    'workspace, edit files, and run tests/builds using the provided tools. Prefer small, ' +
    'verifiable steps. Every file mutation and command must be surfaced for approval.',
});

/** The system prompt that instructs the model for a given mode. */
export function systemPromptFor(mode) {
  return SYSTEM_PROMPTS[coerceMode(mode)];
}
