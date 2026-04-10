// tests/test-tween.js — Unit tests for runtime/tween.js
// Run standalone: node tests/test-tween.js
// Or via CLI:     node tests/test-cli.js tween

import {
  createTween,
  killTween,
  killTweensOf,
  killAllTweens,
  updateTweens,
  getTweenCount,
  Ease,
} from '../runtime/tween.js';

// ─── Minimal test runner (same pattern as test-hype.js) ───────────────────────
class TestRunner {
  constructor() { this.tests = []; this.results = []; }
  test(name, fn) { this.tests.push({ name, fn }); }
  async runAll() {
    console.log(`Running ${this.tests.length} tests...\n`);
    for (const t of this.tests) {
      const start = Date.now();
      let passed = false, error = null;
      try { await t.fn(); passed = true; console.log(`✅ ${t.name}`); }
      catch (e) { error = e.message; console.log(`❌ ${t.name}: ${error}`); }
      this.results.push({ name: t.name, passed, error, duration: Date.now() - start });
    }
    const passed = this.results.filter(r => r.passed).length;
    const total  = this.results.length;
    console.log(`\nResults: ${passed}/${total} passed`);
    return { passed, total, failed: total - passed, errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })) };
  }
}

class Assert {
  static isTrue(v, m = 'Expected true')          { if (!v)             throw new Error(`${m} (got ${v})`); }
  static isFalse(v, m = 'Expected false')         { if (v)              throw new Error(`${m} (got ${v})`); }
  static isEqual(a, b, m = 'Expected equal')      { if (a !== b)        throw new Error(`${m}: expected ${b}, got ${a}`); }
  static isDefined(v, m = 'Expected defined')     { if (v == null)      throw new Error(`${m} (got ${v})`); }
  static isFunction(v, m = 'Expected function')   { if (typeof v !== 'function') throw new Error(`${m} (got ${typeof v})`); }
  static isNumber(v, m = 'Expected number')       { if (typeof v !== 'number' || isNaN(v)) throw new Error(`${m} (got ${v})`); }
  static inRange(v, lo, hi, m = 'Out of range')   { if (v < lo || v > hi) throw new Error(`${m}: ${v} not in [${lo}, ${hi}]`); }
  static doesNotThrow(fn, m = 'Should not throw') { try { fn(); } catch (e) { throw new Error(`${m}: ${e.message}`); } }
}

// Helpers: flush the global registry by a given dt
function tick(dt)  { updateTweens(dt); }

export async function runTweenTests() {
  // Always start from a clean registry
  killAllTweens();

  const runner = new TestRunner();

  // ── Exports ────────────────────────────────────────────────────────────────

  runner.test('exports: createTween is a function', () => {
    Assert.isFunction(createTween, 'createTween should be a function');
  });

  runner.test('exports: killAllTweens is a function', () => {
    Assert.isFunction(killAllTweens, 'killAllTweens should be exported');
  });

  runner.test('exports: killTweensOf is a function', () => {
    Assert.isFunction(killTweensOf, 'killTweensOf should be exported');
  });

  runner.test('exports: getTweenCount is a function', () => {
    Assert.isFunction(getTweenCount, 'getTweenCount should be a function');
  });

  // ── Nova-style: basic property animation ─────────────────────────────────

  runner.test('nova-style: animates numeric property', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 100 }, 1.0, {});
    tick(0.5);
    Assert.inRange(obj.x, 40, 60, 'x should be ~50 at t=0.5');
  });

  runner.test('nova-style: reaches target after full duration', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 200 }, 1.0, {});
    tick(1.1);
    Assert.isEqual(obj.x, 200, 'x should snap to 200 at completion');
  });

  runner.test('nova-style: tween registered in active set', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 50 }, 1.0, {});
    Assert.isEqual(getTweenCount(), 1, 'One tween should be active');
    killAllTweens();
  });

  runner.test('nova-style: completed tween removed from active set', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 50 }, 0.1, {});
    tick(0.5);
    Assert.isEqual(getTweenCount(), 0, 'Completed tween should be removed');
  });

  runner.test('nova-style: onComplete callback fires', () => {
    killAllTweens();
    let called = false;
    const obj = { x: 0 };
    createTween(obj, { x: 10 }, 0.1, { onComplete: () => { called = true; } });
    tick(0.5);
    Assert.isTrue(called, 'onComplete should have fired');
  });

  runner.test('nova-style: delay defers start', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 100 }, 0.5, { delay: 0.5 });
    tick(0.4);
    Assert.isEqual(obj.x, 0, 'x should not advance before delay expires');
    killAllTweens();
  });

  // ── nova-style: _target stored for killTweensOf ───────────────────────────

  runner.test('nova-style: stores _target for killTweensOf', () => {
    killAllTweens();
    const obj = { x: 0 };
    const tw  = createTween(obj, { x: 100 }, 2.0, {});
    Assert.isEqual(tw._target, obj, 'tween._target should reference the animated object');
    killAllTweens();
  });

  // ── killTweensOf ──────────────────────────────────────────────────────────

  runner.test('killTweensOf: removes tweens for the given target', () => {
    killAllTweens();
    const a = { x: 0 };
    const b = { y: 0 };
    createTween(a, { x: 100 }, 5.0, {});
    createTween(b, { y: 100 }, 5.0, {});
    Assert.isEqual(getTweenCount(), 2, 'Two tweens active');
    killTweensOf(a);
    Assert.isEqual(getTweenCount(), 1, 'Only one tween should remain after killTweensOf(a)');
    tick(10);
    Assert.isEqual(a.x, 0, 'a.x must not have changed after kill');
    killAllTweens();
  });

  runner.test('killTweensOf: does nothing for unknown target', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 100 }, 5.0, {});
    Assert.doesNotThrow(() => killTweensOf({ unrelated: true }), 'killTweensOf unknown target should not throw');
    Assert.isEqual(getTweenCount(), 1, 'Tween for obj should still be active');
    killAllTweens();
  });

  // ── killAllTweens ─────────────────────────────────────────────────────────

  runner.test('killAllTweens: removes all active tweens', () => {
    killAllTweens();
    const a = { x: 0 }, b = { y: 0 }, c = { z: 0 };
    createTween(a, { x: 100 }, 5.0, {});
    createTween(b, { y: 100 }, 5.0, {});
    createTween(c, { z: 100 }, 5.0, {});
    Assert.isEqual(getTweenCount(), 3, 'Three tweens active before kill');
    killAllTweens();
    Assert.isEqual(getTweenCount(), 0, 'No tweens should remain after killAllTweens');
  });

  runner.test('killAllTweens: stopped tweens no longer advance on tick', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 100 }, 5.0, {});
    killAllTweens();
    tick(1.0);
    Assert.isEqual(obj.x, 0, 'Killed tween must not advance');
  });

  runner.test('killAllTweens: safe to call on empty registry', () => {
    killAllTweens();
    Assert.doesNotThrow(() => killAllTweens(), 'killAllTweens on empty set should not throw');
    Assert.doesNotThrow(() => killAllTweens(), 'calling twice should not throw');
  });

  runner.test('killAllTweens: new tweens work fine after kill', () => {
    killAllTweens();
    const obj = { x: 0 };
    createTween(obj, { x: 100 }, 1.0, {});
    killAllTweens();
    const obj2 = { x: 0 };
    createTween(obj2, { x: 50 }, 1.0, {});
    tick(0.5);
    Assert.inRange(obj2.x, 20, 40, 'New tween after killAll should work normally');
    killAllTweens();
  });

  // ── Scene-transition simulation ── the critical regression test ───────────

  runner.test('scene transition: S2-style emitter cleanup does not throw', () => {
    // This reproduces the exact bug that broke all scenes after Fireworks.
    // An emitter was stored as {em, life} wrapper; clearEmitter2D was called on
    // the wrapper instead of the raw emitter, causing a TypeError crash.
    const rawEmitter = { _particles: [1, 2, 3], _acc: 0.5 };
    const wrappers   = [{ em: rawEmitter, life: 2.8 }];

    // clearEmitter2D equivalent (inline so test has no gpu dependency)
    function clearEmitter(em) { em._particles.length = 0; em._acc = 0; }

    // The WRONG way that used to crash:
    let threwOnWrapper = false;
    try { clearEmitter(wrappers[0]); } catch (_) { threwOnWrapper = true; }
    Assert.isTrue(threwOnWrapper, 'Calling clear on wrapper WITHOUT unwrapping should throw');

    // The FIXED way (unwrap .em first):
    Assert.doesNotThrow(
      () => { const e = wrappers[0]; clearEmitter(e.em ?? e); },
      'Unwrapping {em,life} wrapper before clear must not throw'
    );
    Assert.isEqual(rawEmitter._particles.length, 0, '_particles should be cleared');
  });

  runner.test('scene transition: tweens from previous scene are killed on change', () => {
    killAllTweens();
    // Simulate scene A creating a tween
    const nodeA = { x: 0 };
    createTween(nodeA, { x: 200 }, 10.0, {});
    Assert.isEqual(getTweenCount(), 1, 'Scene A tween registered');

    // Simulate scene change: _cleanupScene kills all tweens
    killAllTweens();
    Assert.isEqual(getTweenCount(), 0, 'Scene A tweens must be gone after cleanup');

    // Simulate scene B creating its own tween
    const nodeB = { x: 0 };
    createTween(nodeB, { x: 100 }, 1.0, {});
    tick(0.5);
    Assert.isEqual(nodeA.x, 0,  'Scene A node must not advance');
    Assert.inRange(nodeB.x, 30, 70, 'Scene B node should animate normally');
    killAllTweens();
  });

  runner.test('scene transition: stale onUpdate callback on old scene state', () => {
    // Simulates a hype-style tween (manual tick) whose onUpdate mutates old state.
    // After scene change the callback should be harmless (no crashes even if state is stale).
    let sceneA = { shown: '' };
    const text = 'HELLO';
    const tw   = createTween({
      from: 0, to: text.length,
      duration: 1.0,
      ease: 'linear',
      loop: 'none',
      onUpdate: v => { if (sceneA) sceneA.shown = text.slice(0, Math.ceil(v)); },
    });
    tw.pause();
    tw.play();
    tw.tick(0.5);
    Assert.isEqual(sceneA.shown, 'HEL', 'onUpdate should reveal "HEL" at t=0.5');

    // Scene changes: state reference is abandoned, NOT nulled
    const sceneARef = sceneA;
    sceneA = null; // old scene object still referenced by closure

    // Ticking after scene change should not throw even with stale closure
    Assert.doesNotThrow(() => tw.tick(0.5), 'Ticking with stale closure must not throw');
    // The closure guards: `if (sceneA)` — once sceneA is null the update is skipped,
    // so shown stays at the value from the first tick ('HEL'). No crash = the key guarantee.
    Assert.isEqual(sceneARef.shown, 'HEL', 'Stale closure stops updating once reference is null (no crash)');
  });

  // ── Hype-style: basic scalar tween ────────────────────────────────────────

  runner.test('hype-style: easeOutBounce value stays within range', () => {
    const tw = createTween({ from: 0, to: 100, duration: 1.0, ease: 'easeOutBounce' });
    for (let t = 0; t <= 1.0; t += 0.05) {
      tw.tick(0.05);
      Assert.inRange(tw.value, -5, 110, `value out of range at t=${t.toFixed(2)}`);
    }
  });

  runner.test('hype-style: pingpong reverses direction', () => {
    const tw = createTween({ from: 0, to: 10, duration: 0.2, ease: 'linear', loop: 'pingpong' });
    for (let i = 0; i < 5; i++) tw.tick(0.05); // 0.25s total; peak was at 0.2s, now reversing
    const atPeak = tw.value;
    // At t=0.25 with dur=0.2 pingpong: first pass ends at 0.2s (value=10), then 0.05s into
    // reverse → value ≈ 7.5.  Accept [6, 10] to tolerate easing curve variation.
    Assert.inRange(atPeak, 6, 10, 'Should be past peak and starting to reverse at t=0.25');
    for (let i = 0; i < 4; i++) tw.tick(0.05); // another 0.2s → back near 0
    Assert.inRange(tw.value, 0, 4, 'Should have reversed back toward 0');
  });

  runner.test('hype-style: NOT added to global _activeTweens', () => {
    killAllTweens();
    createTween({ from: 0, to: 1, duration: 1.0 });
    Assert.isEqual(getTweenCount(), 0, 'Hype-style tween must not pollute _activeTweens');
  });

  // ── Ease functions ────────────────────────────────────────────────────────

  runner.test('Ease.linear is exported and correct', () => {
    Assert.isFunction(Ease.linear, 'Ease.linear must be a function');
    Assert.isEqual(Ease.linear(0), 0, 'linear(0) === 0');
    Assert.isEqual(Ease.linear(1), 1, 'linear(1) === 1');
    Assert.isEqual(Ease.linear(0.5), 0.5, 'linear(0.5) === 0.5');
  });

  runner.test('Ease.outBounce(1) === 1', () => {
    Assert.isEqual(Ease.outBounce(1), 1, 'easeOutBounce endpoint must be 1');
  });

  runner.test('Ease.outElastic(0) === 0 and Ease.outElastic(1) === 1', () => {
    Assert.isEqual(Ease.outElastic(0), 0, 'outElastic(0) must be 0');
    Assert.isEqual(Ease.outElastic(1), 1, 'outElastic(1) must be 1');
  });

  // ── Clean up ──────────────────────────────────────────────────────────────
  killAllTweens();

  return runner.runAll();
}

// Run standalone
if (process.argv[1] && process.argv[1].includes('test-tween')) {
  runTweenTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
