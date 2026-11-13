import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { decodeGaussianPly, validateSplats } from '../experiments/gaussian-splatting/data.js';
import { makeSyntheticPly } from '../experiments/gaussian-splatting/synthetic.js';
import { GaussianPrototype } from '../experiments/gaussian-splatting/renderer.js';
const one = () => ({
  positions: new Float32Array([0, 0, 0]),
  scales: new Float32Array([2, 1, 0.5]),
  rotations: new Float32Array([0, 0, Math.SQRT1_2, Math.SQRT1_2]),
  colors: new Float32Array([1, 0, 0, 0.7]),
});
test('binary Gaussian PLY decodes physical scale, quaternion, opacity and DC color', () => {
  const data = decodeGaussianPly(makeSyntheticPly());
  assert.deepEqual(
    new Uint8Array(
      readFileSync(new URL('../experiments/gaussian-splatting/synthetic.ply', import.meta.url))
    ),
    makeSyntheticPly()
  );
  assert.equal(validateSplats(data), 1152);
  assert.ok(Math.abs(data.scales[0] - 0.11) < 1e-6);
  assert.ok(data.colors[3] > 0.6 && data.colors[3] < 0.7);
  assert.equal(data.discardedHigherSH, false);
});
test('ASCII PLY matches binary decoding and marks discarded higher SH explicitly', () => {
  const names = [
    'x',
    'y',
    'z',
    'scale_0',
    'scale_1',
    'scale_2',
    'rot_0',
    'rot_1',
    'rot_2',
    'rot_3',
    'opacity',
    'f_dc_0',
    'f_dc_1',
    'f_dc_2',
    'f_rest_0',
  ];
  const header = `ply\nformat ascii 1.0\nelement vertex 1\n${names.map(n => `property float ${n}`).join('\n')}\nend_header\n`;
  const data = decodeGaussianPly(
    new TextEncoder().encode(header + '1 2 3 0 0 0 1 0 0 0 0 0 0 0 4')
  );
  assert.deepEqual(Array.from(data.positions), [1, 2, 3]);
  assert.deepEqual(Array.from(data.rotations), [0, 0, 0, 1]);
  assert.equal(data.colors[3], 0.5);
  assert.equal(data.discardedHigherSH, true);
  assert.ok(Math.abs(data.colors[0] - 0.21404114) < 1e-6);
  assert.throws(
    () => decodeGaussianPly(new TextEncoder().encode(header + 'NaN 2 3 0 0 0 1 0 0 0 0 0 0 0 4')),
    /Non-finite/
  );
});
test('rejects point-cloud PLY, truncated data, NaNs and degenerate Gaussian records', () => {
  assert.throws(
    () =>
      decodeGaussianPly(
        new TextEncoder().encode(
          'ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\nend_header\n0'
        )
      ),
    /Missing Gaussian property/
  );
  assert.throws(
    () => decodeGaussianPly(makeSyntheticPly().subarray(0, 300)),
    /Truncated|header|Missing/
  );
  const data = one();
  data.scales[0] = 0;
  assert.throws(() => validateSplats(data), /positive/);
  data.scales[0] = 1;
  data.positions[0] = NaN;
  assert.throws(() => validateSplats(data), /positions/);
  data.positions[0] = 0;
  data.rotations.fill(0);
  assert.throws(() => validateSplats(data), /quaternion/);
});
test('globally sorts resources by transformed camera depth and rotates 3D covariance', () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 5;
  camera.updateMatrixWorld();
  const renderer = new GaussianPrototype(scene),
    a = renderer.add(one()),
    b = renderer.add(one());
  a.position.z = 1;
  b.position.z = -1;
  scene.updateMatrixWorld();
  renderer.prepare(camera, 640, 360);
  assert.equal(renderer.buffer.array[2], -1);
  assert.ok(Math.abs(renderer.buffer.array[3] - 1) < 1e-5);
  assert.ok(Math.abs(renderer.buffer.array[6] - 4) < 1e-5);
  a.position.z = -2;
  scene.updateMatrixWorld();
  renderer.prepare(camera, 640, 360);
  assert.equal(renderer.buffer.array[2], -2);
  b.visible = false;
  renderer.prepare(camera, 640, 360);
  assert.equal(renderer.stats.visible, 1);
  a.position.z = 6;
  scene.updateMatrixWorld();
  renderer.prepare(camera, 640, 360);
  assert.equal(renderer.stats.visible, 0);
  renderer.dispose();
});
test('restores scene callback and disposes GPU resources once', () => {
  const scene = new THREE.Scene(),
    previous = scene.onBeforeRender,
    renderer = new GaussianPrototype(scene);
  renderer.add(one());
  assert.throws(() => new GaussianPrototype(scene), /one global Gaussian batch/);
  assert.throws(() => renderer.prepare(new THREE.OrthographicCamera(), 640, 360), /perspective/);
  let geometry = 0,
    material = 0;
  renderer.mesh.geometry.addEventListener('dispose', () => geometry++);
  renderer.material.addEventListener('dispose', () => material++);
  renderer.dispose();
  renderer.dispose();
  assert.equal(geometry, 1);
  assert.equal(material, 1);
  assert.equal(scene.onBeforeRender, previous);
  assert.equal(scene.children.length, 0);
  assert.throws(() => renderer.add(one()), /disposed/);
});
