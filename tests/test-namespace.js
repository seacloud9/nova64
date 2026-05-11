// tests/test-namespace.js
// Smoke tests for the grouped `nova64.*` namespace shape (NAMESPACE_MAP).
// Verifies the buildNamespace() routing is intact and that the v0.5.0
// Babylon-only `enableGlow` / `disableGlow` keys are exposed under `fx`.

import { buildNamespace, NAMESPACE_MAP } from '../runtime/namespace.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export async function runNamespaceTests() {
  const tests = [];
  const results = [];

  function test(name, fn) {
    tests.push({ name, fn });
  }

  test('NAMESPACE_MAP exports all expected groups', () => {
    const expected = [
      'draw',
      'sprite',
      'scene',
      'camera',
      'light',
      'fx',
      'shader',
      'input',
      'audio',
      'physics',
      'voxel',
      'ui',
      'tween',
      'data',
      'util',
      'xr',
    ];
    for (const g of expected) {
      assert(Array.isArray(NAMESPACE_MAP[g]), `Group "${g}" should be an array`);
      assert(NAMESPACE_MAP[g].length > 0, `Group "${g}" should not be empty`);
    }
  });

  test('fx group contains v0.5.0 Babylon-bonus glow keys', () => {
    assert(NAMESPACE_MAP.fx.includes('enableGlow'), 'fx should include enableGlow');
    assert(NAMESPACE_MAP.fx.includes('disableGlow'), 'fx should include disableGlow');
  });

  test('fx group still contains the canonical post-processing surface', () => {
    const required = [
      'enableBloom',
      'disableBloom',
      'enableFXAA',
      'disableFXAA',
      'enableVignette',
      'enableChromaticAberration',
      'enableGlitch',
      'enableRetroEffects',
      'isEffectsEnabled',
      'renderEffects',
    ];
    for (const k of required) {
      assert(NAMESPACE_MAP.fx.includes(k), `fx should still include ${k}`);
    }
  });

  test('buildNamespace routes flat keys into their groups', () => {
    const flat = {
      enableBloom: () => 'bloom',
      enableFXAA: () => 'fxaa',
      enableGlow: () => 'glow',
      createCube: () => 42,
      setCameraPosition: () => null,
      isKeyDown: () => false,
    };
    const ns = buildNamespace(flat, NAMESPACE_MAP);
    assert(ns.fx.enableBloom() === 'bloom', 'enableBloom should land under fx');
    assert(ns.fx.enableFXAA() === 'fxaa', 'enableFXAA should land under fx');
    assert(ns.fx.enableGlow() === 'glow', 'enableGlow should land under fx');
    assert(ns.scene.createCube() === 42, 'createCube should land under scene');
    assert(ns.camera.setCameraPosition !== undefined, 'setCameraPosition should land under camera');
    assert(ns.input.isKeyDown !== undefined, 'isKeyDown should land under input');
  });

  test('buildNamespace exposes _unmapped bucket for unknown keys', () => {
    const flat = {
      __totallyUnknownThing: () => 'lol',
      enableBloom: () => true,
    };
    const ns = buildNamespace(flat, NAMESPACE_MAP);
    assert(ns._unmapped, 'Should have _unmapped bucket');
    assert(
      ns._unmapped.__totallyUnknownThing,
      'Unknown keys should be collected into _unmapped'
    );
  });

  test('buildNamespace does NOT mutate the input flat API', () => {
    const flat = { enableBloom: () => true };
    const before = Object.keys(flat).length;
    buildNamespace(flat, NAMESPACE_MAP);
    assert(Object.keys(flat).length === before, 'flatApi should not be mutated');
  });

  // Run
  console.log(`\nRunning ${tests.length} namespace tests...`);
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      results.push({ name: t.name, passed: true });
    } catch (e) {
      console.log(`  ❌ ${t.name}: ${e.message}`);
      results.push({ name: t.name, passed: false, error: e.message });
    }
  }
  const passed = results.filter(r => r.passed).length;
  console.log(`\n📊 Namespace: ${passed}/${results.length} passed`);

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    tests: results,
    errors: results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })),
  };
}

// Allow direct invocation: `node tests/test-namespace.js`
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('test-namespace.js');
if (isMain) {
  const r = await runNamespaceTests();
  process.exit(r.failed > 0 ? 1 : 0);
}
