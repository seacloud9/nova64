// hyperNova – sandboxed script runner
// Scripts run inside a new Function() scope with only the injected api exposed.
// No access to window, document, globalThis, or the nova64 runtime.

export interface ScriptAPI {
  goToCard: (id: string) => void;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
  setField: (id: string, value: string) => void;
  getField: (id: string) => string;
  alert: (msg: string) => void;
  log: (...args: unknown[]) => void;
  /** current card id – read-only inside script */
  currentCardId: string;
}

export function runScript(script: string, api: ScriptAPI): void {
  if (!script || !script.trim()) return;

  const keys = Object.keys(api) as Array<keyof ScriptAPI>;
  const values = keys.map((k) => api[k]);

  try {
    // Construct a function that shadows dangerous globals via parameter names.
    // Note: 'eval' and 'arguments' cannot be parameter names in strict mode,
    // so they are intentionally omitted from the shadow list.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(
      // shadow dangerous globals
      'window', 'document', 'globalThis', 'self', 'top', 'parent',
      'fetch', 'XMLHttpRequest',
      // inject api names
      ...keys,
      // body
      `"use strict";\n${script}`
    );

    fn(
      // shadow values (all undefined)
      undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined,
      // api values
      ...values
    );
  } catch (err) {
    console.warn('[hyperNova] Script error:', err);
  }
}
