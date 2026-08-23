'use strict';

const { app, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_CONFIG = {
  providerId: 'echo',
  baseUrl: 'http://localhost:11434', // Ollama default; unused by echo
  model: '',
  // Detailed generation controls (sent to the provider when it supports them).
  temperature: 0.7,
  topP: 1,
  maxOutputTokens: 4096,
  // System-prompt library: named prompts the user can create + switch between.
  // The active one is combined with the agent mode's system prompt on each chat.
  systemPrompts: [], // [{ id, name, text }]
  activeSystemPromptId: '',
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
    const {
      ProviderRegistry,
      createEchoProvider,
      createOpenAICompatibleProvider,
      createAnthropicProvider,
      createOpenCodeProvider,
      PROVIDER_PRESETS,
    } = await import('@nova64/ai-providers');
    this.registry = new ProviderRegistry()
      .register(createEchoProvider())
      .register(createOpenAICompatibleProvider())
      .register(createAnthropicProvider())
      .register(createOpenCodeProvider());
    this.presets = PROVIDER_PRESETS;
    // Agent seam (Phase 5): mode-specific system prompts + mode coercion.
    const agent = await import('@nova64/agent-core');
    this.agent = { systemPromptFor: agent.systemPromptFor, coerceMode: agent.coerceMode };
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
      presets: this.presets || [],
      hasKey: this.secrets ? this.secrets.has('apiKey') : false,
    };
  }

  /** Sanitize the system-prompt library from arbitrary input. */
  #normalizePrompts(list) {
    if (!Array.isArray(list)) return this.config.systemPrompts || [];
    return list
      .filter(p => p && typeof p.text === 'string')
      .slice(0, 50)
      .map(p => ({
        id: String(p.id || `sp_${Math.random().toString(36).slice(2, 9)}`),
        name: String(p.name || 'Untitled').slice(0, 80),
        text: String(p.text).slice(0, 20000),
      }));
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
      const clamp = (v, lo, hi, dflt) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt);
      const prompts = this.#normalizePrompts(next.systemPrompts);
      this.config = {
        providerId: String(next.providerId || 'echo'),
        baseUrl: String(next.baseUrl || ''),
        model: String(next.model || ''),
        temperature: clamp(next.temperature, 0, 2, 0.7),
        topP: clamp(next.topP, 0, 1, 1),
        maxOutputTokens: Math.round(clamp(next.maxOutputTokens, 1, 200000, 4096)),
        systemPrompts: prompts,
        activeSystemPromptId: prompts.some(p => p.id === next.activeSystemPromptId)
          ? String(next.activeSystemPromptId)
          : '',
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
    ipcMain.handle('ai:chat', async (event, messages, options) => {
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

      // Agent mode (Phase 5) + custom system prompt: prepend one system message
      // combining the mode's instructions with the active library prompt (if any).
      // The renderer never sets system roles itself.
      const mode = this.agent ? this.agent.coerceMode(options && options.mode) : 'ask';
      const parts = [];
      if (this.agent) parts.push(this.agent.systemPromptFor(mode));
      const active = (this.config.systemPrompts || []).find(p => p.id === this.config.activeSystemPromptId);
      if (active && active.text.trim()) parts.push(active.text.trim());
      if (parts.length) safeMessages.unshift({ role: 'system', content: parts.join('\n\n') });

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
