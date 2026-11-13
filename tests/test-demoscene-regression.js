#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const demoscenePath = path.join(repoRoot, 'examples', 'demoscene', 'code.js');
const godotDemoscenePath = path.join(
  repoRoot,
  'nova64-godot',
  'tests',
  'carts',
  'demoscene',
  'code.js'
);
const godotShimPath = path.join(
  repoRoot,
  'nova64-godot',
  'godot_project',
  'shim',
  'nova64-compat.js'
);
const source = fs.readFileSync(demoscenePath, 'utf8');
const godotSource = fs.readFileSync(godotDemoscenePath, 'utf8');
const godotShimSource = fs.readFileSync(godotShimPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getNova64BindingBody(cartSource, namespace, label) {
  const escapedNamespace = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cartSource.match(
    new RegExp(`const\\s*\\{([\\s\\S]*?)\\}\\s*=\\s*nova64\\.${escapedNamespace}\\s*;`)
  );
  assert(match, `${label}: missing nova64.${namespace} bindings`);
  return match[1];
}

function getFunctionBody(cartSource, name, label) {
  const declaration = `function ${name}`;
  const start = cartSource.indexOf(declaration);
  assert(start !== -1, `${label}: missing ${name}()`);

  const openBrace = cartSource.indexOf('{', start);
  assert(openBrace !== -1, `${label}: missing body for ${name}()`);

  let depth = 0;
  for (let i = openBrace; i < cartSource.length; i++) {
    if (cartSource[i] === '{') depth++;
    if (cartSource[i] === '}') depth--;
    if (depth === 0) return cartSource.slice(openBrace + 1, i);
  }

  throw new Error(`${label}: unclosed body for ${name}()`);
}

function assertContains(text, expected, context) {
  assert(text.includes(expected), `${context} must contain: ${expected}`);
}

function validateDemosceneSource(cartSource, label) {
  const drawBindings = getNova64BindingBody(cartSource, 'draw', label);
  assertContains(drawBindings, 'cls', `${label} draw bindings`);
  assertContains(drawBindings, 'rgba8', `${label} draw bindings`);

  const sceneBindings = getNova64BindingBody(cartSource, 'scene', label);
  assertContains(sceneBindings, 'clearScene', `${label} scene bindings`);
  assertContains(sceneBindings, 'destroyMesh', `${label} scene bindings`);

  const cleanupBody = getFunctionBody(cartSource, 'cleanupScene', label);
  const trackedCollections = [
    'dataStreams',
    'pulseRings',
    'energyFields',
    'tunnelSegments',
    'digitalTowers',
    'particleSystems',
    'terrainBlocks',
  ];

  for (const collection of trackedCollections) {
    assertContains(cleanupBody, `${collection}.forEach`, `${label} cleanupScene()`);
    assertContains(cleanupBody, `${collection} = []`, `${label} cleanupScene()`);
  }

  assertContains(cleanupBody, 'destroyTrackedMesh(c.body)', `${label} cleanupScene()`);
  assertContains(cleanupBody, 'destroyTrackedMesh(c.trail)', `${label} cleanupScene()`);
  assertContains(cleanupBody, 'lightCycles = []', `${label} cleanupScene()`);
  assertContains(cleanupBody, 'destroyTrackedMesh(gridFloor)', `${label} cleanupScene()`);
  assertContains(cleanupBody, 'gridFloor = null', `${label} cleanupScene()`);
  assertContains(cleanupBody, "typeof clearScene === 'function'", `${label} cleanupScene()`);
  assertContains(cleanupBody, 'clearScene()', `${label} cleanupScene()`);

  assert(
    !cleanupBody.includes('keep start scene for now'),
    `${label} cleanupScene() must not leave previous scene geometry behind`
  );

  const hudBody = getFunctionBody(cartSource, 'drawDemoHUD', label);
  assert(
    hudBody.trimStart().startsWith('cls(rgba8(0, 0, 0, 0));'),
    `${label} drawDemoHUD() must begin by clearing only the 2D overlay with transparent cls()`
  );
}

validateDemosceneSource(source, 'examples/demoscene');
validateDemosceneSource(godotSource, 'nova64-godot/tests/carts/demoscene');

const gridAwakeningBody = getFunctionBody(source, 'buildGridAwakeningScene', 'examples/demoscene');
assertContains(gridAwakeningBody, 'configureBloom(0.72, 0.32, 0.72)', 'Grid Awakening');
assertContains(gridAwakeningBody, 'x <= 60; x += 4', 'Grid Awakening terrain density');
assertContains(gridAwakeningBody, 'z <= 36; z += 4', 'Grid Awakening terrain density');
assertContains(gridAwakeningBody, '2.9, height, 2.9', 'Grid Awakening voxel footprint');

const godotStartBody = getFunctionBody(
  godotSource,
  'buildStartScene',
  'nova64-godot/tests/carts/demoscene'
);
assertContains(godotStartBody, 'x <= 60; x += 2.5', 'Godot demoscene intro terrain density');
assertContains(godotStartBody, 'z <= 48; z += 2.5', 'Godot demoscene intro terrain density');
assertContains(godotStartBody, '1.08, height, 1.08', 'Godot demoscene intro voxel footprint');

assertContains(godotShimSource, 'function setBloomRadius', 'Godot bloom parity shim');
assertContains(godotShimSource, 'function setBloomThreshold', 'Godot bloom parity shim');
assertContains(godotShimSource, 'setBloomRadius, setBloomThreshold', 'Godot bloom fx namespace');
// Verify the current bloom payload numerically instead of requiring the retired
// threshold/colour-grade formula to remain in the source.
const bloomFactors = JSON.parse(godotShimSource.match(/const BLOOM_FACTORS = (\[[^;]+\]);/)[1]);
const bloomPayload = new Function(
  'bloomState',
  'BLOOM_FACTORS',
  'enabled',
  getFunctionBody(godotShimSource, 'bloomPayload', 'Godot bloom shim')
);
for (const [radius, expected] of [
  [0, [6, 4.8, 3.6, 2.4, 1.2, 0, 0]],
  [1, [1.2, 2.4, 3.6, 4.8, 6, 0, 0]],
]) {
  const payload = bloomPayload({ strength: 2, radius, threshold: 0.75 }, bloomFactors, true);
  assert(payload.glow === true, 'Godot bloom must enable glow for positive strength');
  assert(payload.glowThreshold === 1, 'Godot bloom threshold must compensate max-channel vs luma');
  assert(
    payload.glowBlend === 'additive' && payload.glowBloom === 0,
    'Godot bloom must add isolated highlights'
  );
  assert(
    payload.glowLevels.length === expected.length &&
      payload.glowLevels.every((v, i) => Math.abs(v - expected[i]) < 1e-6),
    'Godot bloom radius must redistribute the five blur levels'
  );
  assert(
    !['brightness', 'contrast', 'saturation'].some(key => key in payload),
    'Godot bloom must not regrade the scene'
  );
}
assert(
  bloomPayload({ strength: 0, radius: 0.5, threshold: 1 }, bloomFactors, true).glow === false,
  'zero bloom strength must disable glow'
);
assert(
  bloomPayload({ strength: 1, radius: 0.5, threshold: 1 }, bloomFactors, false).glow === false,
  'disabled bloom must disable glow'
);
assertContains(godotShimSource, 'function __appendCrtOverlayOps', 'Godot CRT overlay');
assertContains(godotShimSource, '__appendCrtOverlayOps();', 'Godot overlay flush');
assertContains(godotShimSource, "['rect', 0, y | 0, W, 1, c, true]", 'Godot scanline overlay op');
assertContains(
  godotShimSource,
  '__crt.scanlines = alpha !== false && alpha !== 0',
  'Godot scanline shim'
);
assertContains(godotShimSource, '__crt.vignette = a > 0', 'Godot vignette shim');

console.log('Demoscene regression checks passed');
