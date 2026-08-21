/**
 * Echo provider — a zero-dependency offline provider that streams a canned
 * reply word-by-word. Used to exercise the full chat pipeline (UI → host →
 * provider → stream) without a live LLM, and as a safe default.
 */
export function createEchoProvider() {
  return {
    id: 'echo',
    displayName: 'Echo (offline)',
    kind: 'echo',

    async listModels() {
      return ['echo-1'];
    },

    async testConnection() {
      return { ok: true };
    },

    async *chat(_config, messages, { signal } = {}) {
      const lastUser = [...(messages || [])].reverse().find(m => m.role === 'user');
      const reply = `Echo: ${lastUser ? lastUser.content : '(no message)'}`;
      for (const word of reply.split(/(\s+)/)) {
        if (signal?.aborted) return;
        if (word) yield { type: 'delta', text: word };
      }
      yield { type: 'done' };
    },
  };
}
