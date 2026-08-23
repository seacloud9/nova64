/**
 * Provider presets — one-click configurations that prefill the endpoint + a
 * sensible default model, so a user can select OpenAI / Together / Claude /
 * OpenCode / a local server WITHOUT first entering an API key. `needsKey` marks
 * which ones require a key to actually work (the key is added separately, later);
 * `sampling` marks whether temperature/top-p are accepted (Claude's current
 * models reject them, so the UI hides those controls for it).
 *
 * `providerId` names the registered provider that handles the preset.
 */
export const PROVIDER_PRESETS = Object.freeze([
  {
    id: 'openai',
    label: 'OpenAI',
    providerId: 'openai-compatible',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    sampling: true,
  },
  {
    id: 'togetherai',
    label: 'Together AI',
    providerId: 'openai-compatible',
    baseUrl: 'https://api.together.xyz',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    needsKey: true,
    sampling: true,
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    providerId: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-opus-4-8',
    needsKey: true,
    sampling: false, // current Claude models reject temperature/top_p
  },
  {
    id: 'opencode',
    label: 'OpenCode (local agent)',
    providerId: 'opencode',
    baseUrl: 'http://127.0.0.1:4096',
    defaultModel: '',
    needsKey: false,
    sampling: false,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    providerId: 'openai-compatible',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.1',
    needsKey: false,
    sampling: true,
  },
  {
    id: 'echo',
    label: 'Echo (offline test)',
    providerId: 'echo',
    baseUrl: '',
    defaultModel: 'echo-1',
    needsKey: false,
    sampling: false,
  },
]);

export function getPreset(id) {
  return PROVIDER_PRESETS.find(p => p.id === id);
}
