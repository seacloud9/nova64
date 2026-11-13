#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const core = path.resolve(
  root,
  process.env.CORE || `retroarch/nova64_libretro.${process.platform === 'darwin' ? 'dylib' : 'so'}`
);
const directory = path.join(root, 'retroarch/build/sky-bloom-tests');
fs.mkdirSync(directory, { recursive: true });
const build = spawnSync(process.execPath, ['scripts/build-nova.mjs', 'pbr-showcase'], {
  cwd: root,
  encoding: 'utf8',
});
assert.equal(build.status, 0, build.stdout + build.stderr);
const archive = path.join(directory, 'sky-bloom-api.nova');
const pack = spawnSync(
  'python3',
  [
    '-c',
    `
import sys, zipfile, json
root, output = sys.argv[1:]
with zipfile.ZipFile(root + '/examples/pbr-showcase/pbr-showcase.nova') as source, zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
    assert 'assets/sky/hdr/studio_small_09_1k.hdr' in source.namelist()
    assert 'assets/sky/hdr/CREDITS.md' in source.namelist()
    for name in source.namelist():
        if name.startswith('assets/sky/'):
            target.writestr(name, source.read(name))
    target.writestr('code.js', open(root + '/retroarch/tests/carts/sky-bloom-api.js').read())
    target.writestr('manifest.json', json.dumps({'main':'code.js','name':'sky-bloom-api','assets':[n for n in source.namelist() if n.startswith('assets/sky/')]}))
`,
    root,
    archive,
  ],
  { encoding: 'utf8' }
);
assert.equal(pack.status, 0, pack.stdout + pack.stderr);
for (const hardware of [false, true]) {
  const result = spawnSync(
    path.join(root, 'retroarch/build/harness'),
    [
      core,
      archive,
      ...(hardware ? ['--gles'] : []),
      '--frames',
      '90',
      '--capture',
      path.join(directory, hardware ? 'hardware.ppm' : 'software.ppm'),
    ],
    { cwd: os.tmpdir(), encoding: 'utf8' }
  );
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(directory, hardware ? 'hardware.log' : 'software.log'), log);
  assert.equal(result.status, 0, log);
  assert.match(log, /SKY_BLOOM_API_PASS/, log);
  assert.doesNotMatch(
    log,
    /JS exception|shader compile failed|program link failed|cart failed|ok=0|FBO incomplete/,
    log
  );
  if (hardware)
    assert.match(
      log,
      /hardware context ready/,
      'Hardware test must not silently fall back to software'
    );
  console.log(`Sky/bloom API and lifecycle smoke: ${hardware ? 'native GL' : 'software'} passed`);
}

// Read back actual GL pixels: zero coat must preserve the base; strength and
// roughness must both affect the rendered environment layer, not just getters.
const coatingSource = fs.readFileSync(
  path.join(root, 'retroarch/tests/carts/pbr-coating-fixture.js'),
  'utf8'
);
const coatingPixels = [];
for (const [name, amount, roughness] of [
  ['omitted', 'omitted', 0.05],
  ['zero', 0, 0.05],
  ['glossy', 1, 0.05],
  ['rough', 1, 0.9],
]) {
  const cartPath = path.join(directory, `coat-${name}.js`);
  const imagePath = path.join(directory, `coat-${name}.ppm`);
  fs.writeFileSync(
    cartPath,
    `globalThis.__coatAmount=${JSON.stringify(amount)};globalThis.__coatRoughness=${roughness};\n` +
      coatingSource
  );
  const result = spawnSync(
    path.join(root, 'retroarch/build/harness'),
    [core, cartPath, '--gles', '--frames', '2', '--capture', imagePath],
    { cwd: root, encoding: 'utf8' }
  );
  const log = result.stdout + result.stderr;
  assert.equal(result.status, 0, log);
  assert.match(log, /hardware context ready/);
  assert.doesNotMatch(
    log,
    /JS exception|shader compile failed|program link failed|cart failed|ok=0/
  );
  coatingPixels.push(fs.readFileSync(imagePath));
}
assert.deepEqual(coatingPixels[0], coatingPixels[1], 'zero coat changed base rendering');
for (const [a, b, label] of [
  [1, 2, 'coat strength'],
  [2, 3, 'coat roughness'],
]) {
  let changed = 0;
  assert.equal(coatingPixels[a].length, coatingPixels[b].length);
  for (let i = 0; i < coatingPixels[a].length; i++)
    if (Math.abs(coatingPixels[a][i] - coatingPixels[b][i]) > 3) changed++;
  assert.ok(changed > 500, `${label} did not meaningfully affect rendered pixels (${changed})`);
}
console.log(
  'Clearcoat GL readback: zero preserves base; strength and roughness change reflections'
);
