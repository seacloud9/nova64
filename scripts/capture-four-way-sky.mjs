#!/usr/bin/env node
// Real Three.js, Godot, native-core and WASM-core captures. No placeholder panels.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (key, fallback) =>
  process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5193');
const out = path.resolve(root, option('out', 'retroarch/build/four-way-sky'));
const modes = option('modes', 'gradient,aurora,space,hdr,image,environment,lighting,glass').split(
  ','
);
const run = (command, args, logPath) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const log = (result.stdout || '') + (result.stderr || '');
  if (logPath) fs.writeFileSync(logPath, log);
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error || log}`);
  return log;
};
fs.mkdirSync(out, { recursive: true });
const tripleOut = path.join(out, 'three-way');
run(
  process.execPath,
  [
    'scripts/capture-three-way-sky.mjs',
    `--base=${base}`,
    `--out=${tripleOut}`,
    `--modes=${modes.join(',')}`,
    ...process.argv
      .slice(2)
      .filter(arg => arg.startsWith('--godot=') || arg.startsWith('--godot-project=')),
  ],
  path.join(out, 'three-way.log')
);
const report = JSON.parse(fs.readFileSync(path.join(tripleOut, 'report.json'), 'utf8'));
report.execution =
  'Three.js web | Godot Forward+ | native core offscreen GL | RetroArch WASM core WebGL2';
report.layout =
  '2x2: Three.js top left, Godot top right, Native Core bottom left, WASM Core bottom right';
report.stillSeconds = 6;
report.reelSeconds = modes.length * 6;
delete report.wasm;
report.wasmSha256 = createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'public/retroarch-web/nova64_libretro.wasm')))
  .digest('hex');
report.wasmGlueSha256 = createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'public/retroarch-web/nova64_libretro.js')))
  .digest('hex');
report.timing += '; WASM stepped until the fixture has completed 60 updates';
const browser = await chromium.launch({
  headless: true,
  args:
    process.platform === 'darwin'
      ? ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required']
      : ['--autoplay-policy=no-user-gesture-required'],
});
try {
  for (const mode of modes) {
    console.log(`Four-view WASM capture: ${mode}`);
    const directory = path.join(out, mode);
    fs.mkdirSync(directory, { recursive: true });
    const cart =
      mode === 'lighting'
        ? 'pbr-lighting-fixture'
        : mode === 'pbr'
          ? 'pbr-coating-fixture'
          : mode === 'glass'
            ? 'pbr-glass-fixture'
            : 'sky-bloom-fixture';
    const sourcePath = path.join(directory, 'code.js');
    const source = fs.readFileSync(path.join(root, 'retroarch/tests/carts', `${cart}.js`), 'utf8');
    fs.writeFileSync(
      sourcePath,
      `let __skySeed=0x4e363432;Math.random=()=>((__skySeed=(Math.imul(__skySeed,1664525)+1013904223)>>>0)/4294967296);globalThis.__skyFixtureMode=${JSON.stringify(mode)};globalThis.performance={now:()=>frameCount()*1000/60};let __captureUpdates=0;\n` +
        source.replace(/export function update\(/, 'function __fixtureUpdate(') +
        '\nexport function update(dt){__fixtureUpdate(dt);if(++__captureUpdates===60)console.log("FOUR_VIEW_FRAME_60");}\n'
    );
    const archive = path.join(directory, 'fixture.nova');
    run('python3', [
      '-c',
      `
import sys, zipfile, json
from pathlib import Path
source, assets, output = map(Path, sys.argv[1:])
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
    names = []
    for p in assets.rglob('*'):
        if p.is_file() and not p.name.endswith('.import'):
            name = 'assets/sky/' + p.relative_to(assets).as_posix()
            names.append(name)
            z.write(p, name)
    z.write(source, 'code.js')
    z.writestr('manifest.json', json.dumps({'main':'code.js','name':'four-view-fixture','assets':names}))
`,
      sourcePath,
      path.join(root, 'public/assets/sky'),
      archive,
    ]);
    const page = await browser.newPage({
      viewport: { width: 640, height: 360 },
      deviceScaleFactor: 1,
    });
    // Disable audio synchronization for a manually stepped graphics capture.
    const player = fs.readFileSync(path.join(root, 'public/retroarch-web/index.html'), 'utf8');
    await page.route('**/retroarch-web/index.html?**', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: player.replace('audio_driver = "openal"', 'audio_enable = "false"'),
      })
    );
    page.setDefaultTimeout(60000);
    const errors = [];
    const webglWarnings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (/WebGL:|INVALID_OPERATION|GL_INVALID/.test(message.text()))
        webglWarnings.push(message.text());
    });
    await page.addInitScript(() => {
      let id = 0,
        time = 0;
      const callbacks = new Map();
      window.requestAnimationFrame = fn => {
        callbacks.set(++id, fn);
        return id;
      };
      window.cancelAnimationFrame = key => callbacks.delete(key);
      performance.now = () => time;
      window.__wasmCaptureStep = () => {
        time += 1000 / 60;
        const batch = [...callbacks.values()];
        callbacks.clear();
        for (const callback of batch) callback(time);
      };
    });
    await page.route('**/__four-view-fixture.nova', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/octet-stream',
        body: fs.readFileSync(archive),
      })
    );
    await page.goto(`${base}/retroarch-web/index.html?cart=/__four-view-fixture.nova&touch=0`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => window.nova64RetroArch?.state !== 'loading' && window.nova64RetroArch?.state,
      null,
      { polling: 100, timeout: 60000 }
    );
    let result;
    for (let tick = 0; tick < 300; tick++) {
      result = await page.evaluate(() => {
        window.__wasmCaptureStep();
        const api = window.nova64RetroArch;
        const log = api.log.map(String);
        const done = log.some(line => line.includes('FOUR_VIEW_FRAME_60'));
        const canvas = document.querySelector('#canvas');
        return {
          state: api.state,
          error: api.error,
          done,
          log: log.slice(-30),
          png: done ? canvas.toDataURL('image/png').split(',')[1] : null,
        };
      });
      if (result.error || result.done) break;
      await page.waitForTimeout(10);
    }
    if (
      !result.done ||
      errors.length ||
      webglWarnings.length ||
      /JS exception|shader compile failed|program link failed|FBO incomplete/.test(
        result.log.join('\n')
      )
    )
      throw new Error(
        `WASM ${mode}: ${JSON.stringify({ ...result, png: undefined, errors, webglWarnings })}`
      );
    fs.writeFileSync(path.join(directory, 'wasm.log'), result.log.join('\n'));
    fs.writeFileSync(path.join(directory, 'wasm.png'), Buffer.from(result.png, 'base64'));
    const titles = [
      'THREE.JS / WEB',
      'GODOT / FORWARD+',
      'NATIVE CORE / OFFSCREEN GL',
      'WASM CORE / RETROARCH WEB',
    ];
    const labels = await page.evaluate(
      ({ titles, mode }) =>
        titles.map(title => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 36;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#101018';
          ctx.fillRect(0, 0, 640, 36);
          ctx.fillStyle = 'white';
          ctx.font = '16px monospace';
          ctx.fillText(`${title} — ${mode.toUpperCase()}`, 12, 24);
          return canvas.toDataURL('image/png').split(',')[1];
        }),
      { titles, mode }
    );
    await page.close();
    labels.forEach((bytes, i) =>
      fs.writeFileSync(path.join(directory, `label-${i}.png`), Buffer.from(bytes, 'base64'))
    );
    const images = [
      path.join(tripleOut, mode, cart, 'web.png'),
      path.join(tripleOut, mode, 'godot.png'),
      path.join(tripleOut, mode, cart, 'native.png'),
      path.join(directory, 'wasm.png'),
    ];
    run('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      ...images.flatMap(file => ['-i', file]),
      ...titles.flatMap((_, i) => ['-i', path.join(directory, `label-${i}.png`)]),
      '-filter_complex',
      titles
        .map((_, i) => `[${i}:v]pad=640:396:0:36[p${i}];[p${i}][${i + 4}:v]overlay=0:0[v${i}]`)
        .join(';') + ';[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|640_0|0_396|640_396',
      path.join(directory, 'comparison.png'),
    ]);
    const native = PNG.sync.read(fs.readFileSync(images[2])),
      wasm = PNG.sync.read(fs.readFileSync(images[3]));
    if (wasm.width !== 640 || wasm.height !== 360) throw new Error('Unexpected WASM canvas size');
    let error = 0;
    for (let i = 0; i < native.data.length; i++)
      if (i % 4 !== 3) error += Math.abs(native.data[i] - wasm.data[i]);
    const row = report.results.find(row => row.mode === mode);
    row.wasmVsNativeMeanAbsoluteRgbError = error / (640 * 360 * 3);
    row.wasmCompletedUpdates = 60;
    row.wasmWebglWarnings = webglWarnings;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (row.wasmVsNativeMeanAbsoluteRgbError > 5)
      throw new Error(`WASM/native fixture regression: ${mode} RGB error exceeds 5/255`);
  }
} finally {
  await browser.close();
}
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
  '1/6',
  '-i',
  path.join(reel, '%02d.png'),
  '-frames:v',
  String(modes.length * 180),
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
  `<!doctype html><meta charset="utf-8"><title>Nova64 four-view rendering comparison</title><style>body{background:#101018;color:#eee;font:16px system-ui;margin:24px}img,video{width:100%;max-width:1280px}a{color:#8df}</style><h1>Three.js · Godot · Native Core · WASM Core</h1><p>Top: Three.js / Godot. Bottom: native core / actual RetroArch WASM core. Controlled fixtures at 60 updates; Godot wall-clock sky effects may differ. Native uses the offscreen harness.</p><video controls src="still-comparison-reel.mp4"></video><p>Still-image slideshow. <a href="report.json">Runtime identities, errors and warnings</a>.</p>${modes.map(mode => `<h2>${mode}</h2><img src="${mode}/comparison.png" alt="${mode}: four rendering targets">`).join('')}`
);
console.log(`Four-view gallery: ${path.join(out, 'index.html')}`);
