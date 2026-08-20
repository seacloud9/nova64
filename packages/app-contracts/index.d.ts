/**
 * Type declarations for @nova64/app-contracts.
 *
 * Values are re-exported from runtime/studio-protocol.js (see index.js); these
 * declarations give host-neutral TypeScript consumers (desktop app, VS Code
 * extension, os9-shell) a typed surface, and add the versioned RuntimeCommand /
 * RuntimeEvent contracts from plans/NOVA64_DESKTOP_VSCODE_PLAN.md §8.
 */

// ── Current Studio ⇄ runtime protocol (implemented in runtime/studio-protocol.js) ──

export const STUDIO_PROTOCOL_VERSION: 1;

export const StudioMessageType: {
  readonly CODE: 'EXECUTE_CODE';
  readonly READY: 'EXECUTE_READY';
  readonly SUCCESS: 'EXECUTE_SUCCESS';
  readonly ERROR: 'EXECUTE_ERROR';
  readonly LOG: 'CART_LOG';
};

export const MAX_CART_SOURCE_BYTES: number;
export const MAX_LOG_MESSAGE_BYTES: number;

export interface TrustOriginOptions {
  selfOrigin?: string;
  allowedOrigins?: string[];
}

export interface InboundCodeResult {
  ok: boolean;
  code?: string;
  runId?: string | null;
  error?: string;
}

export interface InboundStatusResult {
  ok: boolean;
  type?: string;
  message?: string;
  error?: string;
  protocolError?: string;
}

/** MessageEvent-like shape used by the runtime-side inbound guard. */
export interface RuntimeMessageEventLike {
  origin: string;
  source?: unknown;
  data?: unknown;
}

export interface AcceptExecuteCodeOptions extends TrustOriginOptions {
  /** The only window permitted to send code (the runtime's embedding parent). */
  expectedSource?: unknown;
}

export function byteLength(str: unknown): number;
export function isTrustedOrigin(origin: unknown, options?: TrustOriginOptions): boolean;
export function validateInboundCode(data: unknown): InboundCodeResult;
export function validateInboundStatus(data: unknown): InboundStatusResult;
export function acceptExecuteCode(
  event: RuntimeMessageEventLike,
  options?: AcceptExecuteCodeOptions
): InboundCodeResult;

// ── Versioned platform runtime protocol (plan §8) ──────────────────────────────
// The forward-looking contract the sandboxed Preview renderer and hosts will use.
// Each message is versioned; commands/events carry a runId (+ generation id).

export interface SerializedError {
  name?: string;
  message: string;
  stack?: string;
}

export type RuntimeCommand =
  | { version: 1; type: 'runtime.run'; runId: string; source: string; entry: string }
  | { version: 1; type: 'runtime.stop'; runId: string }
  | { version: 1; type: 'runtime.reload'; runId: string };

export type RuntimeEvent =
  | { version: 1; type: 'runtime.ready' }
  | { version: 1; type: 'runtime.started'; runId: string }
  | { version: 1; type: 'runtime.log'; runId: string; level: string; message: string }
  | { version: 1; type: 'runtime.error'; runId: string; error: SerializedError }
  | { version: 1; type: 'runtime.stopped'; runId: string };
