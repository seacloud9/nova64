export type AgentMode = 'ask' | 'plan' | 'edit' | 'agent';

export const MODES: readonly AgentMode[];
export const DEFAULT_MODE: AgentMode;
export function isMode(value: unknown): value is AgentMode;
export function coerceMode(value: unknown): AgentMode;
export function allowsMutation(mode: string): boolean;
export function systemPromptFor(mode: string): string;

export interface ToolSpec {
  name: string;
  title: string;
  handler: string;
  mutating: boolean;
  external: boolean;
  modes: AgentMode[];
}

export const TOOL_SPECS: readonly ToolSpec[];
export function getTool(name: string): ToolSpec | undefined;
export function toolsForMode(mode: string): ToolSpec[];
export function toolAllowedInMode(name: string, mode: string): boolean;
export function approvalRequired(name: string, mode: string): boolean;

export interface ToolRunResult {
  status: 'ok' | 'error' | 'denied' | 'needs-approval';
  tool: string;
  title?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  reason?: string;
}

export interface ToolRunnerOptions {
  host: Record<string, (args: any, ctx?: { signal?: AbortSignal }) => Promise<unknown>>;
  mode?: AgentMode;
  onEvent?: (event: Record<string, unknown>) => void;
}

export class ToolRunner {
  constructor(opts: ToolRunnerOptions);
  mode: AgentMode;
  history: Array<Record<string, unknown>>;
  setMode(mode: string): void;
  run(
    name: string,
    args?: Record<string, unknown>,
    opts?: { approved?: boolean; signal?: AbortSignal }
  ): Promise<ToolRunResult>;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export function parseToolCalls(text: string): ToolCall[];
export function stripToolCalls(text: string): string;
export function hasToolCall(text: string): boolean;
export function toolInstructions(mode: string): string;
export function formatToolResult(name: string, result: unknown): string;
