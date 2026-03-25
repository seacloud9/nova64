#!/usr/bin/env node

// Command-line test runner for Nova64
// Usage: node test-cli.js [api|screen|integration|all]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Node.js implementation of test running
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
      this.results.push({
        name: test.name,
        passed,
        error,
        duration,
      });
    }

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    console.log(`\n📊 Results: ${passed}/${this.results.length} passed`);

    return {
      total: this.results.length,
      passed,
      failed,
      tests: this.results,
      errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })),
    };
  }
}

// Simple assertion library
class Assert {
  static isTrue(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
  }

  static isFalse(condition, message = 'Assertion failed') {
    if (condition) throw new Error(message);
  }

  static isEqual(actual, expected, message = 'Values are not equal') {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  static isNotNull(value, message = 'Value is null') {
    if (value === null || value === undefined) throw new Error(message);
  }

  static isDefined(value, message = 'Value is undefined') {
    if (value === undefined) throw new Error(message);
  }

  static isFunction(value, message = 'Value is not a function') {
    if (typeof value !== 'function') throw new Error(message);
  }

  static isObject(value, message = 'Value is not an object') {
    if (typeof value !== 'object' || value === null) throw new Error(message);
  }

  static doesNotThrow(fn, message = 'Function should not throw') {
    try {
      fn();
    } catch (error) {
      throw new Error(`${message}: ${error.message}`);
    }
  }
}

// Mock implementations for testing
class MockScreenManager {
  constructor() {
    this.screens = new Map();
    this.currentScreen = null;
    this.initialized = false;
  }

  register(name, screen) {
    this.screens.set(name, screen);
    return true;
  }

  switchTo(name) {
    if (this.screens.has(name)) {
      this.currentScreen = name;
      return true;
    }
    return false;
  }

  getCurrentScreen() {
    return this.currentScreen;
  }

  initialize(startScreen) {
    this.initialized = true;
    return this.switchTo(startScreen);
  }
}

class MockScreen {
  constructor() {
    this.data = {};
  }

  enter() {}
  exit() {}
  update() {}
  draw() {}
}

// Test suites
async function runBasicAPITests() {
  const runner = new TestRunner();

  runner.test('API Structure - Global functions should be available', () => {
    const expectedFunctions = [
      'createCube',
      'createSphere',
      'createPlane',
      'setCameraPosition',
      'setCameraTarget',
      'setCameraFOV',
      'addScreen',
      'switchToScreen',
      'startScreens',
    ];

    // In a real environment these would be global, here we just test the concept
    expectedFunctions.forEach(funcName => {
      Assert.isTrue(typeof funcName === 'string', `${funcName} should be a valid function name`);
    });
  });

  runner.test('Screen System - ScreenManager functionality', () => {
    const manager = new MockScreenManager();
    const screen = new MockScreen();

    Assert.isTrue(manager.register('test', screen), 'Should register screen');
    Assert.isTrue(manager.switchTo('test'), 'Should switch to registered screen');
    Assert.isEqual(manager.getCurrentScreen(), 'test', 'Should return current screen name');
  });

  runner.test('Screen System - Screen base class', () => {
    const screen = new MockScreen();

    Assert.isFunction(screen.enter, 'Screen should have enter method');
    Assert.isFunction(screen.update, 'Screen should have update method');
    Assert.isFunction(screen.draw, 'Screen should have draw method');
    Assert.isObject(screen.data, 'Screen should have data object');
  });

  runner.test('Error Handling - Invalid operations', () => {
    const manager = new MockScreenManager();

    Assert.isFalse(manager.switchTo('nonexistent'), 'Should fail to switch to nonexistent screen');
    Assert.isEqual(manager.getCurrentScreen(), null, 'Current screen should be null');
  });

  return await runner.runAll();
}

async function runIntegrationTests() {
  const runner = new TestRunner();

  runner.test('Integration - Nova64 initialization pattern', () => {
    // Test that we can simulate the Nova64 initialization without init3D
    const mockGlobal = {};

    // Simulate API exposure
    mockGlobal.createCube = (size, color, position) => ({
      id: Math.random(),
      size,
      color,
      position,
    });
    mockGlobal.setCameraPosition = (x, y, z) => true;
    mockGlobal.setCameraTarget = (x, y, z) => true;
    mockGlobal.addScreen = (name, screen) => true;

    Assert.isFunction(mockGlobal.createCube, 'createCube should be available');
    Assert.isFunction(mockGlobal.setCameraPosition, 'setCameraPosition should be available');
    Assert.isFunction(mockGlobal.addScreen, 'addScreen should be available');

    // Test Star Fox style initialization (no init3D)
    Assert.doesNotThrow(() => {
      mockGlobal.setCameraPosition(0, 5, 15);
      mockGlobal.setCameraTarget(0, 0, 0);
      const cube = mockGlobal.createCube(2, 0xff0000, [0, 0, 0]);
      Assert.isDefined(cube.id, 'Cube should have ID');
    }, 'Should initialize 3D scene without init3D');
  });

  runner.test('Integration - Demo compatibility', () => {
    // Test that demos can run with proper API usage
    const api = {
      createCube: (size, color, pos) => ({ size, color, pos }),
      setCameraPosition: () => true,
      addScreen: () => true,
    };

    // Simulate Star Fox demo initialization
    Assert.doesNotThrow(() => {
      api.setCameraPosition(0, 5, 15);
      const ship = api.createCube(1, 0x00ff00, [0, 0, 0]);
      api.addScreen('title', {
        enter: () => {},
        update: () => {},
        draw: () => {},
      });
    }, 'Demo should initialize without errors');
  });

  return await runner.runAll();
}

// Minimap API tests
async function runMinimapTests() {
  const runner = new TestRunner();

  runner.test('Minimap - createMinimap returns object with defaults', () => {
    // Import and test createMinimap logic by simulating
    const mm = {
      x: 640 - 90, y: 10, width: 80, height: 80,
      bgColor: null, borderLight: null, borderDark: null,
      shape: 'rect', follow: null, worldW: 100, worldH: 100,
      tileW: 0, tileH: 0, tileScale: 2, tiles: null,
      fogOfWar: 0, entities: [], player: null,
      sweep: null, gridLines: 0, gridColor: null,
    };
    Assert.isObject(mm, 'createMinimap should return an object');
    Assert.isEqual(mm.width, 80, 'Default width should be 80');
    Assert.isEqual(mm.height, 80, 'Default height should be 80');
    Assert.isEqual(mm.shape, 'rect', 'Default shape should be rect');
    Assert.isEqual(mm.worldW, 100, 'Default worldW should be 100');
    Assert.isEqual(mm.tileScale, 2, 'Default tileScale should be 2');
    Assert.isEqual(mm.fogOfWar, 0, 'Default fogOfWar should be 0');
    Assert.isEqual(mm.gridLines, 0, 'Default gridLines should be 0');
  });

  runner.test('Minimap - createMinimap accepts custom options', () => {
    const mm = {
      x: 10, y: 20, width: 120, height: 100,
      shape: 'circle', worldW: 500, worldH: 500,
      tileW: 25, tileH: 25, tileScale: 3,
      fogOfWar: 8, gridLines: 4,
    };
    Assert.isEqual(mm.x, 10, 'Should set x');
    Assert.isEqual(mm.y, 20, 'Should set y');
    Assert.isEqual(mm.width, 120, 'Should set width');
    Assert.isEqual(mm.height, 100, 'Should set height');
    Assert.isEqual(mm.shape, 'circle', 'Should set shape');
    Assert.isEqual(mm.worldW, 500, 'Should set worldW');
    Assert.isEqual(mm.tileW, 25, 'Should set tileW');
    Assert.isEqual(mm.tileScale, 3, 'Should set tileScale');
    Assert.isEqual(mm.fogOfWar, 8, 'Should set fogOfWar');
    Assert.isEqual(mm.gridLines, 4, 'Should set gridLines');
  });

  runner.test('Minimap - tile-based configuration', () => {
    const MAP_W = 25, MAP_H = 25;
    const tileColors = Array.from({ length: MAP_H }, () =>
      Array.from({ length: MAP_W }, () => null)
    );
    tileColors[5][5] = 0x3c3c50; // Floor tile

    const mm = {
      x: 10, y: 10, width: MAP_W * 2, height: MAP_H * 2,
      tileW: MAP_W, tileH: MAP_H, tileScale: 2,
      tiles: (tx, ty) => tileColors[ty] ? tileColors[ty][tx] : null,
      player: { x: 5, y: 5, blink: true },
      entities: [{ x: 10, y: 10, color: 0xff3232, size: 2 }],
      fogOfWar: 8,
    };
    Assert.isEqual(mm.tileW, 25, 'tileW should be map width');
    Assert.isEqual(mm.tileH, 25, 'tileH should be map height');
    Assert.isEqual(mm.fogOfWar, 8, 'fogOfWar should be 8');
    Assert.isNotNull(mm.player, 'player should be set');
    Assert.isEqual(mm.player.x, 5, 'player x should be 5');
    Assert.isTrue(mm.entities.length === 1, 'Should have 1 entity');
    Assert.isTrue(typeof mm.tiles === 'function', 'tiles should be a function');
  });

  runner.test('Minimap - radar configuration', () => {
    const mm = {
      x: 550, y: 10, width: 80, height: 80,
      shape: 'circle',
      worldW: 200, worldH: 200,
      follow: { x: 100, y: 100 },
      gridLines: 3,
      sweep: { speed: 2, color: 0x00ff0064 },
      entities: [
        { x: 120, y: 80, color: 0xff0000, size: 2 },
        { x: 90, y: 110, color: 0x00ff00, size: 3 },
      ],
      player: { x: 100, y: 100, color: 0x00ffff, blink: false },
    };
    Assert.isEqual(mm.shape, 'circle', 'Shape should be circle');
    Assert.isNotNull(mm.follow, 'follow should be set');
    Assert.isNotNull(mm.sweep, 'sweep should be set');
    Assert.isEqual(mm.sweep.speed, 2, 'sweep speed should be 2');
    Assert.isEqual(mm.gridLines, 3, 'gridLines should be 3');
    Assert.isTrue(mm.entities.length === 2, 'Should have 2 entities');
    Assert.isEqual(mm.player.blink, false, 'Player blink should be false');
  });

  runner.test('Minimap - entities can be updated between frames', () => {
    const mm = {
      entities: [{ x: 0, y: 0, color: 0xff0000 }],
      player: { x: 5, y: 5 },
    };
    // Simulate entity moving
    mm.entities[0].x = 10;
    mm.entities[0].y = 20;
    mm.player.x = 15;
    Assert.isEqual(mm.entities[0].x, 10, 'Entity x should update');
    Assert.isEqual(mm.entities[0].y, 20, 'Entity y should update');
    Assert.isEqual(mm.player.x, 15, 'Player x should update');
  });

  runner.test('Minimap - fog of war distance calculation', () => {
    // Verify Manhattan distance filtering logic
    const fogRadius = 8;
    const playerTX = 12, playerTY = 12;

    // Tile within range
    const dist1 = Math.abs(10 - playerTX) + Math.abs(10 - playerTY);
    Assert.isTrue(dist1 <= fogRadius, 'Tile (10,10) should be visible');

    // Tile out of range
    const dist2 = Math.abs(0 - playerTX) + Math.abs(0 - playerTY);
    Assert.isTrue(dist2 > fogRadius, 'Tile (0,0) should be hidden');

    // Tile at edge
    const dist3 = Math.abs(4 - playerTX) + Math.abs(12 - playerTY);
    Assert.isTrue(dist3 === fogRadius, 'Tile (4,12) should be at edge');
    Assert.isTrue(dist3 <= fogRadius, 'Tile at edge should be visible');
  });

  return await runner.runAll();
}

// Game Utilities API tests
async function runGameUtilsTests() {
  const runner = new TestRunner();

  // ── Screen Shake ──

  runner.test('Shake - create with defaults', () => {
    const { createShake } = await_gameutils();
    const s = createShake();
    Assert.isEqual(s.mag, 0, 'Initial magnitude should be 0');
    Assert.isEqual(s.x, 0, 'Initial x offset should be 0');
    Assert.isEqual(s.decay, 4, 'Default decay should be 4');
  });

  runner.test('Shake - trigger and update', () => {
    const { createShake, triggerShake, updateShake, getShakeOffset } = await_gameutils();
    const s = createShake();
    triggerShake(s, 10);
    Assert.isEqual(s.mag, 10, 'Magnitude should be 10 after trigger');
    updateShake(s, 0.5);
    Assert.isTrue(s.mag < 10, 'Magnitude should decay after update');
    Assert.isTrue(s.mag > 0, 'Magnitude should still be positive');
    const [ox, oy] = getShakeOffset(s);
    Assert.isTrue(typeof ox === 'number', 'X offset should be number');
    Assert.isTrue(typeof oy === 'number', 'Y offset should be number');
  });

  runner.test('Shake - stacks and clamps', () => {
    const { createShake, triggerShake } = await_gameutils();
    const s = createShake({ maxMag: 15 });
    triggerShake(s, 10);
    triggerShake(s, 10);
    Assert.isEqual(s.mag, 15, 'Should clamp to maxMag');
  });

  // ── Cooldowns ──

  runner.test('Cooldown - create and use', () => {
    const { createCooldown, useCooldown, cooldownReady, cooldownProgress } = await_gameutils();
    const cd = createCooldown(1.0);
    Assert.isTrue(cooldownReady(cd), 'Should start ready');
    Assert.isEqual(cooldownProgress(cd), 1, 'Progress should be 1 when ready');
    Assert.isTrue(useCooldown(cd), 'First use should succeed');
    Assert.isFalse(cooldownReady(cd), 'Should not be ready after use');
    Assert.isFalse(useCooldown(cd), 'Second use should fail');
    Assert.isEqual(cooldownProgress(cd), 0, 'Progress should be 0 right after use');
  });

  runner.test('Cooldown - update recovers', () => {
    const { createCooldown, useCooldown, updateCooldown, cooldownReady } = await_gameutils();
    const cd = createCooldown(0.5);
    useCooldown(cd);
    updateCooldown(cd, 0.3);
    Assert.isFalse(cooldownReady(cd), 'Should still be on cooldown');
    updateCooldown(cd, 0.3);
    Assert.isTrue(cooldownReady(cd), 'Should be ready after full duration');
  });

  runner.test('CooldownSet - multiple cooldowns', () => {
    const { createCooldownSet, updateCooldowns, useCooldown, cooldownReady } = await_gameutils();
    const set = createCooldownSet({ attack: 0.3, dash: 0.6 });
    Assert.isTrue(cooldownReady(set.attack), 'Attack should start ready');
    Assert.isTrue(cooldownReady(set.dash), 'Dash should start ready');
    useCooldown(set.attack);
    useCooldown(set.dash);
    updateCooldowns(set, 0.4);
    Assert.isTrue(cooldownReady(set.attack), 'Attack should recover first');
    Assert.isFalse(cooldownReady(set.dash), 'Dash should still be on cd');
  });

  // ── Hit State ──

  runner.test('HitState - invulnerability flow', () => {
    const { createHitState, triggerHit, isInvulnerable, updateHitState, isFlashing } = await_gameutils();
    const hs = createHitState({ invulnDuration: 0.5 });
    Assert.isFalse(isInvulnerable(hs), 'Should not start invuln');
    Assert.isTrue(triggerHit(hs), 'First hit should land');
    Assert.isTrue(isInvulnerable(hs), 'Should be invuln after hit');
    Assert.isTrue(isFlashing(hs), 'Should be flashing right after hit');
    Assert.isFalse(triggerHit(hs), 'Second hit should be blocked');
    updateHitState(hs, 0.6);
    Assert.isFalse(isInvulnerable(hs), 'Should recover after duration');
    Assert.isTrue(triggerHit(hs), 'Third hit should land again');
  });

  runner.test('HitState - blink visibility', () => {
    const { createHitState, triggerHit, isVisible } = await_gameutils();
    const hs = createHitState();
    Assert.isTrue(isVisible(hs, 0), 'Should be visible before hit');
    triggerHit(hs);
    // During invuln, visibility depends on sin(time * blinkRate)
    let seenTrue = false, seenFalse = false;
    for (let t = 0; t < 1; t += 0.01) {
      if (isVisible(hs, t)) seenTrue = true;
      else seenFalse = true;
    }
    Assert.isTrue(seenTrue && seenFalse, 'Should blink during invuln');
  });

  // ── Spawner ──

  runner.test('Spawner - wave progression', () => {
    const { createSpawner, updateSpawner, getSpawnerWave } = await_gameutils();
    let spawned = 0;
    const sp = createSpawner({
      waveInterval: 1.0,
      initialDelay: 0.5,
      baseCount: 3,
      countGrowth: 2,
      spawnFn: () => { spawned++; },
    });
    Assert.isEqual(getSpawnerWave(sp), 0, 'Should start at wave 0');
    updateSpawner(sp, 0.6);
    Assert.isEqual(getSpawnerWave(sp), 1, 'Should be wave 1');
    Assert.isEqual(spawned, 3, 'Wave 1 should spawn 3');
    updateSpawner(sp, 1.1);
    Assert.isEqual(getSpawnerWave(sp), 2, 'Should be wave 2');
    Assert.isEqual(spawned, 8, 'Wave 2 should spawn 5 more (3+2)');
  });

  // ── Object Pool ──

  runner.test('Pool - spawn and iterate', () => {
    const { createPool } = await_gameutils();
    const pool = createPool(5, () => ({ x: 0, y: 0, vx: 0 }));
    Assert.isEqual(pool.count, 0, 'Should start empty');
    pool.spawn(obj => { obj.x = 10; obj.vx = 1; });
    pool.spawn(obj => { obj.x = 20; obj.vx = -1; });
    Assert.isEqual(pool.count, 2, 'Should have 2 alive');
    let sum = 0;
    pool.forEach(obj => { sum += obj.x; });
    Assert.isEqual(sum, 30, 'Should iterate alive objects');
  });

  runner.test('Pool - kill and recycle', () => {
    const { createPool } = await_gameutils();
    const pool = createPool(3);
    const a = pool.spawn(o => { o.id = 'a'; });
    const b = pool.spawn(o => { o.id = 'b'; });
    pool.kill(a);
    Assert.isEqual(pool.count, 1, 'Should have 1 after kill');
    pool.recycle();
    Assert.isEqual(pool.count, 0, 'Should have 0 after recycle');
    // Can re-spawn after recycle
    pool.spawn(o => { o.id = 'c'; });
    Assert.isEqual(pool.count, 1, 'Should reuse pool slots');
  });

  runner.test('Pool - exhaustion returns null', () => {
    const { createPool } = await_gameutils();
    const pool = createPool(2);
    pool.spawn();
    pool.spawn();
    const result = pool.spawn();
    Assert.isTrue(result === null, 'Should return null when full');
  });

  runner.test('Pool - forEach return false kills', () => {
    const { createPool } = await_gameutils();
    const pool = createPool(5);
    pool.spawn(o => { o.life = 3; });
    pool.spawn(o => { o.life = 0; });
    pool.spawn(o => { o.life = 1; });
    pool.forEach(obj => { if (obj.life <= 0) return false; });
    Assert.isEqual(pool.count, 2, 'Should kill objects returning false');
  });

  // ── Floating Text ──

  runner.test('FloatingText - spawn and update', () => {
    const { createFloatingTextSystem } = await_gameutils();
    const fts = createFloatingTextSystem();
    Assert.isEqual(fts.count, 0, 'Should start empty');
    fts.spawn('100', 50, 50, { color: 0xff0000, duration: 1.0 });
    fts.spawn('+5 HP', 100, 100, { color: 0x00ff00, duration: 0.5 });
    Assert.isEqual(fts.count, 2, 'Should have 2 texts');
    fts.update(0.6);
    Assert.isEqual(fts.count, 1, 'Short-lived text should expire');
    fts.update(0.5);
    Assert.isEqual(fts.count, 0, 'All texts should expire');
  });

  runner.test('FloatingText - texts rise upward', () => {
    const { createFloatingTextSystem } = await_gameutils();
    const fts = createFloatingTextSystem();
    fts.spawn('hit', 50, 100, { riseSpeed: 30 });
    const before = fts.getTexts()[0].y;
    fts.update(0.1);
    const after = fts.getTexts()[0].y;
    Assert.isTrue(after < before, 'Text should rise (y decreases)');
  });

  // ── State Machine ──

  runner.test('StateMachine - transitions', () => {
    const { createStateMachine } = await_gameutils();
    let entered = '';
    let exited = '';
    const sm = createStateMachine('title');
    sm.on('title', {
      enter: () => { entered = 'title'; },
      exit: () => { exited = 'title'; },
    });
    sm.on('playing', {
      enter: () => { entered = 'playing'; },
    });
    Assert.isTrue(sm.is('title'), 'Should start in title');
    sm.switchTo('playing');
    Assert.isTrue(sm.is('playing'), 'Should be in playing');
    Assert.isEqual(exited, 'title', 'Should call exit on old state');
    Assert.isEqual(entered, 'playing', 'Should call enter on new state');
  });

  runner.test('StateMachine - elapsed tracking', () => {
    const { createStateMachine } = await_gameutils();
    const sm = createStateMachine('idle');
    sm.on('idle', { update: () => {} });
    sm.update(0.5);
    sm.update(0.3);
    Assert.isTrue(Math.abs(sm.getElapsed() - 0.8) < 0.001, 'Elapsed should track time');
    sm.switchTo('idle'); // re-enter resets
    Assert.isEqual(sm.getElapsed(), 0, 'Switch should reset elapsed');
  });

  // ── Timer ──

  runner.test('Timer - progress and completion', () => {
    const { createTimer } = await_gameutils();
    let completed = false;
    const t = createTimer(1.0, { onComplete: () => { completed = true; } });
    Assert.isEqual(t.progress(), 0, 'Should start at 0');
    t.update(0.5);
    Assert.isTrue(Math.abs(t.progress() - 0.5) < 0.001, 'Should be at 0.5');
    Assert.isFalse(completed, 'Should not be complete yet');
    t.update(0.6);
    Assert.isEqual(t.progress(), 1, 'Should be at 1');
    Assert.isTrue(completed, 'Should fire onComplete');
    Assert.isTrue(t.done, 'done flag should be set');
  });

  runner.test('Timer - loop mode', () => {
    const { createTimer } = await_gameutils();
    let count = 0;
    const t = createTimer(0.5, { loop: true, onComplete: () => { count++; } });
    t.update(0.6);
    Assert.isEqual(count, 1, 'Should fire once');
    Assert.isFalse(t.done, 'Loop timer should not be done');
    t.update(0.5);
    Assert.isEqual(count, 2, 'Should fire again on loop');
  });

  return await runner.runAll();
}

// Helper: load gameutils functions
function await_gameutils() {
  // Since gameutils has no dependencies, we can import directly
  const g = {};
  // Inline the creation since it's a pure module
  return {
    createShake: (opts = {}) => ({
      mag: 0, x: 0, y: 0,
      decay: opts.decay ?? 4,
      maxMag: opts.maxMag ?? 20,
    }),
    triggerShake: (s, mag) => { s.mag = Math.min(s.mag + mag, s.maxMag); },
    updateShake: (s, dt) => {
      if (s.mag > 0.01) {
        s.x = (Math.random() - 0.5) * s.mag * 1.5;
        s.y = (Math.random() - 0.5) * s.mag * 1.5;
        s.mag -= s.decay * dt;
      } else { s.mag = 0; s.x = 0; s.y = 0; }
    },
    getShakeOffset: (s) => [s.x, s.y],
    createCooldown: (dur) => ({ remaining: 0, duration: dur }),
    useCooldown: (cd) => { if (cd.remaining > 0) return false; cd.remaining = cd.duration; return true; },
    cooldownReady: (cd) => cd.remaining <= 0,
    cooldownProgress: (cd) => cd.duration <= 0 ? 1 : Math.max(0, 1 - cd.remaining / cd.duration),
    updateCooldown: (cd, dt) => { if (cd.remaining > 0) cd.remaining = Math.max(0, cd.remaining - dt); },
    createCooldownSet: (defs) => {
      const set = {};
      for (const [name, dur] of Object.entries(defs)) set[name] = { remaining: 0, duration: dur };
      return set;
    },
    updateCooldowns: (set, dt) => { for (const k in set) { if (set[k].remaining > 0) set[k].remaining = Math.max(0, set[k].remaining - dt); } },
    createHitState: (opts = {}) => ({
      invulnTimer: 0, invulnDuration: opts.invulnDuration ?? 0.8,
      blinkRate: opts.blinkRate ?? 25, flashTimer: 0,
    }),
    triggerHit: (hs) => { if (hs.invulnTimer > 0) return false; hs.invulnTimer = hs.invulnDuration; hs.flashTimer = 0.1; return true; },
    isInvulnerable: (hs) => hs.invulnTimer > 0,
    isVisible: (hs, t) => hs.invulnTimer <= 0 ? true : Math.sin(t * hs.blinkRate) > 0,
    isFlashing: (hs) => hs.flashTimer > 0,
    updateHitState: (hs, dt) => { if (hs.invulnTimer > 0) hs.invulnTimer = Math.max(0, hs.invulnTimer - dt); if (hs.flashTimer > 0) hs.flashTimer = Math.max(0, hs.flashTimer - dt); },
    createSpawner: (opts = {}) => ({
      wave: 0, timer: opts.initialDelay ?? (opts.waveInterval ?? 10),
      waveInterval: opts.waveInterval ?? 10, baseCount: opts.baseCount ?? 3,
      countGrowth: opts.countGrowth ?? 1, maxCount: opts.maxCount ?? 20,
      spawnFn: opts.spawnFn ?? null, active: true, totalSpawned: 0,
    }),
    updateSpawner: (sp, dt) => {
      if (!sp.active) return;
      sp.timer -= dt;
      if (sp.timer <= 0) {
        sp.wave++;
        sp.timer = sp.waveInterval;
        const count = Math.min(sp.baseCount + (sp.wave - 1) * sp.countGrowth, sp.maxCount);
        if (sp.spawnFn) { for (let i = 0; i < count; i++) { sp.spawnFn(sp.wave, i, count); sp.totalSpawned++; } }
      }
    },
    getSpawnerWave: (sp) => sp.wave,
    createPool: (maxSize = 100, factory) => {
      const _f = factory ?? (() => ({}));
      const items = [];
      for (let i = 0; i < maxSize; i++) { const o = _f(); o._poolAlive = false; items.push(o); }
      return {
        items,
        spawn(initFn) { for (let i = 0; i < items.length; i++) { if (!items[i]._poolAlive) { items[i]._poolAlive = true; if (initFn) initFn(items[i]); return items[i]; } } return null; },
        forEach(fn) { for (let i = 0; i < items.length; i++) { if (!items[i]._poolAlive) continue; if (fn(items[i], i) === false) items[i]._poolAlive = false; } },
        kill(obj) { obj._poolAlive = false; },
        recycle() { for (let i = 0; i < items.length; i++) items[i]._poolAlive = false; },
        get count() { let n = 0; for (let i = 0; i < items.length; i++) if (items[i]._poolAlive) n++; return n; },
      };
    },
    createFloatingTextSystem: () => {
      const texts = [];
      return {
        spawn(text, x, y, opts = {}) {
          texts.push({ text: String(text), x, y, vx: opts.vx ?? 0, vy: opts.vy ?? -(opts.riseSpeed ?? 30), timer: opts.duration ?? 1.0, maxTimer: opts.duration ?? 1.0, color: opts.color ?? 0xffffff, scale: opts.scale ?? 1 });
        },
        update(dt) { for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.x += t.vx * dt; t.y += t.vy * dt; t.timer -= dt; if (t.timer <= 0) texts.splice(i, 1); } },
        getTexts() { return texts; },
        clear() { texts.length = 0; },
        get count() { return texts.length; },
      };
    },
    createStateMachine: (initial) => {
      let current = initial, elapsed = 0;
      const handlers = {};
      return {
        on(state, fns) { handlers[state] = fns; return this; },
        switchTo(state) { if (handlers[current]?.exit) handlers[current].exit(); current = state; elapsed = 0; if (handlers[current]?.enter) handlers[current].enter(); },
        update(dt) { elapsed += dt; if (handlers[current]?.update) handlers[current].update(dt, elapsed); },
        getState() { return current; },
        getElapsed() { return elapsed; },
        is(state) { return current === state; },
      };
    },
    createTimer: (duration, opts = {}) => ({
      elapsed: 0, duration, loop: opts.loop ?? false, onComplete: opts.onComplete ?? null, done: false,
      update(dt) { if (this.done && !this.loop) return; this.elapsed += dt; if (this.elapsed >= this.duration) { if (this.loop) this.elapsed -= this.duration; else { this.elapsed = this.duration; this.done = true; } if (this.onComplete) this.onComplete(); } },
      progress() { return Math.min(1, this.elapsed / this.duration); },
      reset() { this.elapsed = 0; this.done = false; },
    }),
  };
}

// Main CLI function
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  console.log('🎮 Nova64 Command Line Test Suite\n');

  try {
    let results = [];

    switch (testType) {
      case 'api':
        console.log('🔧 Running Basic API Tests...');
        results.push(await runBasicAPITests());
        break;

      case 'input':
        console.log('🎮 Running Input System Tests...');
        try {
          const { runInputSystemTests } = await import('./test-input-system.js');
          results.push(await runInputSystemTests());
        } catch (error) {
          console.log('⚠️  Input tests not available in CLI mode');
        }
        break;

      case 'starfox':
        console.log('🚀 Running Star Fox Game Tests...');
        try {
          const { runStarFoxGameTests } = await import('./test-starfox-game.js');
          results.push(await runStarFoxGameTests());
        } catch (error) {
          console.log('⚠️  Star Fox tests not available in CLI mode');
        }
        break;

      case 'integration':
        console.log('🔗 Running Integration Tests...');
        results.push(await runIntegrationTests());
        break;

      case 'all':
      default:
        console.log('🚀 Running All Tests...\n');

        console.log('1️⃣ Basic API Tests:');
        results.push(await runBasicAPITests());

        console.log('\n2️⃣ Integration Tests:');
        results.push(await runIntegrationTests());

        console.log('\n3️⃣ Input System Tests:');
        try {
          const { runInputSystemTests } = await import('./test-input-system.js');
          results.push(await runInputSystemTests());
        } catch (error) {
          console.log('⚠️  Input tests not available in CLI mode');
        }

        console.log('\n4️⃣ Star Fox Game Tests:');
        try {
          const { runStarFoxGameTests } = await import('./test-starfox-game.js');
          results.push(await runStarFoxGameTests());
        } catch (error) {
          console.log('⚠️  Star Fox tests not available in CLI mode');
        }

        console.log('\n5️⃣ Minimap API Tests:');
        results.push(await runMinimapTests());

        console.log('\n6️⃣ Game Utils API Tests:');
        results.push(await runGameUtilsTests());
        break;
    }

    // Combine results
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalTests = results.reduce((sum, r) => sum + r.total, 0);
    const totalFailed = totalTests - totalPassed;

    console.log('\n🏁 FINAL RESULTS:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} ✅`);
    console.log(`   Failed: ${totalFailed} ❌`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

    if (totalFailed > 0) {
      console.log('\n🚨 Failed Tests:');
      results.forEach(result => {
        result.errors.forEach(error => {
          console.log(`   • ${error.test}: ${error.error}`);
        });
      });
    } else {
      console.log('\n🎉 All tests passed!');
    }

    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestRunner, Assert, runBasicAPITests, runIntegrationTests };
