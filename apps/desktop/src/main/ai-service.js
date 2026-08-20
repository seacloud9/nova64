'use strict';

const { app, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_CONFIG = {
  providerId: 'echo',
  baseUrl: 'http://localhost:11434', // Ollama default; unused by echo
  model: '',
  temperature: 0.7,
};

/**
 * Host-side AI service. Runs LLM providers (from @nova64/ai-providers) entirely
 * in the main process — never a renderer — and streams normalized events to the
 * Dev surface over IPC. API keys come from SecretService (encrypted); non-secret
 * config persists to userData/ai-config.json.
 */
class AiService {
  /** @param {{ secrets: any, isTrustedSender?: (wc:any)=>boolean }} deps */
  constructor({ secrets, isTrustedSender } = {}) {
    this.secrets = secrets;
    this.isTrusted = isTrustedSender || (() => true);
    this.file = path.join(app.getPath('userData'), 'ai-config.json');
    this.config = { ...DEFAULT_CONFIG, ...this.#readConfig() };
    this.registry = null;
    this.activeAbort = null;
    this.ready = this.#init();
  }

  async #init() {
    const { ProviderRegistry, createEchoProvider, createOpenAICompatibleProvider } = await import(
      '@nova64/ai-providers'
    );
    this.registry = new ProviderRegistry()
      .register(createEchoProvider())
      .register(createOpenAICompatibleProvider());
  }

  #readConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return {};
    }
  }

  #writeConfig() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.config, null, 2), 'utf8');
    } catch {
      /* best-effort */
    }
  }

  state() {
    return {
      config: this.config,
      providers: this.registry ? this.registry.list() : [],
      hasKey: this.secrets ? this.secrets.has('apiKey') : false,
    };
  }

  registerIpc() {
    const guard = event => {
      if (!this.isTrusted(event.sender)) throw new Error('untrusted sender');
    };
    for (const ch of ['ai:state', 'ai:set-config', 'ai:set-key', 'ai:chat', 'ai:cancel']) {
      ipcMain.removeHandler(ch);
    }

    ipcMain.handle('ai:state', async event => {
      guard(event);
      await this.ready;
      return this.state();
    });
    ipcMain.handle('ai:set-config', async (event, partial) => {
      guard(event);
      const next = { ...this.config, ...(partial || {}) };
      this.config = {
        providerId: String(next.providerId || 'echo'),
        baseUrl: String(next.baseUrl || ''),
        model: String(next.model || ''),
        temperature: Number.isFinite(next.temperature) ? next.temperature : 0.7,
      };
      this.#writeConfig();
      return this.state();
    });
    ipcMain.handle('ai:set-key', (event, key) => {
      guard(event);
      if (this.secrets) this.secrets.set('apiKey', String(key || ''));
      return { hasKey: this.secrets ? this.secrets.has('apiKey') : false };
    });
    ipcMain.handle('ai:cancel', event => {
      guard(event);
      if (this.activeAbort) this.activeAbort.abort();
      return true;
    });
    ipcMain.handle('ai:chat', async (event, messages) => {
      guard(event);
      await this.ready;
      const provider = this.registry.get(this.config.providerId) || this.registry.get('echo');
      if (this.activeAbort) this.activeAbort.abort();
      const ac = new AbortController();
      this.activeAbort = ac;
      const wc = event.sender;
      const cfg = { ...this.config, apiKey: this.secrets ? this.secrets.get('apiKey') : '' };
      const safeMessages = Array.isArray(messages)
        ? messages
            .filter(m => m && typeof m.content === 'string')
            .map(m => ({ role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user', content: m.content }))
        : [];

      (async () => {
        try {
          for await (const ev of provider.chat(cfg, safeMessages, { signal: ac.signal })) {
            if (wc.isDestroyed()) break;
            wc.send('ai:event', ev);
          }
        } catch (err) {
          if (!wc.isDestroyed()) {
            wc.send('ai:event', {
              type: ac.signal.aborted ? 'cancelled' : 'error',
              error: err && err.message ? err.message : String(err),
            });
          }
        } finally {
          if (this.activeAbort === ac) this.activeAbort = null;
        }
      })();
      return true;
    });
  }

  dispose() {
    if (this.activeAbort) this.activeAbort.abort();
  }
}

module.exports = { AiService };
