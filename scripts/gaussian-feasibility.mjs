#!/usr/bin/env node
// Pixel-checked Three.js feasibility capture, not a four-host feature claim.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { makeSyntheticPly } from '../experiments/gaussian-splatting/synthetic.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (key, fallback) =>
  process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5193'),
  out = path.resolve(root, option('out', 'retroarch/build/gaussian-prototype'));
const seconds = Number(option('seconds', '48'));
assert.ok(seconds > 0 && seconds <= 120);
fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(root, 'experiments/gaussian-splatting/synthetic.ply'));
assert.ok(fixture.equals(Buffer.from(makeSyntheticPly())), 'Synthetic PLY is out of date');
fs.writeFileSync(path.join(out, 'synthetic.ply'), fixture);
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
const report = {
  generated: new Date().toISOString(),
  scope: 'Three.js feasibility only; synthetic DC Gaussian PLY, synchronous bounded CPU sorting',
  fixtureSha256: createHash('sha256').update(fixture).digest('hex'),
  checks: [],
  sourceSha256: Object.fromEntries(
    ['cart.js', 'data.js', 'renderer.js', 'synthetic.js'].map(name => [
      name,
      createHash('sha256')
        .update(fs.readFileSync(path.join(root, 'experiments/gaussian-splatting', name)))
        .digest('hex'),
    ])
  ),
};
async function load(mode) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      /shader|WebGL|cart.*error|TypeError|ReferenceError/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.addInitScript(mode => {
    window.__gaussianMode = mode;
    window.__gaussianRealNow = performance.now.bind(performance);
    let id = 0,
      time = 0;
    const callbacks = new Map();
    performance.now = () => time;
    window.requestAnimationFrame = callback => {
      callbacks.set(++id, callback);
      return id;
    };
    window.cancelAnimationFrame = key => callbacks.delete(key);
    window.__gaussianStep = () => {
      time += 1000 / 60;
      const batch = [...callbacks.values()];
      callbacks.clear();
      for (const callback of batch) callback(time);
    };
  }, mode);
  await page.goto(`${base}/console.html?path=/experiments/gaussian-splatting/cart.js&w=640&h=360`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () => globalThis.__nova64CartLoadState?.ready || globalThis.__nova64CartLoadState?.error,
    null,
    { polling: 100, timeout: 60000 }
  );
  const state = await page.evaluate(() => globalThis.__nova64CartLoadState);
  assert.equal(state.error, '', JSON.stringify(state));
  return { page, errors };
}
async function frame(page, name) {
  const data = await page.evaluate(() => {
    window.__gaussianStep();
    return document.querySelector('#screen').toDataURL('image/png').split(',')[1];
  });
  const buffer = Buffer.from(data, 'base64');
  if (name) fs.writeFileSync(path.join(out, `${name}.png`), buffer);
  return PNG.sync.read(buffer);
}
const pixel = (png, x, y) =>
  Array.from(png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3));
function moments(png) {
  let mass = 0,
    xx = 0,
    yy = 0,
    xy = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const p = pixel(png, x, y),
        w = Math.max(0, Math.min(...p) - 25);
      mass += w;
      xx += w * (x - 320) ** 2;
      yy += w * (y - 180) ** 2;
      xy += w * (x - 320) * (y - 180);
    }
  assert.ok(mass > 10000, 'Gaussian ellipse is blank');
  const mid = (xx + yy) / 2,
    delta = Math.hypot((xx - yy) / 2, xy);
  return { ratio: Math.sqrt((mid + delta) / (mid - delta)), cross: xy / mass };
}
try {
  for (const mode of ['ellipse', 'sort', 'occlusion']) {
    const { page, errors } = await load(mode);
    for (let i = 0; i < 3; i++) await frame(page);
    const image = await frame(page, mode);
    if (mode === 'ellipse') {
      const initial = moments(image);
      assert.ok(initial.ratio > 3, 'Anisotropic splat rendered as a round sprite');
      assert.ok(initial.cross < -20, 'Wrong Gaussian orientation');
      await page.evaluate(() => (globalThis.__gaussianProbe.first.rotation.z = Math.PI / 2));
      const rotated = moments(await frame(page, 'ellipse-rotated'));
      assert.ok(rotated.cross > 20, 'Object rotation did not rotate covariance');
      report.checks.push({ mode, ratio: initial.ratio, rotatedRatio: rotated.ratio });
    } else if (mode === 'sort') {
      const initial = pixel(image, 320, 180);
      assert.ok(initial[2] > initial[0] + 30, 'Front blue splat was not composited last');
      await page.evaluate(() => {
        nova64.camera.setCameraPosition(0, 0, -5);
        nova64.camera.setCameraTarget(0, 0, 0);
      });
      const reversed = pixel(await frame(page, 'sort-reversed'), 320, 180);
      assert.ok(reversed[0] > reversed[2] + 30, 'Camera reversal failed global sorting');
      report.checks.push({ mode, initial, reversed });
    } else {
      const center = pixel(image, 320, 180),
        side = pixel(image, 375, 180);
      assert.ok(center[2] > 150 && center[0] < 80, 'Gaussian ignored opaque cube depth');
      assert.ok(side[0] > side[2] + 30, 'Gaussian missing outside the occluder');
      report.checks.push({ mode, center, side });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  const { page, errors } = await load('showcase');
  for (let i = 0; i < 3; i++) await frame(page);
  const stats = await page.evaluate(() => {
    const { splats } = globalThis.__gaussianProbe,
      camera = nova64.camera.getCamera(),
      renderer = nova64.scene.getRenderer();
    const gl = renderer.getContext(),
      debug = gl.getExtension('WEBGL_debug_renderer_info');
    const samples = [];
    for (let i = 0; i < 40; i++) {
      const start = window.__gaussianRealNow();
      splats.prepare(camera, 640, 360);
      samples.push(window.__gaussianRealNow() - start);
    }
    samples.sort((a, b) => a - b);
    return {
      visible: splats.stats.visible,
      normalizedInputBytes: splats.stats.normalizedInputBytes,
      attributeBytes: splats.stats.attributeBytes,
      prepareMedianMs: samples[20],
      prepareP95Ms: samples[38],
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    };
  });
  assert.equal(stats.visible, 2304);
  report.syntheticScene = stats;
  report.timingMeaning =
    'CPU transforms + global depth sort + attribute packing; excludes GPU draw, not gameplay FPS or peak memory';
  const video = !process.argv.includes('--checks-only');
  if (video) {
    const dir = path.join(out, 'frames');
    fs.mkdirSync(dir, { recursive: true });
    for (const file of fs.readdirSync(dir))
      if (/^frame_\d+\.png$/.test(file)) fs.unlinkSync(path.join(dir, file));
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      const data = await page.evaluate(
        capture => {
          window.__gaussianStep();
          return capture
            ? document.querySelector('#screen').toDataURL('image/png').split(',')[1]
            : null;
        },
        i % 2 === 0
      );
      if (data)
        fs.writeFileSync(
          path.join(dir, `frame_${String(i / 2).padStart(5, '0')}.png`),
          Buffer.from(data, 'base64')
        );
    }
    const frames = fs
      .readdirSync(dir)
      .filter(file => file.endsWith('.png'))
      .sort();
    fs.copyFileSync(path.join(dir, frames[0]), path.join(out, 'showcase.png'));
    const result = spawnSync(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-y',
        '-framerate',
        '30',
        '-i',
        path.join(dir, 'frame_%05d.png'),
        '-c:v',
        'libx264',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        path.join(out, 'showcase.mp4'),
      ],
      { encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    for (const file of frames) fs.unlinkSync(path.join(dir, file));
    report.videoSeconds = seconds;
  }
  let disposed = await page.evaluate(async () => {
    const old = globalThis.__gaussianProbe.splats;
    let releases = 0;
    old.mesh.geometry.addEventListener('dispose', () => releases++);
    await globalThis.__nova64Runtime.loadCart('/examples/hello-skybox/code.js');
    return {
      disposed: old.disposed,
      releases,
      visible: old.stats.visible,
      attached: !!old.root.parent,
    };
  });
  assert.deepEqual(disposed, { disposed: true, releases: 1, visible: 0, attached: false });
  report.checks.push({ mode: 'cart-reset', ...disposed });
  assert.deepEqual(errors, []);
  await page.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
