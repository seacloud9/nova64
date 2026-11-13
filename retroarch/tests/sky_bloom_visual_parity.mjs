#!/usr/bin/env node
// Fixed-step captures of unchanged web demo sources on Three.js and native GL.
// Start Vite separately, then run with --base=http://127.0.0.1:5191 --seconds=30.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (key, fallback) =>
  process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5191');
const fixtureMode = option('fixture-mode', 'gradient');
const seconds = Number(option('seconds', '30'));
const carts = option(
  'carts',
  'hello-skybox,skybox-showcase,pbr-showcase,space-harrier-3d,f-zero-nova-3d,demoscene'
).split(',');
const out = path.resolve(root, option('out', 'retroarch/build/sky-bloom-parity'));
const core = path.resolve(
  root,
  option('core', `retroarch/nova64_libretro.${process.platform === 'darwin' ? 'dylib' : 'so'}`)
);
const video = !process.argv.includes('--stills-only');
if (!(seconds > 0 && seconds <= 120)) throw new Error('--seconds must be between 0 and 120');
fs.mkdirSync(out, { recursive: true });
const randomPrelude = `let __skySeed=0x4e363432;Math.random=()=>((__skySeed=(Math.imul(__skySeed,1664525)+1013904223)>>>0)/4294967296);globalThis.__skyFixtureMode=${JSON.stringify(fixtureMode)};\n`;
function run(command, args, log) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  if (log) fs.writeFileSync(log, output);
  if (
    result.status !== 0 ||
    /JS exception|shader compile failed|program link failed|cart failed|ok=0/.test(output)
  )
    throw new Error(`${command} failed: ${output.slice(-5000)}`);
  return output;
}
function timeline(cart) {
  if (cart === 'skybox-showcase')
    return [
      { frame: 120, key: '3' },
      { frame: 240, key: '4' },
      { frame: 360, key: '5' },
      { frame: 480, key: '6' },
      { frame: 600, key: '7' },
      { frame: 720, key: '8' },
      { frame: 840, key: '9' },
      { frame: 960, key: '0' },
    ];
  if (cart === 'pbr-showcase')
    return [
      { frame: 360, key: '2' },
      { frame: 720, key: '3' },
      { frame: 1080, key: '4' },
      { frame: 1440, key: '5' },
      { frame: 1800, key: '6' },
      { frame: 2160, key: '7' },
    ];
  if (cart === 'space-harrier-3d' || cart === 'f-zero-nova-3d' || cart === 'demoscene')
    return [{ frame: 90, key: ' ' }];
  return [];
}
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
const report = {
  generated: new Date().toISOString(),
  core,
  coreSha256: createHash('sha256').update(fs.readFileSync(core)).digest('hex'),
  workingTreeDirty: Boolean(run('git', ['status', '--porcelain', '--untracked-files=no']).trim()),
  execution: 'native core offscreen GL harness; not a RetroArch frontend recording',
  seconds,
  fps: 30,
  simulationFps: 60,
  width: 640,
  height: 360,
  instrumentation:
    'deterministic Math.random and fixed-step performance clock; cart source files on disk are unchanged',
  revision: run('git', ['rev-parse', 'HEAD']).trim(),
  results: [],
};
try {
  for (const cart of carts) {
    console.log(`Capturing ${cart} (${seconds}s)...`);
    const directory = path.join(out, cart),
      nativeDir = path.join(directory, 'native'),
      webDir = path.join(directory, 'web');
    fs.mkdirSync(nativeDir, { recursive: true });
    fs.mkdirSync(webDir, { recursive: true });
    // A shorter rerun must not accidentally encode stale frames from an older run.
    for (const framesDir of [nativeDir, webDir])
      for (const file of fs.readdirSync(framesDir))
        if (/^frame_\d+\.(png|ppm)$/.test(file)) fs.unlinkSync(path.join(framesDir, file));
    const source = fs.readFileSync(
      cart === 'sky-bloom-fixture' || cart === 'pbr-coating-fixture'
        ? path.join(root, 'retroarch/tests/carts', `${cart}.js`)
        : path.join(root, 'examples', cart, 'code.js'),
      'utf8'
    );
    const instrumented = path.join(directory, 'instrumented-cart.js');
    fs.writeFileSync(
      instrumented,
      randomPrelude + 'globalThis.performance={now:()=>frameCount()*1000/60};\n' + source
    );
    const frames = Math.round(seconds * 60),
      actions = timeline(cart).filter(a => a.frame <= frames);
    const nativeArgs = [
      core,
      instrumented,
      '--gles',
      '--frames',
      String(frames),
      '--capture-seq',
      nativeDir,
      '--capture-every',
      '2',
    ];
    for (const action of actions)
      nativeArgs.push('--press', `${action.frame}=${action.key === ' ' ? 'space' : action.key}`);
    if (cart === 'space-harrier-3d' && frames > 140)
      nativeArgs.push('--hold', `140-${frames}=space`);
    run(path.join(root, 'retroarch/build/harness'), nativeArgs, path.join(directory, 'native.log'));
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript(() => {
      let callbacks = new Map(),
        id = 0,
        time = 0;
      window.requestAnimationFrame = callback => {
        callbacks.set(++id, callback);
        return id;
      };
      window.cancelAnimationFrame = n => callbacks.delete(n);
      performance.now = () => time;
      window.__parityStep = () => {
        time += 1000 / 60;
        const batch = [...callbacks.values()];
        callbacks.clear();
        for (const callback of batch) callback(time);
      };
    });
    await page.route(`**/examples/${cart}/code.js*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: randomPrelude + source,
      });
    });
    await page.goto(`${base}/console.html?demo=${cart}&w=640&h=360`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => globalThis.__nova64CartLoadState?.ready || globalThis.__nova64CartLoadState?.error,
      null,
      { timeout: 60000, polling: 100 }
    );
    const renderer = await page.evaluate(() => {
      const gl = globalThis.__THREE_RENDERER__.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    const state = await page.evaluate(() => globalThis.__nova64CartLoadState);
    if (state.error) throw new Error(`${cart}: ${state.error}`);
    for (let frame = 1; frame <= frames; frame++) {
      for (const action of actions.filter(a => a.frame === frame))
        await page.keyboard.down(action.key);
      if (cart === 'space-harrier-3d' && frame === 140) await page.keyboard.down(' ');
      const data = await page.evaluate(
        capture => {
          window.__parityStep();
          return capture
            ? document.querySelector('#screen').toDataURL('image/png').split(',')[1]
            : null;
        },
        (frame - 1) % 2 === 0
      );
      for (const action of actions.filter(a => a.frame + 1 === frame))
        await page.keyboard.up(action.key);
      if ((frame - 1) % 2 === 0) {
        fs.writeFileSync(
          path.join(webDir, `frame_${String((frame - 1) / 2).padStart(5, '0')}.png`),
          Buffer.from(data, 'base64')
        );
      }
    }
    const labels = await page.evaluate(cartName => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 28;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, 1280, 28);
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText('WEB / THREE.JS — ' + cartName, 12, 20);
      ctx.fillText('NATIVE CORE / OFFSCREEN GL — ' + cartName, 652, 20);
      return canvas.toDataURL('image/png').split(',')[1];
    }, cart);
    fs.writeFileSync(path.join(directory, 'labels.png'), Buffer.from(labels, 'base64'));
    await page.close();
    // HTTP 404s from optional unrelated shell assets are retained in the report;
    // cart/runtime failures are fatal rather than silently becoming black videos.
    if (errors.some(e => /cart error|ReferenceError|TypeError|shader.*error/i.test(e)))
      throw new Error(errors.join('\n'));
    const last = Math.floor((frames - 1) / 2),
      final = String(last).padStart(5, '0');
    run('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      path.join(nativeDir, `frame_${final}.ppm`),
      path.join(directory, 'native.png'),
    ]);
    fs.copyFileSync(path.join(webDir, `frame_${final}.png`), path.join(directory, 'web.png'));
    run('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      path.join(directory, 'web.png'),
      '-i',
      path.join(directory, 'native.png'),
      '-i',
      path.join(directory, 'labels.png'),
      '-filter_complex',
      '[0:v][1:v]hstack,pad=iw:ih+28:0:28[stack];[stack][2:v]overlay=0:0',
      path.join(directory, 'comparison.png'),
    ]);
    const web = PNG.sync.read(fs.readFileSync(path.join(directory, 'web.png'))),
      native = PNG.sync.read(fs.readFileSync(path.join(directory, 'native.png')));
    let error = 0;
    for (let i = 0; i < web.data.length; i++)
      if (i % 4 !== 3) error += Math.abs(web.data[i] - native.data[i]);
    const result = {
      cart,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      frames,
      actions,
      browserErrors: errors,
      browserRenderer: renderer,
      ...(cart === 'sky-bloom-fixture' ? { fixtureMode } : {}),
      meanAbsoluteRgbError: error / (640 * 360 * 3),
      comparison: path.relative(out, path.join(directory, 'comparison.png')),
    };
    if (
      (cart === 'sky-bloom-fixture' || cart === 'pbr-coating-fixture') &&
      result.meanAbsoluteRgbError > 5
    )
      throw new Error('Fixed-camera rendering regression: mean RGB error exceeds 5/255');
    if (video) {
      run('ffmpeg', [
        '-loglevel',
        'error',
        '-y',
        '-framerate',
        '30',
        '-i',
        path.join(webDir, 'frame_%05d.png'),
        '-framerate',
        '30',
        '-i',
        path.join(nativeDir, 'frame_%05d.ppm'),
        '-i',
        path.join(directory, 'labels.png'),
        '-filter_complex',
        '[0:v][1:v]hstack,pad=iw:ih+28:0:28[stack];[stack][2:v]overlay=0:0[v]',
        '-map',
        '[v]',
        '-c:v',
        'libx264',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        path.join(directory, 'comparison.mp4'),
      ]);
      result.video = path.relative(out, path.join(directory, 'comparison.mp4'));
      if (!process.argv.includes('--keep-frames')) {
        for (const framesDir of [nativeDir, webDir])
          for (const file of fs.readdirSync(framesDir))
            if (/^frame_\d+\.(png|ppm)$/.test(file)) fs.unlinkSync(path.join(framesDir, file));
      }
    }
    report.results.push(result);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(
      `${cart}: mean RGB error ${result.meanAbsoluteRgbError.toFixed(2)}; ${result.video || result.comparison}`
    );
  }
} finally {
  await browser.close();
}
