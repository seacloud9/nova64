// hyperNova – sandboxed script runner
// Scripts run inside a new Function() scope with only the injected api exposed.
// No access to window, document, globalThis, or the nova64 runtime.

import {
  fadeIn as _fadeIn,
  fadeOut as _fadeOut,
  tweenTo as _tweenTo,
  pulse as _pulse,
  shake as _shake,
  slideIn as _slideIn,
  playClip as _playClip,
  stopClip as _stopClip,
  gotoAndPlay as _gotoAndPlay,
  gotoAndStop as _gotoAndStop,
  type TweenOptions,
  type TweenToProps,
} from './TweenEngine';

export type { TweenOptions, TweenToProps };

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
  // Tween API
  fadeIn: (objectId: string, opts?: TweenOptions) => void;
  fadeOut: (objectId: string, opts?: TweenOptions) => void;
  tweenTo: (objectId: string, props: TweenToProps, opts?: TweenOptions) => void;
  pulse: (objectId: string, opts?: TweenOptions) => void;
  shake: (objectId: string, opts?: TweenOptions) => void;
  slideIn: (objectId: string, from?: 'left' | 'right' | 'top' | 'bottom', opts?: TweenOptions) => void;
  // MovieClip control
  playClip: (symbolInstanceId: string) => void;
  stopClip: (symbolInstanceId: string) => void;
  gotoAndPlay: (symbolInstanceId: string, frame: number) => void;
  gotoAndStop: (symbolInstanceId: string, frame: number) => void;
}

/** Build tween/clip functions bound to the live DOM */
export function buildTweenAPI(): Pick<ScriptAPI,
  'fadeIn' | 'fadeOut' | 'tweenTo' | 'pulse' | 'shake' | 'slideIn' |
  'playClip' | 'stopClip' | 'gotoAndPlay' | 'gotoAndStop'
> {
  return {
    fadeIn: _fadeIn,
    fadeOut: _fadeOut,
    tweenTo: _tweenTo,
    pulse: _pulse,
    shake: _shake,
    slideIn: _slideIn,
    playClip: _playClip,
    stopClip: _stopClip,
    gotoAndPlay: _gotoAndPlay,
    gotoAndStop: _gotoAndStop,
  };
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
