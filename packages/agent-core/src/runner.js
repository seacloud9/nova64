import { coerceMode } from './modes.js';
import { getTool, toolAllowedInMode, approvalRequired } from './tools.js';

/**
 * Executes agent tool calls against an injected host, enforcing two guarantees:
 *
 *  1. Mode gating — a tool the current mode does not permit is rejected outright
 *     (e.g. `write_file` in `plan` mode).
 *  2. Approval — mutating/external tools only run once approved. A call for such
 *     a tool without `{ approved: true }` returns a `needs-approval` result the
 *     UI turns into an approval card; re-issuing with `approved` runs it.
 *
 * Every settled call is appended to an in-memory run history. The host is any
 * object exposing async methods named by each tool spec's `handler`.
 */
export class ToolRunner {
  /** @param {{ host: object, mode?: string, onEvent?: (e:object)=>void }} opts */
  constructor({ host, mode = 'ask', onEvent } = {}) {
    if (!host) throw new Error('ToolRunner requires a host');
    this.host = host;
    this.mode = coerceMode(mode);
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};
    /** @type {Array<object>} */
    this.history = [];
  }

  setMode(mode) {
    this.mode = coerceMode(mode);
  }

  #record(entry) {
    const record = { at: Date.now(), mode: this.mode, ...entry };
    this.history.push(record);
    this.onEvent({ type: 'tool-result', ...record });
    return record;
  }

  /**
   * Run one tool call.
   * @param {string} name
   * @param {object} [args]
   * @param {{ approved?: boolean, signal?: AbortSignal }} [opts]
   * @returns {Promise<{status:'ok'|'error'|'denied'|'needs-approval', ...}>}
   */
  async run(name, args = {}, { approved = false, signal } = {}) {
    const tool = getTool(name);
    if (!tool) return this.#record({ tool: name, args, status: 'error', error: `unknown tool: ${name}` });

    if (!toolAllowedInMode(name, this.mode)) {
      return this.#record({ tool: name, args, status: 'denied', reason: `"${name}" is not allowed in ${this.mode} mode` });
    }

    if (approvalRequired(name, this.mode) && !approved) {
      // Not recorded as history yet — it hasn't run. Surface an approval request.
      const request = { type: 'approval-request', tool: name, title: tool.title, args, mutating: tool.mutating, external: tool.external };
      this.onEvent(request);
      return { status: 'needs-approval', tool: name, title: tool.title, args };
    }

    if (signal?.aborted) return this.#record({ tool: name, args, status: 'error', error: 'aborted' });

    const handler = this.host[tool.handler];
    if (typeof handler !== 'function') {
      return this.#record({ tool: name, args, status: 'error', error: `host has no handler for ${name}` });
    }

    try {
      const result = await handler.call(this.host, args, { signal });
      return this.#record({ tool: name, args, status: 'ok', result });
    } catch (err) {
      return this.#record({ tool: name, args, status: 'error', error: err && err.message ? err.message : String(err) });
    }
  }
}
