// Tests for runtime/core-compat.js — libretro-core parity helpers shared by the
// web runtime and the Godot shim. Run: node --test tests/test-core-compat.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCoreCompat } from '../runtime/core-compat.js';

function block(path) {
  const s = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const a = s.indexOf('// BEGIN core-compat');
  const b = s.indexOf('// END core-compat');
  assert.ok(a >= 0 && b > a, `markers missing in ${path}`);
  // The shim copy is indented two spaces; compare ignoring leading indentation.
  return s.slice(a, b).split('\n').map(l => l.trim()).join('\n');
}

function host() {
  const calls = [];
  const rec = name => (...a) => calls.push([name, ...a]);
  return {
    calls,
    h: {
      print: rec('print'), line: rec('line'), circle: rec('circle'), pset: rec('pset'),
      setInstanceTransform: rec('inst'), createGradientSkybox: rec('sky'), clearSkybox: rec('clearSky'),
      white: 'W', project: (x, y, z) => ({ x, y, z, visible: true }),
    },
  };
}

test('Godot shim carries an identical copy of createCoreCompat (fix: node scripts/sync-core-compat.mjs)', () => {
  assert.equal(
    block('../nova64-godot/godot_project/shim/nova64-compat.js'),
    block('../runtime/core-compat.js')
  );
});

test('printBold draws twice, offset by one pixel', () => {
  const { calls, h } = host();
  createCoreCompat(h).draw.printBold('HI', 10, 20, 'c');
  assert.deepEqual(calls, [['print', 'HI', 10, 20, 'c'], ['print', 'HI', 11, 20, 'c']]);
});

test('printFlash is visible on even half-periods only', () => {
  const { calls, h } = host();
  const { printFlash } = createCoreCompat(h).draw;
  printFlash(0, 0, 'X', 'c', 0, 2); // phase 0 -> on
  printFlash(0, 0, 'X', 'c', 0.3, 2); // trunc(1.2)=1 -> off
  assert.equal(calls.length, 1);
});

test('hline/vline use the core (x0,y,x1) / (x,y0,y1) argument order', () => {
  const { calls, h } = host();
  const { hline, vline } = createCoreCompat(h).draw;
  hline(1, 5, 9, 'c');
  vline(3, 2, 8, 'c');
  assert.deepEqual(calls, [['line', 1, 5, 9, 5, 'c'], ['line', 3, 2, 3, 8, 'c']]);
});

test('setInstanceTransforms decomposes column-major matrices', () => {
  const { calls, h } = host();
  const m = [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 5, 6, 7, 1];
  createCoreCompat(h).scene.setInstanceTransforms(9, 2, [...m, ...m]);
  assert.equal(calls.length, 2);
  const [, mesh, idx, x, y, z, rx, ry, rz, sx, sy, sz] = calls[1];
  assert.deepEqual([mesh, idx, x, y, z, sx, sy, sz], [9, 3, 5, 6, 7, 2, 3, 4]);
  assert.deepEqual([rx, ry, rz].map(v => Math.abs(v)), [0, 0, 0]);
});

test('wave manager matches the core state machine', () => {
  const { util } = createCoreCompat(host().h);
  const w = util.createWaveManager();
  util.startWave(w, 3);
  util.enemyDefeated(w);
  assert.equal(util.getWaveNumber(w), 1);
  assert.equal(util.getRemainingEnemies(w), 2);
  assert.equal(util.isWaveActive(w), true);
  util.enemyDefeated(w);
  util.enemyDefeated(w);
  util.enemyDefeated(w);
  assert.equal(util.getRemainingEnemies(w), 0);
  assert.equal(util.isWaveActive(w), false);
});

test('bursts expire and seeded rng is deterministic', () => {
  const { util } = createCoreCompat(host().h);
  const b = util.createBurst(0, 0, 8, 50);
  assert.equal(util.isBurstDone(b), false);
  for (let i = 0; i < 100; i++) util.updateBurst(b, 0.05);
  assert.equal(util.isBurstDone(b), true);
  const r1 = util.createRng(42), r2 = util.createRng(42);
  assert.equal(util.rngRandom(r1), util.rngRandom(r2));
  const v = util.rngRandom();
  assert.ok(v >= 0 && v < 1);
});

test('projectLookAt centres the camera target', () => {
  const cc = createCoreCompat(host().h);
  const p = cc.projectLookAt([0, 0, 10], [0, 0, 0], 60, 640, 360, 0, 0, 0);
  assert.equal(Math.round(p.x), 320);
  assert.equal(Math.round(p.y), 180);
  assert.equal(p.visible, true);
  assert.equal(cc.projectLookAt([0, 0, 10], [0, 0, 0], 60, 640, 360, 0, 0, 20).visible, false);
});
