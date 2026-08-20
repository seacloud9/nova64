/**
 * MonacoEditorAdapter — drop-in for the EditorAdapter seam (plan §7). Loads
 * Monaco's AMD build over `nova64-app://monaco` (no bundler needed) and runs its
 * language workers from a same-origin blob that importScripts the cross-origin
 * worker. Falls back is handled by the caller (dev.js) if `create()` rejects.
 */

const MONACO_BASE = 'nova64-app://monaco';
let monacoPromise = null;

function loadMonaco() {
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    // Workers: a same-origin blob (allowed by worker-src blob:) that pulls in the
    // real worker from the monaco host (corsEnabled custom scheme).
    self.MonacoEnvironment = {
      getWorkerUrl() {
        const code =
          `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};` +
          `importScripts('${MONACO_BASE}/base/worker/workerMain.js');`;
        return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      },
    };
    const script = document.createElement('script');
    script.src = `${MONACO_BASE}/loader.js`;
    script.onload = () => {
      try {
        const amdRequire = window.require;
        amdRequire.config({ paths: { vs: MONACO_BASE } });
        amdRequire(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error('monaco loader failed to load'));
    document.head.appendChild(script);
  });
  return monacoPromise;
}

/** Map an app theme id → a Monaco built-in theme. */
export function monacoThemeFor(themeId) {
  if (themeId === 'light') return 'vs';
  if (themeId === 'high-contrast') return 'hc-black';
  return 'vs-dark';
}

export class MonacoEditorAdapter {
  static async create() {
    const monaco = await loadMonaco();
    return new MonacoEditorAdapter(monaco);
  }

  constructor(monaco) {
    this.monaco = monaco;
    this.editor = null;
    this._onChange = null;
    this._sub = null;
  }

  mount(hostEl) {
    const initialTheme = monacoThemeFor(document.documentElement.getAttribute('data-theme'));
    this.editor = this.monaco.editor.create(hostEl, {
      value: '',
      language: 'javascript',
      theme: initialTheme,
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 13,
      tabSize: 2,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      smoothScrolling: true,
    });
  }

  setModel(path, content, language) {
    const uri = this.monaco.Uri.parse(`nova64-workspace:/${path}`);
    let model = this.monaco.editor.getModel(uri);
    if (!model) {
      model = this.monaco.editor.createModel(content, language, uri);
    } else if (model.getValue() !== content) {
      model.setValue(content);
    }
    this.editor.setModel(model);
    if (this._sub) this._sub.dispose();
    this._sub = this.editor.onDidChangeModelContent(() => {
      if (this._onChange) this._onChange(this.editor.getValue());
    });
  }

  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  clear() {
    if (this.editor) this.editor.setModel(null);
  }

  onChange(cb) {
    this._onChange = cb;
  }

  focus() {
    if (this.editor) this.editor.focus();
  }

  setEditorTheme(themeId) {
    if (this.editor) this.monaco.editor.setTheme(monacoThemeFor(themeId));
  }
}
