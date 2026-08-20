/**
 * EditorAdapter seam (plan §7). The Dev surface talks to the editor only through
 * this interface so the concrete widget can be swapped without touching workspace
 * logic. `TextareaEditorAdapter` is the initial implementation; a
 * `MonacoEditorAdapter` with the same surface is the planned drop-in replacement.
 *
 * Interface:
 *   mount(hostEl)
 *   setModel(path, content, language)   // show a file
 *   getValue(): string
 *   clear()                             // no active model
 *   onChange(cb)                        // cb(value)
 *   focus()
 */

const EXT_LANG = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.ts': 'typescript',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.glsl': 'glsl',
};

export function languageForPath(path) {
  const dot = path.lastIndexOf('.');
  return dot > 0 ? EXT_LANG[path.slice(dot)] || 'plaintext' : 'plaintext';
}

export class TextareaEditorAdapter {
  constructor() {
    this.el = null;
    this._onChange = null;
    this._path = null;
  }

  mount(hostEl) {
    this.el = document.createElement('textarea');
    this.el.className = 'code-editor';
    this.el.spellcheck = false;
    this.el.autocapitalize = 'off';
    this.el.setAttribute('aria-label', 'Code editor');
    this.el.disabled = true;
    this.el.addEventListener('input', () => {
      if (this._onChange) this._onChange(this.el.value);
    });
    hostEl.appendChild(this.el);
  }

  setModel(path, content /*, language */) {
    this._path = path;
    this.el.disabled = false;
    this.el.value = content;
  }

  getValue() {
    return this.el ? this.el.value : '';
  }

  clear() {
    this._path = null;
    if (this.el) {
      this.el.value = '';
      this.el.disabled = true;
    }
  }

  onChange(cb) {
    this._onChange = cb;
  }

  focus() {
    if (this.el && !this.el.disabled) this.el.focus();
  }
}
