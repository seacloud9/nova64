#!/usr/bin/env node
// Tests that rgba8() BigInt colors survive the 3D material pipeline boundary.
// The BigInt color type can't pass through JSON.stringify or THREE.Color —
// normalizeColorToHex must convert it before those calls.

import assert from 'assert';
import { normalizeColorToHex } from '../runtime/backends/threejs/materials.js';

// Inline rgba8 / packRGBA64 so we can test the full roundtrip without loading
// the GPU layer (which depends on Three.js and browser globals).
const s = 257; // 255 * 257 = 65535 = max uint16
function packRGBA64(r, g, b, a) {
  return (BigInt(r) << 48n) | (BigInt(g) << 32n) | (BigInt(b) << 16n) | BigInt(a);
}
function rgba8(r, g, b, a = 255) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return packRGBA64(clamp(r) * s, clamp(g) * s, clamp(b) * s, clamp(a) * s);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

console.log('\nColor Compatibility Tests\n');

test('rgba8 returns BigInt', () => {
  assert.strictEqual(typeof rgba8(255, 255, 255), 'bigint');
});

test('normalizeColorToHex converts white BigInt to 0xffffff', () => {
  const c = rgba8(255, 255, 255, 255);
  assert.strictEqual(normalizeColorToHex(c), 0xffffff);
});

test('normalizeColorToHex converts black BigInt to 0x000000', () => {
  const c = rgba8(0, 0, 0, 255);
  assert.strictEqual(normalizeColorToHex(c), 0x000000);
});

test('normalizeColorToHex converts rgba8(0, 170, 255) to correct hex', () => {
  const c = rgba8(0, 170, 255, 255);
  const hex = normalizeColorToHex(c);
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  // Allow ±1 rounding tolerance from uint16→uint8 conversion
  assert.ok(Math.abs(r - 0) <= 1, `r expected 0 got ${r}`);
  assert.ok(Math.abs(g - 170) <= 1, `g expected 170 got ${g}`);
  assert.ok(Math.abs(b - 255) <= 1, `b expected 255 got ${b}`);
});

test('normalizeColorToHex passes regular hex numbers through unchanged', () => {
  assert.strictEqual(normalizeColorToHex(0xff8800), 0xff8800);
  assert.strictEqual(normalizeColorToHex(0x000000), 0x000000);
  assert.strictEqual(normalizeColorToHex(0xffffff), 0xffffff);
});

test('normalizeColorToHex returns 0xffffff for null/undefined', () => {
  assert.strictEqual(normalizeColorToHex(undefined), 0xffffff);
  assert.strictEqual(normalizeColorToHex(null), 0xffffff);
});

test('normalizeColorToHex result can be JSON.stringify-ed without throwing', () => {
  const c = rgba8(255, 220, 80, 255);
  const hex = normalizeColorToHex(c);
  assert.doesNotThrow(() => JSON.stringify({ color: hex }));
});

test('normalizeColorToHex result is a Number (not BigInt)', () => {
  const c = rgba8(100, 200, 50, 255);
  assert.strictEqual(typeof normalizeColorToHex(c), 'number');
});

const status = failed === 0 ? 'PASS' : 'FAIL';
console.log(`\n${status} — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
