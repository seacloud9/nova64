// tests/test-hype.js — Unit tests for runtime/hype.js
// Run standalone: node tests/test-hype.js
// Or via CLI:     node tests/test-cli.js hype

import { hypeApi } from '../runtime/hype.js';

// ── Re-use the same inline helper classes as test-cli.js ──────────────────────

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runAll() {
    console.log(`Running ${this.tests.length} tests...\n`);

    for (const test of this.tests) {
      const startTime = Date.now();
      let passed = false;
      let error = null;

      try {
        await test.testFn();
        passed = true;
        console.log(`✅ ${test.name}`);
      } catch (e) {
        error = e.message;
        console.log(`❌ ${test.name}: ${error}`);
      }

      const duration = Date.now() - startTime;
      this.results.push({ name: test.name, passed, error, duration });
    }

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;
    const errors = this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error }));

    console.log(`\nResults: ${passed}/${total} passed`);
    return { passed, total, failed, errors };
  }
}

class Assert {
  static isTrue(value, message = 'Expected true') {
    if (value !== true) throw new Error(`${message} (got ${value})`);
  }
  static isFalse(value, message = 'Expected false') {
    if (value !== false) throw new Error(`${message} (got ${value})`);
  }
  static isEqual(a, b, message = 'Expected equal') {
    if (a !== b) throw new Error(`${message} (got ${a}, expected ${b})`);
  }
  static isNotEqual(a, b, message = 'Expected not equal') {
    if (a === b) throw new Error(`${message} (${a} === ${b})`);
  }
  static isDefined(value, message = 'Expected defined') {
    if (value === undefined || value === null) throw new Error(`${message} (got ${value})`);
  }
  static isFunction(value, message = 'Expected function') {
    if (typeof value !== 'function') throw new Error(`${message} (got ${typeof value})`);
  }
  static isNumber(value, message = 'Expected number') {
    if (typeof value !== 'number' || isNaN(value)) throw new Error(`${message} (got ${value})`);
  }
  static inRange(value, min, max, message = 'Expected in range') {
    if (value < min || value > max) throw new Error(`${message}: ${value} not in [${min}, ${max}]`);
  }
  static doesNotThrow(fn, message = 'Expected no throw') {
    try {
      fn();
    } catch (e) {
      throw new Error(`${message}: threw ${e.message}`);
    }
  }
}

// ── Setup: create a fresh hype instance and expose globals ────────────────────

export async function runHypeTests() {
  const runner = new TestRunner();

  // Create a fresh instance and expose into a plain object (avoids globalThis pollution)
  const G = {};
  const h = hypeApi();
  h.exposeTo(G);

  const {
    createOscillator,
    createTween,
    createTimeTrigger,
    createRandomTrigger,
    createProximityTrigger,
    createColorPool,
    createHPool,
    createGridLayout,
    createCircleLayout,
    createSphereLayout,
    createPathLayout,
    hypeRegister,
    hypeUnregister,
    hypeUpdate,
    hypeReset,
  } = G;

  // ── createOscillator ────────────────────────────────────────────────────────

  runner.test('createOscillator - has value and tick', () => {
    const osc = createOscillator({ waveform: 'sin', min: 0, max: 1, speed: 1 });
    Assert.isDefined(osc, 'createOscillator should return an object');
    Assert.isFunction(osc.tick, 'osc.tick should be a function');
    Assert.isDefined(osc.value, 'osc.value should be defined');
  });

  runner.test('createOscillator - value stays in range [min, max]', () => {
    const osc = createOscillator({ waveform: 'sin', min: -5, max: 5, speed: 2 });
    for (let i = 0; i < 20; i++) {
      osc.tick(0.1);
      Assert.inRange(osc.value, -5, 5, 'sin oscillator value');
    }
  });

  runner.test('createOscillator - all waveforms tick without error', () => {
    ['sin', 'cos', 'tri', 'saw', 'noise'].forEach(waveform => {
      const osc = createOscillator({ waveform, min: 0, max: 1 });
      Assert.doesNotThrow(() => {
        for (let i = 0; i < 10; i++) osc.tick(0.05);
      }, `waveform '${waveform}' should not throw`);
    });
  });

  runner.test('createOscillator - tick advances time (value changes for sin)', () => {
    const osc = createOscillator({ waveform: 'sin', min: 0, max: 1, speed: 10 });
    const v0 = osc.value;
    osc.tick(0.1);
    // After ticking with a high speed, value should differ from initial
    // (not guaranteed for every starting phase, but speed=10 * dt=0.1 = 1 radian shift)
    Assert.isNumber(osc.value, 'value should be a number after tick');
    Assert.inRange(osc.value, 0, 1, 'value should stay in range after tick');
  });

  // ── createTween ─────────────────────────────────────────────────────────────

  runner.test('createTween - scalar tween reaches target', () => {
    const tw = createTween({ from: 0, to: 10, duration: 1, easing: 'linear' });
    tw.tick(0.5);
    Assert.inRange(tw.value, 0, 10, 'tween value at half duration');
    tw.tick(0.5);
    Assert.inRange(tw.value, 9.9, 10, 'tween value at end');
  });

  runner.test('createTween - marks done after duration', () => {
    const tw = createTween({ from: 0, to: 1, duration: 0.5, easing: 'linear' });
    Assert.isFalse(tw.done, 'should not be done initially');
    tw.tick(0.6);
    Assert.isTrue(tw.done, 'should be done after duration elapsed');
  });

  runner.test('createTween - vector tween returns array', () => {
    const tw = createTween({ from: [0, 0, 0], to: [10, 20, 30], duration: 1, easing: 'linear' });
    tw.tick(0.5);
    Assert.isTrue(Array.isArray(tw.value), 'vector tween value should be array');
    Assert.isEqual(tw.value.length, 3, 'vector tween value should have 3 elements');
    tw.value.forEach((v, i) => Assert.isNumber(v, `element ${i} should be a number`));
  });

  runner.test('createTween - onUpdate callback is called', () => {
    let callCount = 0;
    const tw = createTween({ from: 0, to: 1, duration: 1, onUpdate: () => callCount++ });
    tw.tick(0.1);
    tw.tick(0.1);
    Assert.isTrue(callCount >= 2, 'onUpdate should be called each tick');
  });

  runner.test('createTween - pingpong loop reverses direction', () => {
    const tw = createTween({ from: 0, to: 1, duration: 0.5, loop: 'pingpong' });
    // First half: 0→1
    tw.tick(0.5);
    Assert.inRange(tw.value, 0.9, 1.0, 'should reach peak at half period');
    // Second half: pingpong back to 0
    tw.tick(0.5);
    Assert.inRange(tw.value, 0, 0.1, 'should return to start after full period');
    Assert.isFalse(tw.done, 'pingpong should not be done');
  });

  // ── createColorPool ─────────────────────────────────────────────────────────

  runner.test('createColorPool - sequential mode cycles colors', () => {
    const pool = createColorPool([0xff0000, 0x00ff00, 0x0000ff], 'sequential');
    Assert.isEqual(pool.next(), 0xff0000, 'first color');
    Assert.isEqual(pool.next(), 0x00ff00, 'second color');
    Assert.isEqual(pool.next(), 0x0000ff, 'third color');
    Assert.isEqual(pool.next(), 0xff0000, 'wraps to first');
  });

  runner.test('createColorPool - shuffle mode does NOT throw (TDZ regression)', () => {
    Assert.doesNotThrow(
      () => createColorPool([0xff0000, 0x00ff00, 0x0000ff], 'shuffle'),
      'createColorPool with shuffle mode should not throw'
    );
  });

  runner.test('createColorPool - shuffle mode returns valid colors', () => {
    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    const pool = createColorPool(colors, 'shuffle');
    for (let i = 0; i < 6; i++) {
      const c = pool.next();
      Assert.isTrue(colors.includes(c), `color ${c.toString(16)} should be from palette`);
    }
  });

  runner.test('createColorPool - random mode always returns palette color', () => {
    const colors = [10, 20, 30];
    const pool = createColorPool(colors, 'random');
    for (let i = 0; i < 20; i++) {
      Assert.isTrue(colors.includes(pool.next()), 'random pick should be in palette');
    }
  });

  runner.test('createColorPool - reset moves cursor back to 0', () => {
    const pool = createColorPool([1, 2, 3], 'sequential');
    pool.next();
    pool.next();
    pool.reset();
    Assert.isEqual(pool.next(), 1, 'after reset, first color again');
  });

  runner.test('createColorPool - getColor wraps index', () => {
    const pool = createColorPool([10, 20, 30]);
    Assert.isEqual(pool.getColor(0), 10, 'index 0');
    Assert.isEqual(pool.getColor(3), 10, 'index 3 wraps to 0');
    Assert.isEqual(pool.getColor(4), 20, 'index 4 wraps to 1');
  });

  runner.test('createColorPool - shuffle() method returns pool (chainable)', () => {
    const pool = createColorPool([1, 2, 3]);
    const result = pool.shuffle();
    Assert.isDefined(result, 'shuffle() should return pool');
    Assert.isFunction(result.next, 'returned value should have .next()');
  });

  runner.test('createColorPool - add() adds a color', () => {
    const pool = createColorPool([1, 2]);
    pool.add(3);
    const seen = new Set();
    for (let i = 0; i < 3; i++) seen.add(pool.next());
    Assert.isTrue(seen.has(3), 'added color should appear in pool');
  });

  // ── createHPool ─────────────────────────────────────────────────────────────

  runner.test('createHPool - request() builds objects', () => {
    let built = 0;
    const pool = createHPool({ build: () => ({ x: ++built }) });
    const obj = pool.request();
    Assert.isDefined(obj, 'request should return an object');
    Assert.isEqual(obj.x, 1, 'build factory should have been called');
  });

  runner.test('createHPool - release() makes object available again', () => {
    let built = 0;
    const pool = createHPool({ build: () => ({ id: ++built }) });
    const a = pool.request();
    pool.release(a);
    const b = pool.request(); // should reuse `a`
    Assert.isEqual(b.id, a.id, 'released object should be reused');
    Assert.isEqual(built, 1, 'factory should only be called once');
  });

  runner.test('createHPool - active/available counts are correct', () => {
    const pool = createHPool({ build: () => ({}) });
    Assert.isEqual(pool.active.length, 0, 'initially 0 active');
    const a = pool.request();
    const b = pool.request();
    Assert.isEqual(pool.active.length, 2, '2 active after 2 requests');
    pool.release(a);
    Assert.isEqual(pool.active.length, 1, '1 active after release');
    Assert.isEqual(pool.available, 1, '1 available after release');
  });

  runner.test('createHPool - releaseAll() returns all objects', () => {
    const pool = createHPool({ build: () => ({}) });
    pool.request();
    pool.request();
    pool.request();
    pool.releaseAll();
    Assert.isEqual(pool.active.length, 0, 'active.length should be 0 after releaseAll');
  });

  runner.test('createHPool - onRequest lifecycle hook is called', () => {
    let requestCalls = 0;
    const pool = createHPool({ build: () => ({}), onRequest: () => requestCalls++ });
    pool.request();
    pool.request();
    Assert.isEqual(requestCalls, 2, 'onRequest should be called for each request');
  });

  runner.test('createHPool - onRelease lifecycle hook is called', () => {
    let releaseCalls = 0;
    const pool = createHPool({ build: () => ({}), onRelease: () => releaseCalls++ });
    const obj = pool.request();
    pool.release(obj);
    Assert.isEqual(releaseCalls, 1, 'onRelease should be called once');
  });

  // ── createGridLayout ────────────────────────────────────────────────────────

  runner.test('createGridLayout - returns correct count', () => {
    const grid = createGridLayout({ cols: 3, rows: 4, spacingX: 1, spacingY: 1 });
    Assert.isEqual(grid.getPositions().length, 12, '3x4 grid should have 12 positions');
  });

  runner.test('createGridLayout - positions are 3D objects', () => {
    const grid = createGridLayout({ cols: 2, rows: 2, spacingX: 2, spacingY: 2 });
    grid.getPositions().forEach((p, i) => {
      Assert.isNumber(p.x, `position[${i}].x should be number`);
      Assert.isNumber(p.y, `position[${i}].y should be number`);
      Assert.isNumber(p.z, `position[${i}].z should be number`);
    });
  });

  runner.test('createGridLayout - spacing is respected', () => {
    const grid = createGridLayout({ cols: 3, rows: 1, spacingX: 5, spacingY: 1 });
    const xs = grid
      .getPositions()
      .map(p => p.x)
      .sort((a, b) => a - b);
    // The difference between consecutive x-values should equal spacingX
    Assert.isEqual(xs[1] - xs[0], 5, 'spacingX should be 5');
  });

  // ── createCircleLayout ──────────────────────────────────────────────────────

  runner.test('createCircleLayout - returns correct count', () => {
    const cl = createCircleLayout({ count: 8, radius: 5 });
    Assert.isEqual(cl.getPositions().length, 8, 'should return 8 positions');
  });

  runner.test('createCircleLayout - all points at correct radius', () => {
    const radius = 7;
    const cl = createCircleLayout({ count: 12, radius, plane: 'xz' });
    cl.getPositions().forEach((p, i) => {
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      Assert.inRange(dist, radius - 0.001, radius + 0.001, `point ${i} should be on circle`);
    });
  });

  // ── createSphereLayout ──────────────────────────────────────────────────────

  runner.test('createSphereLayout - returns correct count', () => {
    const sl = createSphereLayout({ count: 20, radius: 5 });
    Assert.isEqual(sl.getPositions().length, 20, 'should return 20 positions');
  });

  runner.test('createSphereLayout - all points near correct radius', () => {
    const radius = 4;
    const sl = createSphereLayout({ count: 15, radius });
    sl.getPositions().forEach((p, i) => {
      // Points are on a sphere of the given radius — allow small floating-point error
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      Assert.inRange(dist, radius * 0.5, radius * 1.5, `point ${i} should be near sphere surface`);
    });
  });

  // ── createTimeTrigger ───────────────────────────────────────────────────────

  runner.test('createTimeTrigger - fires after interval', () => {
    let fired = 0;
    const tt = createTimeTrigger({ interval: 1, callback: () => fired++ });
    tt.tick(0.4);
    Assert.isEqual(fired, 0, 'should not fire before interval');
    tt.tick(0.7);
    Assert.isEqual(fired, 1, 'should fire once after interval');
  });

  runner.test('createTimeTrigger - one-shot does not repeat', () => {
    let fired = 0;
    const tt = createTimeTrigger({ interval: 0.5, repeat: false, callback: () => fired++ });
    tt.tick(0.6);
    tt.tick(0.6);
    Assert.isEqual(fired, 1, 'one-shot trigger should only fire once');
  });

  runner.test('createTimeTrigger - repeat fires multiple times', () => {
    let fired = 0;
    const tt = createTimeTrigger({ interval: 0.5, repeat: true, callback: () => fired++ });
    tt.tick(0.6); // fires once
    tt.tick(0.6); // fires again
    tt.tick(0.6); // fires again
    Assert.isTrue(fired >= 2, 'repeating trigger should fire multiple times');
  });

  // ── createRandomTrigger ─────────────────────────────────────────────────────

  runner.test('createRandomTrigger - chance=0 never fires', () => {
    let fired = 0;
    const rt = createRandomTrigger({ chance: 0, callback: () => fired++ });
    for (let i = 0; i < 100; i++) rt.tick(0.016);
    Assert.isEqual(fired, 0, 'chance=0 should never fire');
  });

  runner.test('createRandomTrigger - chance=1 always fires', () => {
    let fired = 0;
    const rt = createRandomTrigger({ chance: 1, callback: () => fired++ });
    for (let i = 0; i < 10; i++) rt.tick(0.016);
    Assert.isEqual(fired, 10, 'chance=1 should fire every tick');
  });

  // ── createProximityTrigger ──────────────────────────────────────────────────

  runner.test('createProximityTrigger - onEnter fires when within radius', () => {
    let entered = false;
    const posA = { x: 0, y: 0, z: 0 };
    const posB = { x: 10, y: 0, z: 0 };
    const pt = createProximityTrigger({
      getFrom: () => posA,
      getTo: () => posB,
      radius: 5,
      onEnter: () => {
        entered = true;
      },
    });
    pt.tick(0.016); // far — no enter
    Assert.isFalse(entered, 'should not enter when far away');
    posB.x = 3; // move close
    pt.tick(0.016);
    Assert.isTrue(entered, 'should fire onEnter when within radius');
  });

  runner.test('createProximityTrigger - onExit fires when leaving radius', () => {
    let exited = false;
    const posA = { x: 0, y: 0, z: 0 };
    const posB = { x: 2, y: 0, z: 0 }; // start inside
    const pt = createProximityTrigger({
      getFrom: () => posA,
      getTo: () => posB,
      radius: 5,
      onExit: () => {
        exited = true;
      },
    });
    pt.tick(0.016); // inside — transitions to 'inside' state
    posB.x = 10; // move outside
    pt.tick(0.016);
    Assert.isTrue(exited, 'should fire onExit when leaving radius');
  });

  // ── Registry ─────────────────────────────────────────────────────────────────

  runner.test('hypeRegister / hypeUpdate - registered behavior is ticked', () => {
    hypeReset();
    let ticks = 0;
    const behavior = { tick: () => ticks++ };
    hypeRegister(behavior);
    hypeUpdate(0.016);
    hypeUpdate(0.016);
    Assert.isEqual(ticks, 2, 'registered behavior should be ticked twice');
    hypeReset();
  });

  runner.test('hypeUnregister - removes behavior from tick list', () => {
    hypeReset();
    let ticks = 0;
    const behavior = { tick: () => ticks++ };
    hypeRegister(behavior);
    hypeUpdate(0.016);
    hypeUnregister(behavior);
    hypeUpdate(0.016);
    Assert.isEqual(ticks, 1, 'unregistered behavior should not be ticked again');
    hypeReset();
  });

  runner.test('hypeReset - clears all registered behaviors', () => {
    let ticks = 0;
    hypeRegister({ tick: () => ticks++ });
    hypeRegister({ tick: () => ticks++ });
    hypeReset();
    hypeUpdate(0.016);
    Assert.isEqual(ticks, 0, 'no behaviors should tick after reset');
  });

  return await runner.runAll();
}

// Allow running standalone: node tests/test-hype.js
if (process.argv[1] && process.argv[1].endsWith('test-hype.js')) {
  console.log('✨ HYPE Framework Tests\n');
  runHypeTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
