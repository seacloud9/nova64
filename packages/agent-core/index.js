/**
 * @nova64/agent-core — host-neutral agent seam for the Nova64 platform.
 *
 * Defines the interaction modes (ask/plan/edit/agent), the tool catalogue with
 * its per-mode gating and approval policy, and a ToolRunner that executes tool
 * calls against an injected host while enforcing those rules and recording run
 * history. No React / Electron / VS Code / browser globals — the AI host wires a
 * concrete `host` (backed by the workspace) and drives the runner.
 */
export {
  MODES,
  DEFAULT_MODE,
  isMode,
  coerceMode,
  allowsMutation,
  systemPromptFor,
} from './src/modes.js';

export {
  TOOL_SPECS,
  getTool,
  toolsForMode,
  toolAllowedInMode,
  approvalRequired,
} from './src/tools.js';

export { ToolRunner } from './src/runner.js';
