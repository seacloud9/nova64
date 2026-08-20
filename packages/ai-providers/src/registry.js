/**
 * ProviderRegistry — holds available LLM providers by id. Host-neutral; the
 * Electron/VS Code AI host builds one, registers providers, and routes requests.
 */
export class ProviderRegistry {
  constructor() {
    /** @type {Map<string, import('../index.js').Provider>} */
    this.providers = new Map();
  }

  register(provider) {
    if (!provider || !provider.id) throw new Error('provider must have an id');
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id) {
    return this.providers.get(id) || null;
  }

  has(id) {
    return this.providers.has(id);
  }

  /** Lightweight descriptors for a provider picker UI. */
  list() {
    return [...this.providers.values()].map(p => ({
      id: p.id,
      displayName: p.displayName,
      kind: p.kind,
    }));
  }
}
