#!/usr/bin/env node
// Current working-tree comparison. Godot space may use a baked panorama;
// fixed simulation steps do not make its wall-clock shaders deterministic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { resolveGodotBinary, checkGodot } from './lib/godot-binary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (key, fallback) =>
  process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5191');
const out = path.resolve(root, option('out', 'retroarch/build/three-way-sky'));
const godot = option(
  'godot',
  resolveGodotBinary() ||
    (process.platform === 'darwin' ? '/Applications/Godot.app/Contents/MacOS/Godot' : '')
);
const godotVersion = checkGodot(godot);
const project = path.join(root, 'nova64-godot/godot_project');
const modes = option('modes', 'gradient,aurora,space,hdr,image,environment,pbr').split(',');
const validModes = new Set(['gradient', 'aurora', 'space', 'hdr', 'image', 'environment', 'pbr']);
if (modes.some(mode => !validModes.has(mode))) throw new Error('Unknown comparison mode');
fs.mkdirSync(out, { recursive: true });
const run = (command, args, logPath) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const log = (result.stdout || '') + (result.stderr || '');
  if (logPath) fs.writeFileSync(logPath, log);
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error || log}`);
  return log;
};
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = {
  generated: new Date().toISOString(),
  revision: run('git', ['rev-parse', 'HEAD']).trim(),
  workingTreeDirty: Boolean(run('git', ['status', '--porcelain']).trim()),
  godotVersion,
  godotBridgeSourceSha256: hash(path.join(root, 'nova64-godot/gdextension/src/bridge.cpp')),
  godotShimSha256: hash(path.join(project, 'shim/nova64-compat.js')),
  godotRunnerSha256: hash(path.join(project, 'scripts/conformance_runner.gd')),
  execution:
    'Three.js browser | Godot Forward+ | offscreen native core GL (not RetroArch frontend)',
  timing:
    '60 fixed updates; Godot snapshot has extra render-only frames; wall-clock effects may differ',
  wasm: 'Not captured: Emscripten build and a runnable RetroArch web frontend are required',
  results: [],
};
// Include actual extension identity when the current macOS project uses it.
const extension = path.join(project, 'bin/libnova64.macos.template_debug.universal.dylib');
if (fs.existsSync(extension)) report.godotExtensionSha256 = hash(extension);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const mode of modes) {
    console.log(`Three-way capture: ${mode}`);
    const directory = path.join(out, mode);
    fs.mkdirSync(directory, { recursive: true });
    const cart = mode === 'pbr' ? 'pbr-coating-fixture' : 'sky-bloom-fixture';
    run(
      process.execPath,
      [
        'retroarch/tests/sky_bloom_visual_parity.mjs',
        `--base=${base}`,
        `--carts=${cart}`,
        `--fixture-mode=${mode}`,
        '--seconds=1',
        '--stills-only',
        `--out=${directory}`,
      ],
      path.join(directory, 'web-native.log')
    );
    const pairDir = path.join(directory, cart);
    const source = fs.readFileSync(path.join(root, 'retroarch/tests/carts', `${cart}.js`), 'utf8');
    const cartDir = path.join(directory, 'godot-cart');
    fs.mkdirSync(cartDir, { recursive: true });
    const seedPrelude = `let __skySeed=0x4e363432;Math.random=()=>((__skySeed=(Math.imul(__skySeed,1664525)+1013904223)>>>0)/4294967296);globalThis.__skyFixtureMode=${JSON.stringify(mode)};\n`;
    fs.writeFileSync(path.join(cartDir, 'code.js'), seedPrelude + source);
    const godotImage = path.join(directory, 'godot.png');
    fs.rmSync(godotImage, { force: true });
    const log = run(
      godot,
      [
        '--path',
        project,
        '--resolution',
        '640x360',
        '--script',
        'res://scripts/conformance_runner.gd',
        '--',
        `--cart=${path.join(cartDir, 'code.js')}`,
        '--frames=60',
        `--snapshot=${godotImage}`,
      ],
      path.join(directory, 'godot.log')
    );
    if (
      !fs.existsSync(godotImage) ||
      !log.includes('NOVA64-CONFORMANCE: PASS (visual)') ||
      /SCRIPT ERROR|JS exception|\[nova64\].*(?:Exception|ReferenceError|TypeError)/i.test(log)
    )
      throw new Error(`Godot capture failed: ${log}`);
    const warnings = log.split('\n').filter(line => /ERROR:|WARNING:/i.test(line));
    const labelData = await page.evaluate(title => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 36;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101018';
      ctx.fillRect(0, 0, 1920, 36);
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ['THREE.JS / WEB', 'GODOT / FORWARD+', 'NATIVE CORE / OFFSCREEN GL'].forEach((label, i) =>
        ctx.fillText(`${label} — ${title}`, i * 640 + 12, 24)
      );
      return canvas.toDataURL('image/png').split(',')[1];
    }, mode.toUpperCase());
    fs.writeFileSync(path.join(directory, 'labels.png'), Buffer.from(labelData, 'base64'));
    run('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      path.join(pairDir, 'web.png'),
      '-i',
      godotImage,
      '-i',
      path.join(pairDir, 'native.png'),
      '-i',
      path.join(directory, 'labels.png'),
      '-filter_complex',
      '[0:v][1:v][2:v]hstack=inputs=3,pad=iw:ih+36:0:36[s];[s][3:v]overlay=0:0',
      path.join(directory, 'comparison.png'),
    ]);
    const web = PNG.sync.read(fs.readFileSync(path.join(pairDir, 'web.png')));
    const metrics = {};
    for (const [name, imagePath] of [
      ['godot', godotImage],
      ['native', path.join(pairDir, 'native.png')],
    ]) {
      const actual = PNG.sync.read(fs.readFileSync(imagePath));
      if (actual.width !== 640 || actual.height !== 360)
        throw new Error(`Wrong ${name} capture size`);
      let error = 0;
      for (let i = 0; i < web.data.length; i++)
        if (i % 4 !== 3) error += Math.abs(web.data[i] - actual.data[i]);
      metrics[name] = error / (640 * 360 * 3);
    }
    const pairReport = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
    report.results.push({
      mode,
      fixtureSha256: hash(path.join(root, 'retroarch/tests/carts', `${cart}.js`)),
      nativeCoreSha256: pairReport.coreSha256,
      warnings,
      meanAbsoluteRgbError: metrics,
    });
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
} finally {
  await browser.close();
}
// A clearly identified still-image reel, not footage of running animation.
run('ffmpeg', [
  '-loglevel',
  'error',
  '-y',
  ...modes.flatMap(mode => ['-i', path.join(out, mode, 'comparison.png')]),
  '-filter_complex',
  (modes.length === 1
    ? '[0:v]'
    : modes.map((_, i) => `[${i}:v]`).join('') + `vstack=inputs=${modes.length},`) +
    'scale=1280:-2',
  path.join(out, 'contact-sheet.png'),
]);
const reel = path.join(out, 'reel');
fs.mkdirSync(reel, { recursive: true });
modes.forEach((mode, i) =>
  fs.copyFileSync(
    path.join(out, mode, 'comparison.png'),
    path.join(reel, `${String(i).padStart(2, '0')}.png`)
  )
);
run('ffmpeg', [
  '-loglevel',
  'error',
  '-y',
  '-framerate',
  '1/3',
  '-i',
  path.join(reel, '%02d.png'),
  '-frames:v',
  String(modes.length * 90),
  '-r',
  '30',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  path.join(out, 'still-comparison-reel.mp4'),
]);
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Nova64 three-way sky comparison</title><style>body{background:#101018;color:#eee;font:16px system-ui;margin:24px}img,video{width:100%;max-width:1920px}a{color:#8df}</style><h1>Three.js web | Godot | Native core</h1><p>Controlled sky and PBR fixtures, 60 fixed updates. Native uses the offscreen GL harness. Godot space may use a baked panorama; wall-clock effects can differ. WASM is not captured.</p><video controls src="still-comparison-reel.mp4"></video><p>Reel assembled from still images. <a href="report.json">Capture metadata and warnings</a>.</p>${modes.map(mode => `<h2>${mode}</h2><img src="${mode}/comparison.png" alt="${mode}: Three.js, Godot and native comparison">`).join('')}`
);
console.log(`Three-way comparison saved: ${path.join(out, 'index.html')}`);
