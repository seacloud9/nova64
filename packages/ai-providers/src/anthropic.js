import { parseSse } from './sse.js';

const trimSlash = url => String(url || '').replace(/\/+$/, '');

/**
 * Anthropic (Claude) provider — the Messages API (`POST /v1/messages`).
 *
 * Not OpenAI-compatible: auth is `x-api-key` (+ `anthropic-version`), the system
 * prompt is a top-level `system` param (not a message role), and streaming uses
 * `content_block_delta` events with `delta.type === "text_delta"`.
 *
 * NOTE: `temperature` / `top_p` are intentionally NOT sent. Current Claude models
 * (Opus 4.8/4.7, Fable 5) reject sampling parameters with a 400 — steering is via
 * the prompt. `max_tokens` is required by the API. `fetchImpl` is injectable for
 * testing. Runs host-side (main process), so no CORS/browser header is needed.
 *
 * config: { baseUrl?, apiKey, model, maxOutputTokens?, anthropicVersion? }
 */
export function createAnthropicProvider({
  id = 'anthropic',
  displayName = 'Anthropic (Claude)',
  fetchImpl = globalThis.fetch,
} = {}) {
  const DEFAULT_VERSION = '2023-06-01';
  const DEFAULT_MAX_TOKENS = 4096;

  // Anthropic's `system` is top-level; pull any system-role messages out of the
  // array and fold them into it, leaving only user/assistant turns.
  function split(messages) {
    const systemParts = [];
    const turns = [];
    for (const m of messages || []) {
      if (!m || typeof m.content !== 'string') continue;
      if (m.role === 'system') systemParts.push(m.content);
      else turns.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
    }
    return { system: systemParts.join('\n\n'), turns };
  }

  return {
    id,
    displayName,
    kind: 'anthropic',

    async listModels() {
      // Anthropic exposes GET /v1/models, but the useful defaults are well-known
      // and stable; return them so the UI can populate without a key.
      return ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'];
    },

    async testConnection(config) {
      if (!config || !config.apiKey) return { ok: false, error: 'API key required' };
      return { ok: true };
    },

    async *chat(config, messages, { signal } = {}) {
      const { baseUrl, apiKey, model, maxOutputTokens, anthropicVersion } = config || {};
      const { system, turns } = split(messages);
      const res = await fetchImpl(`${trimSlash(baseUrl) || 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': anthropicVersion || DEFAULT_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens || DEFAULT_MAX_TOKENS,
          stream: true,
          ...(system ? { system } : {}),
          messages: turns,
        }),
        signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`chat failed: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
      }
      if (!res.body) throw new Error('chat failed: no response body to stream');

      for await (const payload of parseSse(res.body)) {
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          if (json.delta.text) yield { type: 'delta', text: json.delta.text };
        } else if (json.type === 'message_stop') {
          break;
        } else if (json.type === 'error') {
          throw new Error(json.error?.message || 'anthropic stream error');
        }
      }
      yield { type: 'done' };
    },
  };
}
