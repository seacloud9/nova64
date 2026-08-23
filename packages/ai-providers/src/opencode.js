const trimSlash = url => String(url || '').replace(/\/+$/, '');

/**
 * OpenCode agent backend (https://opencode.ai) via its headless HTTP server
 * (`opencode serve`, default 127.0.0.1:4096). OpenCode runs its OWN coding-agent
 * loop (read/edit/run) in its working directory; here we drive it as a provider:
 * create a session, post the user's task, and stream back the assistant text.
 *
 * The server's synchronous `POST /session/:id/message` returns the full assistant
 * response, so we surface it as a single delta + done (no token streaming). The
 * server must be running separately; this provider only connects to it.
 *
 * config: { baseUrl?, apiKey?, model?, agent? }
 */
export function createOpenCodeProvider({
  id = 'opencode',
  displayName = 'OpenCode (agent)',
  fetchImpl = globalThis.fetch,
} = {}) {
  const base = config => trimSlash(config?.baseUrl) || 'http://127.0.0.1:4096';
  const authHeaders = config => (config?.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {});

  function extractText(parts) {
    if (!Array.isArray(parts)) return '';
    return parts
      .filter(p => p && p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
  }

  return {
    id,
    displayName,
    kind: 'opencode',

    async listModels() {
      return []; // OpenCode manages its own model config server-side
    },

    async testConnection(config) {
      try {
        const res = await fetchImpl(`${base(config)}/session`, { headers: { ...authHeaders(config) } });
        return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: `OpenCode server unreachable — run \`opencode serve\` (${err.message || err})` };
      }
    },

    async *chat(config, messages, { signal } = {}) {
      const url = base(config);
      const headers = { 'content-type': 'application/json', ...authHeaders(config) };

      // System prompt (mode instructions) + the latest user turn.
      const system = (messages || [])
        .filter(m => m && m.role === 'system' && typeof m.content === 'string')
        .map(m => m.content)
        .join('\n\n');
      const lastUser = [...(messages || [])].reverse().find(m => m && m.role === 'user' && typeof m.content === 'string');

      // 1. Create a session.
      const sRes = await fetchImpl(`${url}/session`, { method: 'POST', headers, body: '{}', signal });
      if (!sRes.ok) throw new Error(`OpenCode: create session failed (HTTP ${sRes.status})`);
      const session = await sRes.json();
      const sessionId = session && (session.id || session.sessionID);
      if (!sessionId) throw new Error('OpenCode: session id missing from response');

      // 2. Post the message and wait for the assistant response.
      const mRes = await fetchImpl(`${url}/session/${encodeURIComponent(sessionId)}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...(config?.model ? { model: config.model } : {}),
          ...(config?.agent ? { agent: config.agent } : {}),
          ...(system ? { system } : {}),
          parts: [{ type: 'text', text: lastUser ? lastUser.content : '' }],
        }),
        signal,
      });
      if (!mRes.ok) {
        const detail = await mRes.text().catch(() => '');
        throw new Error(`OpenCode: message failed (HTTP ${mRes.status})${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
      }
      const reply = await mRes.json();
      const text = extractText(reply && reply.parts) || '(OpenCode returned no text)';
      if (!signal?.aborted) yield { type: 'delta', text };
      yield { type: 'done' };
    },
  };
}
