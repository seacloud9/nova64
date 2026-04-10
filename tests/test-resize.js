// tests/test-resize.js
// Regression tests for resize behaviour — ensures:
// 1. gpu.resize() updates only the 3D renderer, NOT the framebuffer/overlay
// 2. The 2D framebuffer stays at the logical resolution so HUD content
//    fills the entire screen (scaled up by the GPU)
// 3. Framebuffer64.resize() still works as an isolated API
// 4. screenWidth/screenHeight always reflect the logical resolution

import { Framebuffer64 } from '../runtime/framebuffer.js';
import { stdApi } from '../runtime/api.js';
import { ScreenManager } from '../runtime/screens.js';

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
      this.results.push({ name: test.name, passed, error, duration: Date.now() - startTime });
    }
    const passed = this.results.filter(r => r.passed).length;
    console.log(`\n📊 Results: ${passed}/${this.results.length} passed`);
    return {
      total: this.results.length,
      passed,
      failed: this.results.length - passed,
      tests: this.results,
      errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })),
    };
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// Minimal mock gpu that mirrors the REAL gpu-threejs.js resize behaviour:
// resize() only touches the 3D renderer — fb and overlay stay at logical res.
function createMockGpu(w, h) {
  const fb = new Framebuffer64(w, h);
  return {
    fb,
    // Track the physical (renderer) size separately
    physicalW: w,
    physicalH: h,
    getFramebuffer() {
      return this.fb;
    },
    // Real gpu.resize() only changes the 3D renderer, NOT the framebuffer.
    resize(newW, newH) {
      this.physicalW = newW;
      this.physicalH = newH;
      // fb is intentionally NOT resized — stays at logical resolution
    },
  };
}

export async function runResizeTests() {
  const runner = new TestRunner();

  // ── Framebuffer64.resize() (standalone API) ───────────────────────────────

  runner.test('Framebuffer64.resize() updates width and height', () => {
    const fb = new Framebuffer64(640, 360);
    assert(fb.width === 640, 'initial width should be 640');
    assert(fb.height === 360, 'initial height should be 360');

    fb.resize(1280, 720);
    assert(fb.width === 1280, 'resized width should be 1280');
    assert(fb.height === 720, 'resized height should be 720');
  });

  runner.test('Framebuffer64.resize() allocates new pixel buffer', () => {
    const fb = new Framebuffer64(640, 360);
    const oldPixels = fb.pixels;
    assert(oldPixels.length === 640 * 360 * 4, 'initial pixel count');

    fb.resize(1280, 720);
    assert(fb.pixels.length === 1280 * 720 * 4, 'resized pixel count');
    assert(fb.pixels !== oldPixels, 'should be a new buffer');
  });

  runner.test('Framebuffer64.resize() produces a cleared buffer', () => {
    const fb = new Framebuffer64(10, 10);
    fb.pset(5, 5, 65535, 0, 0, 65535);
    assert(fb.pixels[(5 * 10 + 5) * 4] === 65535, 'pixel should be set');

    fb.resize(20, 20);
    for (let i = 0; i < fb.pixels.length; i++) {
      assert(fb.pixels[i] === 0, `pixel at ${i} should be 0 after resize`);
    }
  });

  // ── gpu.resize() does NOT change the framebuffer ──────────────────────────

  runner.test('gpu.resize() does NOT resize framebuffer', () => {
    const gpu = createMockGpu(640, 360);
    const fb = gpu.getFramebuffer();

    gpu.resize(1280, 720);

    // Framebuffer must stay at logical resolution
    assert(fb.width === 640, `fb.width should still be 640, got ${fb.width}`);
    assert(fb.height === 360, `fb.height should still be 360, got ${fb.height}`);
    assert(fb.pixels.length === 640 * 360 * 4, 'pixel buffer size should be unchanged');
    // Physical renderer size is updated
    assert(gpu.physicalW === 1280, 'physical width should be 1280');
    assert(gpu.physicalH === 720, 'physical height should be 720');
  });

  runner.test('fb reference is same object after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const fbBefore = gpu.getFramebuffer();

    gpu.resize(1920, 1080);

    const fbAfter = gpu.getFramebuffer();
    assert(fbBefore === fbAfter, 'fb should be the exact same object');
  });

  // ── HUD drawing stays at logical resolution after resize ──────────────────

  runner.test('cls() fills logical-sized buffer after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080); // physical resize

    g.cls(g.rgba8(255, 0, 0, 255));

    const fb = gpu.fb;
    assert(fb.pixels.length === 640 * 360 * 4, 'buffer should still be 640x360');
    assert(fb.pixels[0] > 0, 'R channel should be non-zero after cls');
    assert(fb.pixels[3] === 65535, 'A channel should be full');
  });

  runner.test('pset() draws at logical coords after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080);
    g.pset(320, 180, g.rgba8(0, 255, 0, 255)); // centre of 640x360

    const fb = gpu.fb;
    const idx = (180 * 640 + 320) * 4;
    assert(fb.pixels[idx + 1] > 0, 'G channel at (320,180) should be non-zero');
  });

  runner.test('rect() fills full logical area after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080);

    // Fill the entire logical screen
    g.rect(0, 0, 640, 360, g.rgba8(255, 0, 0, 255), true);

    const fb = gpu.fb;
    // Check last pixel of the logical buffer
    const lastIdx = (359 * 640 + 639) * 4;
    assert(fb.pixels[lastIdx] > 0, 'last pixel R should be filled');
    assert(fb.pixels[lastIdx + 3] === 65535, 'last pixel A should be full');
  });

  runner.test('print() works at logical coords after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080);

    let threw = false;
    try {
      g.print('Hello', 10, 10, g.rgba8(255, 255, 255, 255));
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'print() should not throw after gpu.resize()');
  });

  runner.test('line() clips to logical bounds after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080);

    let threw = false;
    try {
      g.line(0, 0, 639, 359, g.rgba8(255, 255, 0, 255));
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'line() should not throw after gpu.resize()');
  });

  // ── screenWidth / screenHeight stay at logical resolution ─────────────────

  runner.test('screenWidth() and screenHeight() exposed by stdApi', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    assert(typeof g.screenWidth === 'function', 'screenWidth should be a function');
    assert(typeof g.screenHeight === 'function', 'screenHeight should be a function');
    assert(g.screenWidth() === 640, 'initial screenWidth should be 640');
    assert(g.screenHeight() === 360, 'initial screenHeight should be 360');
  });

  runner.test('screenWidth/Height stay at logical res after gpu.resize()', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    gpu.resize(1920, 1080);

    // Should still report logical resolution, NOT physical
    assert(g.screenWidth() === 640, `screenWidth should be 640, got ${g.screenWidth()}`);
    assert(g.screenHeight() === 360, `screenHeight should be 360, got ${g.screenHeight()}`);
  });

  // ── ScreenManager uses dynamic dimensions ─────────────────────────────────

  runner.test('ScreenManager._drawTransition uses globalThis.screenWidth/Height', () => {
    const savedRect = globalThis.rect;
    const savedRgba8 = globalThis.rgba8;
    const savedSW = globalThis.screenWidth;
    const savedSH = globalThis.screenHeight;

    let lastRectArgs = null;
    globalThis.rect = (...args) => {
      lastRectArgs = args;
    };
    globalThis.rgba8 = (r, g, b, a) => ({ r, g, b, a });
    // screenWidth/Height should return the logical resolution
    globalThis.screenWidth = () => 640;
    globalThis.screenHeight = () => 360;

    try {
      const sm = new ScreenManager();
      sm.addScreen('a', { draw() {}, enter() {}, exit() {} });
      sm.addScreen('b', { draw() {}, enter() {} });
      sm.switchTo('a');
      sm.transitionTo('b', 'fade', 0.4);

      sm.update(0.1);
      sm.draw();

      assert(lastRectArgs !== null, 'rect should have been called during fade');
      assert(lastRectArgs[2] === 640, `rect width should be 640, got ${lastRectArgs[2]}`);
      assert(lastRectArgs[3] === 360, `rect height should be 360, got ${lastRectArgs[3]}`);
    } finally {
      globalThis.rect = savedRect;
      globalThis.rgba8 = savedRgba8;
      globalThis.screenWidth = savedSW;
      globalThis.screenHeight = savedSH;
    }
  });

  // ── Multiple gpu.resize() calls don't affect fb ───────────────────────────

  runner.test('Multiple gpu.resize() calls leave fb unchanged', () => {
    const gpu = createMockGpu(640, 360);
    const api = stdApi(gpu);
    const g = {};
    api.exposeTo(g);

    const sizes = [
      [800, 600],
      [1280, 720],
      [320, 240],
      [1920, 1080],
    ];

    for (const [w, h] of sizes) {
      gpu.resize(w, h);
      // Framebuffer stays at logical resolution
      assert(gpu.fb.width === 640, `fb.width should still be 640 after resize to ${w}x${h}`);
      assert(gpu.fb.height === 360, `fb.height should still be 360 after resize to ${w}x${h}`);
      assert(g.screenWidth() === 640, `screenWidth() should still be 640`);
      assert(g.screenHeight() === 360, `screenHeight() should still be 360`);

      // Drawing should still work at logical coords
      g.cls(g.rgba8(0, 0, 0, 255));
      g.pset(0, 0, g.rgba8(255, 255, 255, 255));
      assert(gpu.fb.pixels[0] > 0, 'pixel at (0,0) should be set');
    }
  });

  return await runner.runAll();
}
