/**
 * RuntimePreview — runs the active cart in a sandboxed Nova64 runtime iframe.
 *
 * The iframe loads the runtime in Studio mode (`console.html?studio=1`), which
 * waits for an EXECUTE_CODE message and validates it with the hardened studio
 * protocol (runtime/studio-protocol.js): it only accepts code from its embedding
 * parent (this Dev renderer) on a trusted origin. We mirror that on the receiving
 * side — status/log messages are trusted only from our own iframe on the runtime
 * origin. Cart code is executed solely inside this restricted iframe.
 */

const RUNTIME_ORIGIN = 'nova64-app://os';
// Use the lean cart-runner page (bare CRT screen), not the full console shell
// (hardware bezel + side panel + mobile controls) — the latter is built for a
// full window and looks cramped/broken in the preview modal. At the modal's
// width the cart-runner strips its bezel and fills the canvas edge-to-edge.
//
// `host` declares this Dev surface's origin to the runtime: custom schemes
// (nova64-app://) don't set document.referrer, so without it the runtime targets
// its READY signal at the wrong origin and rejects our EXECUTE_CODE (the two live
// on different surfaces: dev vs os). The runtime still verifies event.source.
const RUNTIME_URL = `${RUNTIME_ORIGIN}/cart-runner.html?studio=1&host=${encodeURIComponent(
  window.location.origin
)}`;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

/** Strip ES module `export` syntax so the code runs in the runtime's function scope. */
function processCartCode(code) {
  let out = String(code || '');
  out = out.replace(/export\s+async\s+function\s/g, 'async function ');
  out = out.replace(/export\s+function\s/g, 'function ');
  out = out.replace(/export\s+const\s/g, 'const ');
  out = out.replace(/export\s+let\s/g, 'let ');
  out = out.replace(/export\s+var\s/g, 'var ');
  out = out.replace(/export\s+default\s+/g, '');
  out = out.replace(/export\s*\{[^}]*\}\s*;?/g, '');
  return out;
}

export class RuntimePreview {
  constructor({ host, consoleEl }) {
    this.host = host;
    this.consoleEl = consoleEl;
    this.iframe = null;
    this.ready = false;
    this.pending = null;
    this.runId = 0;
    window.addEventListener('message', this.#onMessage);
  }

  #onMessage = e => {
    // Trust only our own runtime iframe on the runtime origin.
    if (!this.iframe || e.source !== this.iframe.contentWindow) return;
    if (e.origin !== RUNTIME_ORIGIN) return;
    const type = e.data && e.data.type;
    if (type === 'EXECUTE_READY') {
      this.ready = true;
      if (this.pending != null) {
        this.#post(this.pending);
        this.pending = null;
      }
    } else if (type === 'EXECUTE_SUCCESS') {
      this.#log('▶ cart running');
    } else if (type === 'CART_LOG') {
      if (typeof e.data.message === 'string' && e.data.message.length <= 65536) {
        this.#log(e.data.message);
      }
    } else if (type === 'EXECUTE_ERROR') {
      const err = typeof e.data.error === 'string' ? e.data.error.slice(0, 4096) : 'error';
      this.#log(`❌ ${err}`, true);
    }
  };

  #ensureIframe() {
    if (this.iframe) return;
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'preview-frame';
    this.iframe.setAttribute('title', 'Nova64 runtime preview');
    this.iframe.src = RUNTIME_URL;
    this.host.appendChild(this.iframe);
  }

  #post(code) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'EXECUTE_CODE', v: 1, runId: String(++this.runId), code },
        RUNTIME_ORIGIN
      );
    }
  }

  #log(message, isError = false) {
    if (!this.consoleEl) return;
    const line = document.createElement('div');
    line.className = `run-line${isError ? ' error' : ''}`;
    line.textContent = message;
    this.consoleEl.appendChild(line);
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
  }

  /** Run cart source. Boots the iframe on first use and queues until ready. */
  run(source) {
    const code = processCartCode(source);
    if (new Blob([code]).size > MAX_SOURCE_BYTES) {
      this.#log('❌ cart source too large to run', true);
      return;
    }
    this.#ensureIframe();
    if (this.ready) this.#post(code);
    else this.pending = code;
  }

  reload() {
    this.ready = false;
    this.pending = null;
    if (this.iframe) this.iframe.src = RUNTIME_URL;
    if (this.consoleEl) this.consoleEl.textContent = '';
  }
}
