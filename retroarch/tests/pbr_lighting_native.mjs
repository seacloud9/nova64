#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const core = path.resolve(
  root,
  process.env.CORE || `retroarch/nova64_libretro.${process.platform === 'darwin' ? 'dylib' : 'so'}`
);
const out = path.join(root, 'retroarch/build/pbr-lighting-tests');
fs.mkdirSync(out, { recursive: true });
const source = fs.readFileSync(
  path.join(root, 'retroarch/tests/carts/pbr-lighting-fixture.js'),
  'utf8'
);
const images = {};
for (const [name, options] of [
  ['bare', { __lightingMetalness: 0, __lightingRoughness: 0.85, __lightingClearcoat: 0 }],
  ['coated', { __lightingMetalness: 0, __lightingRoughness: 0.85, __lightingClearcoat: 1 }],
  ['metal-dark', { __lightingMetalness: 1, __lightingClearcoat: 0, __lightingIntensity: 0 }],
  ['metal-lit', { __lightingMetalness: 1, __lightingClearcoat: 0, __lightingIntensity: 3 }],
]) {
  const cart = path.join(out, `${name}.js`),
    image = path.join(out, `${name}.ppm`);
  fs.writeFileSync(
    cart,
    `Object.assign(globalThis,${JSON.stringify({ __lightingNoEnvironment: true, ...options })});\n` +
      source
  );
  const result = spawnSync(
    path.join(root, 'retroarch/build/harness'),
    [core, cart, '--gles', '--frames', '2', '--capture', image],
    { cwd: root, encoding: 'utf8' }
  );
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(out, `${name}.log`), log);
  assert.equal(result.status, 0, log);
  assert.match(log, /hardware context ready/);
  assert.doesNotMatch(
    log,
    /JS exception|shader compile failed|program link failed|FBO incomplete|ok=0/
  );
  const file = fs.readFileSync(image),
    header = /^P6\s+640\s+360\s+255\s/.exec(file.toString('ascii', 0, 32));
  assert.ok(header);
  images[name] = file.subarray(header[0].length);
}
const peakGreen = image => {
  let peak = 0;
  for (let y = 100; y < 260; y++)
    for (let x = 240; x < 400; x++) peak = Math.max(peak, image[(y * 640 + x) * 3 + 1]);
  return peak;
};
assert.ok(
  peakGreen(images.coated) > peakGreen(images.bare) + 20,
  'clearcoat did not add a direct-light highlight'
);
assert.ok(
  peakGreen(images['metal-lit']) > peakGreen(images['metal-dark']) + 20,
  'metal lost direct-light specular'
);
console.log(
  'Native PBR GL readback passed: direct clearcoat highlights and metallic direct-light response'
);
