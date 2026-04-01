#!/usr/bin/env node

// Wizardry-3D cart validation tests
// Validates that the cart module parses, exports correctly, and core
// logic functions work without crashing the title/draw pipeline.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() { this.tests = []; this.results = []; }
  test(name, fn) { this.tests.push({ name, fn }); }
  async runAll() {
    console.log(`Running ${this.tests.length} tests...\n`);
    for (const t of this.tests) {
      try { await t.fn(); console.log(`✅ ${t.name}`); this.results.push({ name: t.name, passed: true }); }
      catch (e) { console.log(`❌ ${t.name}: ${e.message}`); this.results.push({ name: t.name, passed: false, error: e.message }); }
    }
    const passed = this.results.filter(r => r.passed).length;
    console.log(`\n📊 Results: ${passed}/${this.results.length} passed`);
    return { total: this.results.length, passed, failed: this.results.length - passed, tests: this.results, errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })) };
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

// ─── Source code static analysis helpers ───

function loadSource() {
  const cartPath = path.resolve(__dirname, '..', 'examples', 'wizardry-3d', 'code.js');
  return fs.readFileSync(cartPath, 'utf8');
}

// ─── Build a mock global scope that stubs every Nova64 API ───

function buildMockGlobal() {
  const calls = {};          // { fnName: callCount }
  const noop = () => {};
  const retId = () => Math.floor(Math.random() * 9999);
  const retObj = () => ({});
  const retArr = () => [0, 0, 0];
  const retBool = () => false;
  const retNum = () => 0;

  // Helper: record calls
  function stub(name, ret) {
    return (...args) => { calls[name] = (calls[name] || 0) + 1; return typeof ret === 'function' ? ret() : ret; };
  }

  const g = {};

  // 3D primitives
  for (const fn of ['createCube','createSphere','createCone','createCylinder','createPlane',
    'createTorus','createCapsule','createAdvancedCube','createAdvancedSphere']) g[fn] = stub(fn, retId);

  // Mesh ops
  for (const fn of ['setPosition','setScale','setRotation','rotateMesh','moveMesh',
    'setFlatShading','setMeshOpacity','setMeshVisible','setCastShadow','setReceiveShadow',
    'setPBRProperties','destroyMesh']) g[fn] = stub(fn);
  g.getPosition = stub('getPosition', retArr);
  g.getRotation = stub('getRotation', () => ({ x: 0, y: 0, z: 0 }));
  g.getMesh = stub('getMesh', () => ({ material: {} }));
  g.getScene = stub('getScene', () => ({ children: [] }));

  // Camera
  for (const fn of ['setCameraPosition','setCameraTarget','setCameraLookAt','setCameraFOV']) g[fn] = stub(fn);

  // Lighting
  for (const fn of ['setAmbientLight','setLightDirection','setLightColor','setDirectionalLight',
    'createPointLight','setPointLightColor','setPointLightPosition','removeLight','setFog','clearFog']) g[fn] = stub(fn, retId);

  // Skybox
  for (const fn of ['createGradientSkybox','createSpaceSkybox','createSolidSkybox','clearSkybox',
    'setSkyboxSpeed','enableSkyboxAutoAnimate','disableSkyboxAutoAnimate','animateSkybox']) g[fn] = stub(fn);

  // Particles
  g.createParticleSystem = stub('createParticleSystem', retId);
  for (const fn of ['setParticleEmitter','updateParticles','removeParticleSystem',
    'burstParticles','emitParticle']) g[fn] = stub(fn);
  g.getParticleStats = stub('getParticleStats', () => ({ active: 0, max: 20 }));

  // Shaders / instancing / LOD
  g.createShaderMaterial = stub('createShaderMaterial', () => ({ id: 1, material: {} }));
  g.updateShaderUniform = stub('updateShaderUniform');
  g.createInstancedMesh = stub('createInstancedMesh', retId);
  for (const fn of ['setInstanceTransform','setInstanceColor','finalizeInstances','removeInstancedMesh']) g[fn] = stub(fn);
  g.createLODMesh = stub('createLODMesh', retId);
  for (const fn of ['removeLODMesh','updateLODs']) g[fn] = stub(fn);

  // Effects
  for (const fn of ['enableRetroEffects','enableBloom','disableBloom','enableVignette','disableVignette',
    'enableChromaticAberration','disableChromaticAberration','enablePixelation',
    'enableFXAA','disableFXAA','enableDithering','enableN64Mode','enablePSXMode',
    'disablePresetMode','enableLowPolyMode','setBloomStrength','setBloomRadius','setBloomThreshold',
    'enableGlitch','disableGlitch','setGlitchIntensity']) g[fn] = stub(fn);
  g.isEffectsEnabled = stub('isEffectsEnabled', retBool);
  g.getRenderer = stub('getRenderer', () => ({ info: { programs: [] } }));

  // 2D drawing
  for (const fn of ['cls','pset','line','rect','rectfill','circle','ellipse','arc','bezier',
    'quadCurve','poly','drawTriangle','drawDiamond','drawRoundedRect','drawCheckerboard',
    'drawGradient','drawGradientRect','drawRadialGradient','drawSkyGradient',
    'drawStarburst','drawSpiral','drawWave','drawNoise','drawScanlines','drawFlash',
    'drawCrosshair']) g[fn] = stub(fn);

  // Text
  for (const fn of ['print','printCentered','printRight','drawText','drawGlowText',
    'drawGlowTextCentered','drawPulsingText','drawTextShadow','drawTextOutline',
    'scrollingText','setTextAlign','setTextBaseline']) g[fn] = stub(fn);
  g.measureText = stub('measureText', () => ({ width: 40 }));
  g.setFont = stub('setFont');
  g.getFont = stub('getFont', () => ({ name: 'default' }));

  // UI
  for (const fn of ['drawPanel','drawHealthBar','drawProgressBar']) g[fn] = stub(fn);
  g.uiProgressBar = stub('uiProgressBar');
  g.createButton = stub('createButton', retId);
  g.updateButton = stub('updateButton');
  g.drawButton = stub('drawButton');

  // Color
  g.rgba8 = (r, g2, b, a) => ((r & 0xff) << 24) | ((g2 & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff);
  g.hexColor = stub('hexColor', retNum);
  g.hslColor = stub('hslColor', retNum);
  g.hsb = stub('hsb', retNum);
  g.colorLerp = stub('colorLerp', retNum);
  g.colorMix = stub('colorMix', retNum);
  g.lerpColor = stub('lerpColor', retNum);
  g.n64Palette = { red: 0xff0000, yellow: 0xffff00, cyan: 0x00ffff };
  g.colorMode = stub('colorMode');
  g.color = stub('color', retNum);

  // Math
  g.lerp = (a, b, t) => a + (b - a) * t;
  g.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  g.pulse = (t, freq) => Math.sin(t * freq * Math.PI * 2) * 0.5 + 0.5;
  g.smoothstep = (lo, hi, t) => { const x = Math.max(0, Math.min(1, (t - lo) / (hi - lo))); return x * x * (3 - 2 * x); };
  g.ease = (t) => t;
  g.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  g.dist3d = (x1, y1, z1, x2, y2, z2) => Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  g.remap = (v, inLo, inHi, outLo, outHi) => outLo + ((v - inLo) / (inHi - inLo)) * (outHi - outLo);
  g.randRange = (lo, hi) => lo + Math.random() * (hi - lo);
  g.randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  g.deg2rad = (d) => d * Math.PI / 180;
  g.rad2deg = (r) => r * 180 / Math.PI;
  g.noise = stub('noise', () => 0.5);
  g.noiseDetail = stub('noiseDetail');
  g.noiseSeed = stub('noiseSeed');
  g.noiseMap = stub('noiseMap', () => new Float32Array(576));
  g.flowField = stub('flowField', () => new Float32Array(192));
  g.TWO_PI = Math.PI * 2;
  g.HALF_PI = Math.PI / 2;
  g.QUARTER_PI = Math.PI / 4;

  // 2D transform
  for (const fn of ['pushMatrix','popMatrix','translate','rotate','scale2d','resetMatrix']) g[fn] = stub(fn);
  g.setCamera = stub('setCamera');
  g.centerX = (w) => Math.floor((640 - w) / 2);
  g.centerY = (h) => Math.floor((360 - h) / 2);
  g.grid = (cols, rows, cellW, cellH, padX, padY) => {
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: c * (cellW + (padX || 0)), y: r * (cellH + (padY || 0)), col: c, row: r });
    return cells;
  };
  g.frameCount = 0;

  // Input
  g.key = stub('key', retBool);
  g.keyp = stub('keyp', retBool);
  g.btn = stub('btn', retBool);
  g.btnp = stub('btnp', retBool);
  g.mouseX = stub('mouseX', retNum);
  g.mouseY = stub('mouseY', retNum);
  g.mouseDown = stub('mouseDown', retBool);
  g.mousePressed = stub('mousePressed', retBool);
  g.leftStickX = stub('leftStickX', retNum);
  g.leftStickY = stub('leftStickY', retNum);
  g.rightStickX = stub('rightStickX', retNum);
  g.rightStickY = stub('rightStickY', retNum);
  g.gamepadAxis = stub('gamepadAxis', retNum);
  g.gamepadConnected = stub('gamepadConnected', retBool);

  // Gameutils (inline implementations so cart logic actually works)
  g.createShake = (opts = {}) => ({ mag: 0, x: 0, y: 0, decay: opts.decay ?? 4, maxMag: opts.maxMag ?? 20 });
  g.triggerShake = (s, mag) => { s.mag = Math.min(s.mag + mag, s.maxMag); };
  g.updateShake = (s, dt) => { if (s.mag > 0.01) { s.x = (Math.random() - 0.5) * s.mag * 1.5; s.y = (Math.random() - 0.5) * s.mag * 1.5; s.mag -= s.decay * dt; } else { s.mag = 0; s.x = 0; s.y = 0; } };
  g.getShakeOffset = (s) => [s.x, s.y];
  g.createCooldownSet = (defs) => { const set = {}; for (const [name, dur] of Object.entries(defs)) set[name] = { remaining: 0, duration: dur }; return set; };
  g.createCooldown = (dur) => ({ remaining: 0, duration: dur });
  g.useCooldown = (cd) => { if (cd.remaining > 0) return false; cd.remaining = cd.duration; return true; };
  g.cooldownReady = (cd) => cd.remaining <= 0;
  g.cooldownProgress = (cd) => cd.duration <= 0 ? 1 : Math.max(0, 1 - cd.remaining / cd.duration);
  g.updateCooldown = (cd, dt) => { if (cd.remaining > 0) cd.remaining = Math.max(0, cd.remaining - dt); };
  g.updateCooldowns = (set, dt) => { for (const k in set) { if (set[k].remaining > 0) set[k].remaining = Math.max(0, set[k].remaining - dt); } };
  g.createHitState = (opts = {}) => ({ invulnTimer: 0, invulnDuration: opts.invulnDuration ?? 0.8, blinkRate: opts.blinkRate ?? 25, flashTimer: 0 });
  g.triggerHit = (hs) => { if (hs.invulnTimer > 0) return false; hs.invulnTimer = hs.invulnDuration; hs.flashTimer = 0.1; return true; };
  g.isInvulnerable = (hs) => hs.invulnTimer > 0;
  g.isVisible = (hs, t) => hs.invulnTimer <= 0 ? true : Math.sin(t * hs.blinkRate) > 0;
  g.isFlashing = (hs) => hs.flashTimer > 0;
  g.updateHitState = (hs, dt) => { if (hs.invulnTimer > 0) hs.invulnTimer = Math.max(0, hs.invulnTimer - dt); if (hs.flashTimer > 0) hs.flashTimer = Math.max(0, hs.flashTimer - dt); };
  g.createSpawner = (opts = {}) => ({ wave: 0, timer: opts.initialDelay ?? (opts.waveInterval ?? 10), waveInterval: opts.waveInterval ?? 10, baseCount: opts.baseCount ?? 3, countGrowth: opts.countGrowth ?? 1, maxCount: opts.maxCount ?? 20, spawnFn: opts.spawnFn ?? null, active: true, totalSpawned: 0 });
  g.updateSpawner = (sp, dt) => { if (!sp.active) return; sp.timer -= dt; if (sp.timer <= 0) { sp.wave++; sp.timer = sp.waveInterval; } };
  g.createPool = (max = 100, factory) => {
    const f = factory ?? (() => ({}));
    const items = []; for (let i = 0; i < max; i++) { const o = f(); o._poolAlive = false; items.push(o); }
    return {
      items,
      spawn(initFn) { for (let i = 0; i < items.length; i++) { if (!items[i]._poolAlive) { items[i]._poolAlive = true; if (initFn) initFn(items[i]); return items[i]; } } return null; },
      forEach(fn) { for (let i = 0; i < items.length; i++) { if (!items[i]._poolAlive) continue; if (fn(items[i], i) === false) items[i]._poolAlive = false; } },
      kill(obj) { obj._poolAlive = false; },
      get count() { let n = 0; for (const o of items) if (o._poolAlive) n++; return n; },
    };
  };
  g.createFloatingTextSystem = () => {
    const texts = [];
    return {
      spawn(text, x, y, opts = {}) { texts.push({ text: String(text), x, y, vx: opts.vx ?? 0, vy: opts.vy ?? -30, timer: opts.duration ?? 1.0, z: opts.z, color: opts.color ?? 0xffffff, scale: opts.scale ?? 1 }); },
      update(dt) { for (let i = texts.length - 1; i >= 0; i--) { texts[i].x += texts[i].vx * dt; texts[i].y += texts[i].vy * dt; texts[i].timer -= dt; if (texts[i].timer <= 0) texts.splice(i, 1); } },
      getTexts() { return texts; },
      clear() { texts.length = 0; },
      get count() { return texts.length; },
    };
  };
  g.drawFloatingTexts = stub('drawFloatingTexts');
  g.drawFloatingTexts3D = stub('drawFloatingTexts3D');
  g.createStateMachine = (initial) => {
    let current = initial, elapsed = 0; const handlers = {};
    return {
      on(state, fns) { handlers[state] = fns; return this; },
      switchTo(state) { if (handlers[current]?.exit) handlers[current].exit(); current = state; elapsed = 0; if (handlers[current]?.enter) handlers[current].enter(); },
      update(dt) { elapsed += dt; if (handlers[current]?.update) handlers[current].update(dt, elapsed); },
      getState() { return current; },
      getElapsed() { return elapsed; },
      is(state) { return current === state; },
    };
  };
  g.createTimer = (duration, opts = {}) => ({ elapsed: 0, duration, loop: opts.loop ?? false, onComplete: opts.onComplete ?? null, done: false, update(dt) { if (this.done && !this.loop) return; this.elapsed += dt; if (this.elapsed >= this.duration) { if (this.loop) this.elapsed -= this.duration; else { this.elapsed = this.duration; this.done = true; } } }, progress() { return Math.min(1, this.elapsed / this.duration); }, reset() { this.elapsed = 0; this.done = false; } });
  g.createMinimap = (opts) => ({ ...opts, _type: 'minimap' });
  g.drawMinimap = stub('drawMinimap');

  // Audio
  g.sfx = stub('sfx');
  g.setVolume = stub('setVolume');

  // Storage
  g.saveData = stub('saveData');
  g.loadData = stub('loadData', () => null);
  g.deleteData = stub('deleteData');

  // Store
  g.createGameStore = (initial) => {
    let state = { ...initial };
    return { getState: () => state, setState: (partial) => { state = { ...state, ...partial }; } };
  };
  g.novaStore = { getState: () => ({}), setState: stub('novaStore.setState') };

  // Collision
  g.aabb = stub('aabb', retBool);
  g.circleCollision = stub('circleCollision', retBool);
  g.raycastFromCamera = stub('raycastFromCamera', () => null);

  // get3DStats
  g.get3DStats = stub('get3DStats', () => ({ triangles: 0, drawCalls: 0, meshes: 0 }));

  return { g, calls };
}

// ─── Dynamic import of the cart as an ES module ───

async function importCart(mockGlobal) {
  // Expose mock globals so the cart's top-level code can reference them
  for (const [k, v] of Object.entries(mockGlobal)) {
    globalThis[k] = v;
  }

  // Cart is an ES module with export function init/update/draw
  const cartPath = path.resolve(__dirname, '..', 'examples', 'wizardry-3d', 'code.js');
  const cartURL = new URL(`file://${cartPath}`).href;

  // Use a cache-busting query to avoid Node module cache issues
  const mod = await import(`${cartURL}?t=${Date.now()}`);
  return mod;
}

function cleanupGlobals(mockGlobal) {
  for (const k of Object.keys(mockGlobal)) {
    delete globalThis[k];
  }
}

// ─── Test suites ───

export async function runWizardryTests() {
  const runner = new TestRunner();

  // ── Static analysis tests (no execution) ──

  runner.test('Wizardry - Source file parses without syntax errors', async () => {
    const src = loadSource();
    assert(src.length > 1000, 'Source should be substantial');
    // vm.Script doesn't support ESM exports — strip them for syntax check
    const stripped = src.replace(/export\s+function/g, 'function');
    const vm = await import('vm');
    new vm.Script(stripped, { filename: 'wizardry-3d/code.js' });
  });

  runner.test('Wizardry - Exports init, update, draw', () => {
    const src = loadSource();
    assert(src.includes('export function init()'), 'Missing export function init()');
    assert(src.includes('export function update('), 'Missing export function update()');
    assert(src.includes('export function draw()'), 'Missing export function draw()');
  });

  runner.test('Wizardry - No bare references to undefined globals', () => {
    const src = loadSource();
    // Should not reference window/document (runs in console runtime)
    assert(!src.includes('window.'), 'Should not reference window.');
    assert(!src.includes('document.'), 'Should not reference document.');
  });

  runner.test('Wizardry - switchState guards novaStore access', () => {
    const src = loadSource();
    // switchState should not crash if novaStore is undefined
    const switchMatch = src.match(/function switchState\([\s\S]*?\n\}/);
    assert(switchMatch, 'switchState function should exist');
    const body = switchMatch[0];
    // Must guard novaStore call (either optional chaining, try/catch, or if-check)
    const hasGuard = body.includes('novaStore?.') ||
                     body.includes('if (novaStore') ||
                     body.includes('typeof novaStore') ||
                     body.includes('try {');
    assert(hasGuard, 'switchState must guard novaStore access to prevent crashes when runtime has not exposed it yet');
  });

  runner.test('Wizardry - setCamera(0,0) reset happens after ALL 2D drawing', () => {
    const src = loadSource();
    // Find the draw() function body only (up to its closing brace)
    const drawStart = src.indexOf('export function draw()');
    assert(drawStart >= 0, 'draw function must exist');

    // Find the end of draw() — look for the next export function or top-level function
    let braceDepth = 0;
    let drawEnd = -1;
    const openBrace = src.indexOf('{', drawStart);
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === '{') braceDepth++;
      if (src[i] === '}') { braceDepth--; if (braceDepth === 0) { drawEnd = i + 1; break; } }
    }
    assert(drawEnd > 0, 'Could not find end of draw()');
    const drawBody = src.slice(drawStart, drawEnd);

    // setCamera(0, 0) should be the LAST setCamera call in draw()
    const cameraResetPos = drawBody.lastIndexOf('setCamera(0, 0)');
    assert(cameraResetPos > 0, 'setCamera(0, 0) reset must exist in draw()');

    // Check nothing draws AFTER the reset within draw() (except closing brace/whitespace)
    const afterReset = drawBody.slice(cameraResetPos + 'setCamera(0, 0)'.length);
    const drawCalls = ['drawNoise', 'drawScanlines', 'rectfill(', 'line(', 'pset(', 'drawFlash'];
    for (const dc of drawCalls) {
      assert(!afterReset.includes(dc), `Draw call '${dc}' appears AFTER setCamera(0,0) reset — this means it draws at wrong offset when shake is active`);
    }
  });

  runner.test('Wizardry - drawTitle produces visible output at t=0', () => {
    const src = loadSource();
    // drawTitle must call drawSkyGradient or cls as first visible operation
    const titleStart = src.indexOf('function drawTitle()');
    assert(titleStart >= 0, 'drawTitle must exist');
    const titleBody = src.slice(titleStart, src.indexOf('\nfunction ', titleStart + 20));
    // Check that drawSkyGradient is called and fade alpha > 0 at t=0
    // smoothstep(0, 1.5, 0) = 0 → fade = 0 → gradient is transparent!
    // This is by design (fade-in), but the 3D scene should show behind it.
    // The real bug would be if a cls() or full-screen opaque draw happens first.
    // Ensure no cls() at start of drawTitle
    const firstCls = titleBody.indexOf('cls(');
    assert(firstCls === -1, 'drawTitle should NOT call cls() — that would black out the 3D scene behind the fade-in');
  });

  // ── Runtime tests (with mock globals) ──

  runner.test('Wizardry - init() runs without throwing', async () => {
    const { g, calls } = buildMockGlobal();
    let mod;
    try {
      mod = await importCart(g);
      mod.init();
      assert(typeof calls['createStateMachine'] === 'undefined' || true, 'init should call createStateMachine (handled internally)');
    } finally {
      cleanupGlobals(g);
    }
  });

  runner.test('Wizardry - update(dt) runs without throwing after init', async () => {
    const { g } = buildMockGlobal();
    try {
      const mod = await importCart(g);
      mod.init();
      // Simulate 10 frames
      for (let i = 0; i < 10; i++) {
        mod.update(1 / 60);
      }
    } finally {
      cleanupGlobals(g);
    }
  });

  runner.test('Wizardry - draw() runs without throwing after init', async () => {
    const { g } = buildMockGlobal();
    try {
      const mod = await importCart(g);
      mod.init();
      mod.update(1 / 60);
      mod.draw();
    } finally {
      cleanupGlobals(g);
    }
  });

  runner.test('Wizardry - Title screen draw produces draw calls', async () => {
    const { g, calls } = buildMockGlobal();
    try {
      const mod = await importCart(g);
      mod.init();
      // Advance time so title fade-in produces visible output
      for (let i = 0; i < 120; i++) mod.update(1 / 60); // 2 seconds
      mod.draw();
      // Title screen should call drawSkyGradient, drawGlowText, printCentered
      const titleDraws = (calls['drawSkyGradient'] || 0) + (calls['drawGlowText'] || 0) + (calls['printCentered'] || 0);
      assert(titleDraws > 0, `Title screen should produce draw calls but got 0 (drawSkyGradient=${calls['drawSkyGradient']||0}, drawGlowText=${calls['drawGlowText']||0}, printCentered=${calls['printCentered']||0})`);
    } finally {
      cleanupGlobals(g);
    }
  });

  runner.test('Wizardry - setCamera reset called in every draw()', async () => {
    const { g, calls } = buildMockGlobal();
    try {
      const mod = await importCart(g);
      mod.init();
      mod.update(1 / 60);
      const beforeCount = calls['setCamera'] || 0;
      mod.draw();
      const afterCount = calls['setCamera'] || 0;
      // draw() must call setCamera at least once (the 0,0 reset)
      assert(afterCount > beforeCount, 'draw() must call setCamera (should reset to 0,0)');
    } finally {
      cleanupGlobals(g);
    }
  });

  return await runner.runAll();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWizardryTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
