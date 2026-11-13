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
const directory = path.join(root, 'retroarch/build/glass-tests');
fs.mkdirSync(directory, { recursive: true });
const source = fs.readFileSync(
  path.join(root, 'retroarch/tests/carts/pbr-glass-fixture.js'),
  'utf8'
);
const images = new Map();
for (const [name, options] of [
  ['glass', {}],
  ['glass-last', { __glassLast: true }],
  ['thin', { __glassThickness: 0 }],
  ['ior-one', { __glassIor: 1 }],
  ['rough', { __glassRoughness: 0.9 }],
  ['opaque', { __glassTransmission: 0 }],
  ['absorption', { __glassAttenuationColor: 0x22ff44, __glassAttenuationDistance: 1 }],
  ['unbounded', { __glassAttenuationColor: 0x22ff44, __glassAttenuationDistance: Infinity }],
]) {
  const cartPath = path.join(directory, `${name}.js`);
  const imagePath = path.join(directory, `${name}.ppm`);
  const prelude = Object.entries(options)
    .map(
      ([key, value]) =>
        `globalThis.${key}=${value === Infinity ? 'Infinity' : JSON.stringify(value)};`
    )
    .join('');
  fs.writeFileSync(cartPath, prelude + '\n' + source);
  const result = spawnSync(
    path.join(root, 'retroarch/build/harness'),
    [core, cartPath, '--gles', '--frames', '2', '--capture', imagePath],
    { cwd: root, encoding: 'utf8' }
  );
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(directory, `${name}.log`), log);
  assert.equal(result.status, 0, log);
  assert.match(log, /hardware context ready/);
  assert.doesNotMatch(
    log,
    /JS exception|shader compile failed|program link failed|FBO incomplete|ok=0/
  );
  const file = fs.readFileSync(imagePath);
  const header = /^P6\s+640\s+360\s+255\s/.exec(file.toString('ascii', 0, 32));
  assert.ok(header, 'Unexpected GL readback format');
  images.set(name, file.subarray(header[0].length));
}
assert.deepEqual(images.get('glass'), images.get('glass-last'), 'glass depended on creation order');
assert.deepEqual(
  images.get('glass'),
  images.get('unbounded'),
  'infinite attenuation distance tinted the glass'
);
const center = images.get('glass').subarray((180 * 640 + 320) * 3, (180 * 640 + 320) * 3 + 3);
assert.ok(center[1] + center[2] > 200, `Background did not transmit through the glass: ${center}`);
const absorbed = images.get('absorption')[(180 * 640 + 320) * 3 + 2];
assert.ok(absorbed < center[2] - 20, 'glass absorption did not reduce the blue channel');
for (const name of ['thin', 'ior-one', 'rough', 'opaque', 'absorption']) {
  let changed = 0;
  const a = images.get('glass'),
    b = images.get(name);
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 3) changed++;
  assert.ok(changed > 500, `${name} did not meaningfully affect refraction: ${changed} channels`);
}
console.log(
  'Native glass GL readback passed: background transmission, creation order, thickness, IOR, roughness and opaque control'
);
