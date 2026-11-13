import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import * as THREE from 'three';
import { skyboxApi } from '../../runtime/api-skybox.js';

const header = fs.readFileSync(new URL('../generated/sky.h', import.meta.url), 'utf8');
const source = header
  .split('static const char nova_sky_compat_js[] =\n')[1]
  .trim()
  .replace(/;$/, '')
  .split('\n')
  .map(line => JSON.parse(line))
  .join('');
function native() {
  const uploads = [],
    ticks = [],
    images = [];
  const context = {
    nova64: { light: {} },
    setSkyColor: (...args) => images.push(args),
    __novaSetProceduralSky: (...args) => uploads.push(args),
    __novaProceduralSkyTime: (...args) => ticks.push(args),
    __novaSetImageSky: (...args) => images.push(args),
    __novaSetSkyPixels: (...args) => images.push(args),
  };
  vm.runInNewContext(source, context);
  return { context, api: context.nova64.light, uploads, ticks, images };
}
function web() {
  const scene = new THREE.Scene(),
    api = {};
  skyboxApi({ scene }).exposeTo(api);
  return { scene, api };
}
function values(mesh) {
  return Object.fromEntries(
    Object.entries(mesh.material.uniforms)
      .filter(([name]) => name !== 'uTime')
      .map(([name, { value }]) => [
        name,
        value?.isColor ? [value.r, value.g, value.b] : value?.isVector3 ? value.toArray() : value,
      ])
  );
}
const plain = value => JSON.parse(JSON.stringify(value));

test('all gradient presets preserve the web uniforms, overrides and defaults', () => {
  for (const name of ['sunset', 'ocean', 'meadow', 'highlands', 'aurora']) {
    const n = native(),
      w = web();
    const options = { seed: 17, wind: 0, reflect: false };
    n.api.createSkyPreset(name, options);
    const mesh = w.api.createSkyPreset(name, options);
    const [kind, actual] = n.uploads.at(-1);
    assert.equal(kind, 1);
    const { uSize, ...uniforms } = actual;
    assert.deepEqual(plain(uniforms), values(mesh), name);
  }
});
test('gradient positional, object and numeric-horizon forms match the web', () => {
  for (const args of [
    [0xffaa22, 0x112233, 0x00ffff],
    [{ topColor: 0xff0000, bottomColor: 0, stars: 0, clouds: 0, seed: 4 }],
  ]) {
    const n = native(),
      w = web();
    // Supply a seed for the positional overload without changing the colors.
    if (typeof args[0] === 'number') {
      n.api.createGradientSkybox(...args);
      w.api.createGradientSkybox(...args);
      const [, actual] = n.uploads.at(-1);
      assert.deepEqual(plain(actual.uHorizon), values(w.scene.children[0]).uHorizon);
    } else {
      n.api.createGradientSkybox(...args);
      const { uSize, ...uniforms } = n.uploads.at(-1)[1];
      assert.deepEqual(plain(uniforms), values(w.api.createGradientSkybox(...args)));
    }
  }
});
test('space upload includes foreground star geometry and nebula controls', () => {
  const n = native();
  n.api.createSpaceSkybox({ starCount: 12, starSize: 3, seed: 4, nebulae: false, milkyWay: false });
  const [kind, uniforms, stars, reflection] = n.uploads.at(-1);
  assert.equal(kind, 2);
  assert.equal(stars.length, 12 * 8);
  assert.equal(uniforms.uNebula, 0);
  assert.equal(uniforms.uMilky, 0);
  assert.equal(uniforms.uSize, 9);
  assert.equal(reflection, 1);
  assert.ok(stars.every(Number.isFinite));
});
test('rotation controls do not freeze shader time, and clear removes the sky', () => {
  const n = native();
  n.api.createSpaceSkybox({ starCount: 0, seed: 1 });
  n.api.enableSkyboxAutoAnimate(2);
  n.context.__nova64TickSky(0.5);
  assert.deepEqual(plain(n.ticks.at(-1)), [0.5, 0.01]);
  n.api.disableSkyboxAutoAnimate();
  n.context.__nova64TickSky(0.5);
  assert.deepEqual(plain(n.ticks.at(-1)), [1, 0.01]);
  n.api.clearSkybox();
  assert.equal(n.uploads.at(-1)[0], 0);
});
test('HDR and cube image creation retain promise/error and option semantics', async () => {
  const n = native();
  await n.api.createHDRSkybox('/assets/sky/test.hdr', { intensity: 2, rotation: 1, blur: 0.4 });
  assert.deepEqual(plain(n.images.at(-1)), ['/assets/sky/test.hdr', 2, 1, 0.4]);
  const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
  await n.api.createImageSkybox(faces);
  assert.deepEqual(plain(n.images.at(-1)), [faces, 1, 0, 0]);
  n.context.__novaSetImageSky = () => {
    throw new Error('missing asset');
  };
  await assert.rejects(n.api.createHDRSkybox('missing.hdr'), /missing asset/);
});
test('environment presets contain linear HDR light panels, not just a flat tint', () => {
  const n = native();
  n.api.createEnvironmentSkybox('studio');
  const [buffer, width, height] = n.images.at(-1);
  const pixels = new Float32Array(buffer);
  assert.equal(pixels.length, width * height * 4);
  assert.ok(
    pixels.some(x => x > 1),
    'HDR panels survive upload'
  );
});
