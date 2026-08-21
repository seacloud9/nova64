import { parseSse } from './sse.js';

const trimSlash = url => String(url || '').replace(/\/+$/, '');
const authHeaders = apiKey => (apiKey ? { authorization: `Bearer ${apiKey}` } : {});

/**
 * OpenAI-compatible chat provider. Works with OpenAI, and local endpoints that
 * speak the same API — Ollama (`http://localhost:11434/v1`), LM Studio
 * (`http://localhost:1234/v1`), MLX-LM, vLLM, etc. The API key is optional (local
 * endpoints don't need one). `fetchImpl` is injectable for testing.
 *
 * config: { baseUrl, apiKey?, model, temperature?, maxOutputTokens? }
 */
export function createOpenAICompatibleProvider({
  id = 'openai-compatible',
  displayName = 'OpenAI-compatible',
  fetchImpl = globalThis.fetch,
} = {}) {
  const endpoint = baseUrl => `${trimSlash(baseUrl)}/v1`;

  return {
    id,
    displayName,
    kind: 'openai-compatible',

    /** Discover available model ids (best-effort; some endpoints omit this). */
    async listModels({ baseUrl, apiKey } = {}) {
      const res = await fetchImpl(`${endpoint(baseUrl)}/models`, {
        headers: { ...authHeaders(apiKey) },
      });
      if (!res.ok) throw new Error(`listModels failed: HTTP ${res.status}`);
      const data = await res.json();
      return (data.data || []).map(m => m.id).filter(Boolean);
    },

    /** Test the endpoint is reachable. */
    async testConnection(config) {
      try {
        await this.listModels(config);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    },

    /**
     * Stream a chat completion. Yields normalized events:
     *   { type: 'delta', text } · { type: 'done' }
     * Throws on transport/HTTP error.
     */
    async *chat(config, messages, { signal } = {}) {
      const { baseUrl, apiKey, model, temperature, maxOutputTokens } = config || {};
      const res = await fetchImpl(`${endpoint(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders(apiKey) },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          ...(temperature != null ? { temperature } : {}),
          ...(maxOutputTokens != null ? { max_tokens: maxOutputTokens } : {}),
        }),
        signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`chat failed: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
      }
      if (!res.body) throw new Error('chat failed: no response body to stream');

      for await (const payload of parseSse(res.body)) {
        if (payload === '[DONE]') break;
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        const text = json.choices?.[0]?.delta?.content;
        if (text) yield { type: 'delta', text };
      }
      yield { type: 'done' };
    },
  };
}
