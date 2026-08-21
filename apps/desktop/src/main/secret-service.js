'use strict';

const { app, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Encrypted secret storage for provider API keys. Uses Electron safeStorage
 * (OS keychain-backed) and persists only ciphertext to userData/secrets.json.
 * Keys never touch a renderer, localStorage, or the workspace.
 */
class SecretService {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'secrets.json');
    this.cache = this.#read();
  }

  #available() {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  #read() {
    const out = {};
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (this.#available()) {
        for (const [k, enc] of Object.entries(raw)) {
          try {
            out[k] = safeStorage.decryptString(Buffer.from(enc, 'base64'));
          } catch {
            /* skip unreadable entry */
          }
        }
      }
    } catch {
      /* no secrets yet */
    }
    return out;
  }

  #write() {
    if (!this.#available()) return;
    const raw = {};
    for (const [k, v] of Object.entries(this.cache)) {
      if (!v) continue;
      try {
        raw[k] = safeStorage.encryptString(v).toString('base64');
      } catch {
        /* skip */
      }
    }
    try {
      fs.writeFileSync(this.file, JSON.stringify(raw), 'utf8');
    } catch {
      /* best-effort */
    }
  }

  get(key) {
    return this.cache[key] || '';
  }

  has(key) {
    return Boolean(this.cache[key]);
  }

  set(key, value) {
    if (value) this.cache[key] = value;
    else delete this.cache[key];
    this.#write();
  }
}

module.exports = { SecretService };
