import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { PNG } from 'pngjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'retroarch/build/storybook-hosts');
const core =
  process.env.CORE ||
  path.join(root, `retroarch/nova64_libretro.${process.platform === 'darwin' ? 'dylib' : 'so'}`);
const project = process.env.GODOT_PROJECT || path.join(root, 'nova64-godot/godot_project');
const godot = process.env.GODOT || 'godot';
fs.mkdirSync(out, { recursive: true });
function run(command, args, logPath) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 180000 });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  if (logPath) fs.writeFileSync(logPath, log);
  assert.equal(result.status, 0, `${command}: ${result.error ?? ''}\n${log}`);
  assert.doesNotMatch(
    log,
    /JS exception|SCRIPT ERROR|shader compile failed|invalid_splat|Missing, invalid or oversized|NOVA64-CONFORMANCE: FAIL/
  );
  return log;
}
run(process.execPath, ['scripts/package-storybook-worlds.mjs']);
assert.ok(fs.existsSync(core), 'Build the native core first');
assert.ok(
  fs.existsSync(path.join(root, 'retroarch/build/harness')),
  'Build the native harness first'
);
const files = unzipSync(
  fs.readFileSync(path.join(root, 'retroarch/build/storybook-portable/storybook-worlds.nova'))
);
const original = new TextDecoder().decode(files['code.js']);
function stage(name, code) {
  const directory = path.join(out, name);
  fs.mkdirSync(directory, { recursive: true });
  const data = { ...files, 'code.js': strToU8(code) };
  for (const [name, bytes] of Object.entries(data)) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  const nova = path.join(directory, 'fixture.nova');
  fs.writeFileSync(nova, zipSync(data));
  return { directory, nova };
}
function ppm(file) {
  const bytes = fs.readFileSync(file),
    header = /^P6\s+640\s+360\s+255\s/.exec(bytes.toString('ascii', 0, 32));
  assert.ok(header, 'Expected native 640x360 readback');
  return bytes.subarray(header[0].length);
}
function mae(a, b) {
  let sum = 0;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}
const report = {
  scope: 'CPU Gaussian reference; two original worlds, live one-bounce portal',
  coreSha256: createHash('sha256').update(fs.readFileSync(core)).digest('hex'),
  rendererSha256: createHash('sha256')
    .update(fs.readFileSync(path.join(root, 'runtime/shared/gaussian-worlds.h')))
    .digest('hex'),
  cases: [],
  warnings: [],
};
report.godotVersion = run(godot, ['--version']).trim();
const platformName = { darwin: 'macos', linux: 'linux', win32: 'windows' }[process.platform];
const gdManifest = fs.readFileSync(path.join(project, 'nova64.gdextension'), 'utf8');
report.godotExtensionBinaries = {};
for (const line of gdManifest.split('\n')) {
  if (!line.trim().startsWith(platformName + '.debug')) continue;
  const match = /"res:\/\/([^"\r]+)"/.exec(line);
  if (match && fs.existsSync(path.join(project, match[1])))
    report.godotExtensionBinaries[match[1]] = createHash('sha256')
      .update(fs.readFileSync(path.join(project, match[1])))
      .digest('hex');
}
const images = {};
for (const [name, fixture] of Object.entries({
  grove: { world: 0, eye: [0, 1.6, 2], yaw: 0 },
  garden: { world: 1, eye: [0, 1.6, 0.7], yaw: Math.PI },
  parallax: { world: 0, eye: [0.65, 1.6, 2], yaw: 0 },
  closed: { world: 0, eye: [0, 1.6, 2], yaw: 0, portals: false },
})) {
  const source =
    'globalThis.__splatFixture=' +
    JSON.stringify({ ...fixture, hideHud: true }) +
    ';\n' +
    original.replace('export function draw()', 'function __capturedDraw()') +
    '\nexport function draw(){__capturedDraw();console.log("SPLAT_FRAME "+JSON.stringify(__storybookState()));globalThis.__nova64_assert.results[0].name="SPLAT_FRAME "+JSON.stringify(__storybookState());}\n';
  const { directory, nova } = stage(name, source);
  const native = path.join(directory, 'native.ppm'),
    software = path.join(directory, 'software.ppm'),
    image = path.join(directory, 'godot.png');
  const log = run(
    path.join(root, 'retroarch/build/harness'),
    [core, nova, '--gles', '--frames', '3', '--capture', native],
    path.join(directory, 'native.log')
  );
  assert.match(log, /hardware context ready/);
  run(
    path.join(root, 'retroarch/build/harness'),
    [core, nova, '--frames', '3', '--capture', software],
    path.join(directory, 'software.log')
  );
  const gdLog = run(
    godot,
    [
      '--path',
      project,
      '--resolution',
      '640x360',
      '--script',
      'res://scripts/conformance_runner.gd',
      '--',
      '--cart=' + directory,
      '--frames=3',
      '--snapshot=' + image,
    ],
    path.join(directory, 'godot.log')
  );
  assert.match(gdLog, /NOVA64-CONFORMANCE: PASS/);
  const nativeRgb = ppm(native),
    softwareRgb = ppm(software),
    png = PNG.sync.read(fs.readFileSync(image));
  assert.equal(png.width, 640);
  assert.equal(png.height, 360);
  const godotRgb = Buffer.alloc(640 * 360 * 3);
  for (let i = 0; i < 640 * 360; i++)
    for (let j = 0; j < 3; j++) godotRgb[i * 3 + j] = png.data[i * 4 + j];
  const error = mae(nativeRgb, godotRgb),
    swError = mae(nativeRgb, softwareRgb);
  assert.ok(error < 2, `${name}: Godot/native image error ${error}`);
  // The harness software path uses RGB565: each channel truncates low bits.
  for (let i = 0; i < nativeRgb.length; i++) {
    const bits = i % 3 === 1 ? 6 : 5;
    const packed = nativeRgb[i] >> (8 - bits);
    const expanded = Math.floor((packed * 255) / ((1 << bits) - 1));
    assert.equal(softwareRgb[i], expanded, `${name}: RGB565 pixel ${i}`);
  }
  const colors = new Set();
  for (let i = 0; i < nativeRgb.length; i += 12)
    colors.add(nativeRgb.subarray(i, i + 3).toString('hex'));
  assert.ok(colors.size > 1000, `${name}: world geometry missing`);
  const measurements = [...log.matchAll(/SPLAT_FRAME (\{.*\})/g)].map(m => JSON.parse(m[1]));
  const gdMeasurements = [...gdLog.matchAll(/SPLAT_FRAME (\{.*\})/g)].map(m => JSON.parse(m[1]));
  assert.ok(measurements.length && gdMeasurements.length, 'Both hosts must report renderer timing');
  report.cases.push({
    name,
    godotNativeMeanRgbError: error,
    softwareGlMeanRgbError: swError,
    nativeRenderMs: measurements.map(m => m.lastRenderMs),
    godotRenderMs: gdMeasurements.map(m => m.lastRenderMs),
  });
  if (gdLog.includes('colyseus.gdextension'))
    report.warnings.push(
      'Existing Colyseus addon lacks a local macOS library; Gaussian host tests still passed.'
    );
  images[name] = nativeRgb;
  console.log(
    `${name}: native GL/software and Godot image checks PASS (RGB MAE ${error.toFixed(3)})`
  );
}
assert.ok(mae(images.grove, images.closed) > 2, 'Portal must change the destination pixels');
assert.ok(
  mae(images.grove, images.parallax) > 2,
  'Lateral camera movement must change the live view'
);
// Use the actual host input APIs to cross and return, rather than teleport fixtures.
const instrumented =
  original.replace('export function update(', 'function __walkUpdate(') +
  '\nlet __walkFrames=0;export function update(dt){__walkUpdate(dt);__walkFrames++;globalThis.__storybookSnapshot=__storybookState();if(__walkFrames===200||__walkFrames===400)console.log("SPLAT_WALK "+JSON.stringify(__storybookSnapshot));}\n';
const input = stage('input', instrumented);
const inputLog = run(
  path.join(root, 'retroarch/build/harness'),
  [core, input.nova, '--frames', '402', '--hold', '0-199=w', '--hold', '200-399=s'],
  path.join(input.directory, 'native.log')
);
const walking = [...inputLog.matchAll(/SPLAT_WALK (\{.*\})/g)].map(m => JSON.parse(m[1]));
assert.deepEqual(
  walking.map(w => w.world),
  [1, 0]
);
const gdInput = run(
  godot,
  [
    '--headless',
    '--path',
    project,
    '--script',
    'res://scripts/test_storybook_worlds.gd',
    '--',
    '--cart=' + input.directory,
  ],
  path.join(input.directory, 'godot.log')
);
assert.match(gdInput, /STORYBOOK_HOST: PASS/);
report.input = {
  native: walking,
  godot: 'portal crossing/return, garden selection and renderer reset passed',
};
report.warnings = [...new Set(report.warnings)];
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Actual native/Godot movement and reset PASS');
