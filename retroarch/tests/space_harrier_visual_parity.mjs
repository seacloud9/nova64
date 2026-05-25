#!/usr/bin/env node
// Focused web-vs-RetroArch captures for the Space Harrier 3D port. The report
// emphasizes average color and broad field similarity so palette drift is easy
// to spot before chasing smaller geometry differences.

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RETROARCH_DIR = path.resolve(SCRIPT_DIR, '..');
const ROOT = path.resolve(RETROARCH_DIR, '..');
const DEFAULT_OUT = path.join(RETROARCH_DIR, 'build', 'space-harrier-parity');
const RETRO_CART_MODES = new Set(['web', 'port']);
const GUARD_PROFILES = {
  web: {
    minAverageScore: 0.7,
    minMomentScore: 0.7,
    minSkyColorSimilarity: 0.65,
    minEdgeLumaRatio: 0.38,
    minSharpnessRatio: 0.2,
    maxAbsSaturationDelta: 0.35,
  },
  port: {
    minAverageScore: 0.88,
    minMomentScore: 0.85,
    minSkyColorSimilarity: 0.95,
    minEdgeLumaRatio: 0.75,
    minSharpnessRatio: 0.85,
    maxAbsSaturationDelta: 0.15,
  },
};

const MOMENTS = [
  { id: 'start', label: 'START_SCREEN', webAction: null, retroFrames: 120, retroArgs: {} },
  {
    id: 'play',
    label: 'GAMEPLAY',
    webAction: 'start',
    retroFrames: 180,
    retroArgs: {
      web: ['--key', 'space'],
      port: ['--btn', 'b'],
    },
  },
];

const WEB_RANDOM_PRELUDE = `
(() => {
  let seed = 0x4e363432;
  Math.random = function nova64ParityRandom() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
})();
`;

function parseArgs(argv) {
  const opts = {
    baseUrl: '',
    noStartServer: false,
    outDir: DEFAULT_OUT,
    port: 5178,
    retroCart: 'web',
    guard: null,
    thresholds: {},
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--no-start-server') opts.noStartServer = true;
    else if (arg.startsWith('--base-url=')) opts.baseUrl = arg.slice('--base-url='.length);
    else if (arg.startsWith('--out=')) opts.outDir = path.resolve(arg.slice('--out='.length));
    else if (arg.startsWith('--port=')) opts.port = Number(arg.slice('--port='.length));
    else if (arg.startsWith('--guard=')) {
      opts.guard = arg.slice('--guard='.length);
      if (!GUARD_PROFILES[opts.guard]) {
        throw new Error(`--guard must be one of: ${Object.keys(GUARD_PROFILES).join(', ')}`);
      }
    }
    else if (arg.startsWith('--min-average=')) opts.thresholds.minAverageScore = parseThreshold(arg, '--min-average=');
    else if (arg.startsWith('--min-score=')) opts.thresholds.minAverageScore = parseThreshold(arg, '--min-score=');
    else if (arg.startsWith('--min-moment-score=')) opts.thresholds.minMomentScore = parseThreshold(arg, '--min-moment-score=');
    else if (arg.startsWith('--min-sky=')) opts.thresholds.minSkyColorSimilarity = parseThreshold(arg, '--min-sky=');
    else if (arg.startsWith('--min-edge-luma-ratio=')) {
      opts.thresholds.minEdgeLumaRatio = parseThreshold(arg, '--min-edge-luma-ratio=');
    }
    else if (arg.startsWith('--min-edge-center=')) opts.thresholds.minEdgeToCenter = parseThreshold(arg, '--min-edge-center=');
    else if (arg.startsWith('--min-sharpness-ratio=')) {
      opts.thresholds.minSharpnessRatio = parseThreshold(arg, '--min-sharpness-ratio=');
    }
    else if (arg.startsWith('--max-saturation-delta=')) {
      opts.thresholds.maxAbsSaturationDelta = parseThreshold(arg, '--max-saturation-delta=');
    }
    else if (arg.startsWith('--retro-cart=')) {
      opts.retroCart = arg.slice('--retro-cart='.length);
      if (!RETRO_CART_MODES.has(opts.retroCart)) {
        throw new Error(`--retro-cart must be one of: ${[...RETRO_CART_MODES].join(', ')}`);
      }
    }
    else throw new Error(`unknown option: ${arg}`);
  }

  opts.baseUrl ||= `http://127.0.0.1:${opts.port}`;
  opts.thresholds = { ...(opts.guard ? GUARD_PROFILES[opts.guard] : {}), ...opts.thresholds };
  return opts;
}

function parseThreshold(arg, prefix) {
  const raw = arg.slice(prefix.length);
  const value = Number(raw.endsWith('%') ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(value)) throw new Error(`${prefix}${raw} must be a number`);
  return value > 1 ? value / 100 : value;
}

function ensureDirs(outDir) {
  for (const dir of [
    outDir,
    path.join(outDir, 'browser'),
    path.join(outDir, 'retroarch'),
    path.join(outDir, 'diff'),
    path.join(outDir, 'packages'),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result;
}

function packageWebCart(opts) {
  const novaPath = path.join(opts.outDir, 'packages', 'space-harrier-3d-web.nova');
  const codePath = path.join(ROOT, 'examples', 'space-harrier-3d', 'code.js');
  const metaPath = path.join(ROOT, 'examples', 'space-harrier-3d', 'meta.json');
  const seededCodePath = path.join(opts.outDir, 'packages', 'space-harrier-3d-web-code.js');
  fs.writeFileSync(seededCodePath, `${WEB_RANDOM_PRELUDE}\n${fs.readFileSync(codePath, 'utf8')}`);
  const zipScript = `
import os
import sys
import zipfile

code_path, meta_path, nova_path = sys.argv[1:]
with zipfile.ZipFile(nova_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.write(code_path, 'code.js')
    if os.path.exists(meta_path):
        archive.write(meta_path, 'meta.json')
`;
  run('python3', ['-c', zipScript, seededCodePath, metaPath, novaPath]);
  return novaPath;
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function isServerReady(baseUrl) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer(opts) {
  if (await isServerReady(opts.baseUrl)) return null;
  if (opts.noStartServer) throw new Error(`${opts.baseUrl} is not reachable and --no-start-server was used`);

  const child = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', String(opts.port)], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));

  const started = Date.now();
  while (!(await isServerReady(opts.baseUrl))) {
    if (Date.now() - started > 120000) {
      child.kill('SIGTERM');
      throw new Error(`timed out waiting for ${opts.baseUrl}`);
    }
    await wait(500);
  }
  return child;
}

async function captureBrowser(opts) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });
  if (opts.retroCart === 'web') {
    await page.addInitScript({ content: WEB_RANDOM_PRELUDE });
  }

  await page.goto(`${opts.baseUrl}/console.html?demo=space-harrier-3d`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.waitForSelector('#screen', { timeout: 30000 });
  await wait(1800);

  const outputs = new Map();
  for (const moment of MOMENTS) {
    if (moment.webAction === 'start') {
      await page.keyboard.press('Space');
      await wait(1800);
    }
    const outPath = path.join(opts.outDir, 'browser', `${moment.id}-${moment.label}.png`);
    await page.locator('#screen').screenshot({ path: outPath });
    outputs.set(moment.id, { path: outPath });
    console.log(`[browser] ${moment.id} ${path.relative(ROOT, outPath)}`);
  }

  await browser.close();
  return outputs;
}

function captureRetroArch(opts) {
  const outputs = new Map();
  const retroCartPath =
    opts.retroCart === 'web' ? packageWebCart(opts) : path.join(RETROARCH_DIR, 'games', 'space-harrier-3d.js');

  for (const moment of MOMENTS) {
    const ppmPath = path.join(opts.outDir, 'retroarch', `${moment.id}-${moment.label}.ppm`);
    const pngPath = path.join(opts.outDir, 'retroarch', `${moment.id}-${moment.label}.png`);
    run(path.join(RETROARCH_DIR, 'build', 'harness'), [
      path.join(RETROARCH_DIR, 'nova64_libretro.so'),
      retroCartPath,
      '--gles',
      ...(moment.retroArgs[opts.retroCart] || []),
      '--frames',
      String(moment.retroFrames),
      '--capture',
      ppmPath,
    ]);
    run('python3', [path.join(RETROARCH_DIR, 'tests', 'ppm_to_png.py'), ppmPath, pngPath]);
    outputs.set(moment.id, { path: pngPath, cart: retroCartPath });
    console.log(`[retroarch] ${moment.id} ${path.relative(ROOT, pngPath)}`);
  }
  return outputs;
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function resizeNearest(src, width, height) {
  if (src.width === width && src.height === height) return src;
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / height) * src.height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / width) * src.width));
      const si = (sy * src.width + sx) * 4;
      const di = (y * width + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

function averageColor(png, region = { x: 0, y: 0, w: 1, h: 1 }) {
  const x0 = Math.floor(region.x * png.width);
  const y0 = Math.floor(region.y * png.height);
  const x1 = Math.max(x0 + 1, Math.floor((region.x + region.w) * png.width));
  const y1 = Math.max(y0 + 1, Math.floor((region.y + region.h) * png.height));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      r += png.data[i];
      g += png.data[i + 1];
      b += png.data[i + 2];
      count++;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

function luma(color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function averageLuma(png, region) {
  return luma(averageColor(png, region));
}

function averageSaturation(png, region = { x: 0, y: 0, w: 1, h: 1 }) {
  const x0 = Math.floor(region.x * png.width);
  const y0 = Math.floor(region.y * png.height);
  const x1 = Math.max(x0 + 1, Math.floor((region.x + region.w) * png.width));
  const y1 = Math.max(y0 + 1, Math.floor((region.y + region.h) * png.height));
  let saturation = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i] / 255;
      const g = png.data[i + 1] / 255;
      const b = png.data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      saturation += max <= 0 ? 0 : (max - min) / max;
      count++;
    }
  }
  return saturation / count;
}

function colorDistance(a, b) {
  return (Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)) / (3 * 255);
}

function colorDelta(a, b) {
  return {
    r: b.r - a.r,
    g: b.g - a.g,
    b: b.b - a.b,
  };
}

function fieldSimilarity(a, b, cols = 24, rows = 14) {
  let abs = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const region = { x: col / cols, y: row / rows, w: 1 / cols, h: 1 / rows };
      abs += colorDistance(averageColor(a, region), averageColor(b, region));
    }
  }
  return 1 - abs / (cols * rows);
}

function sharpnessScore(png, region = { x: 0, y: 0, w: 1, h: 1 }) {
  const x0 = Math.max(1, Math.floor(region.x * png.width));
  const y0 = Math.max(1, Math.floor(region.y * png.height));
  const x1 = Math.min(png.width - 1, Math.floor((region.x + region.w) * png.width));
  const y1 = Math.min(png.height - 1, Math.floor((region.y + region.h) * png.height));
  let total = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      const e = (y * png.width + x + 1) * 4;
      const s = ((y + 1) * png.width + x) * 4;
      const c = luma({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] });
      const cx = luma({ r: png.data[e], g: png.data[e + 1], b: png.data[e + 2] });
      const cy = luma({ r: png.data[s], g: png.data[s + 1], b: png.data[s + 2] });
      total += Math.abs(c - cx) + Math.abs(c - cy);
      count++;
    }
  }
  return total / Math.max(1, count);
}

function edgeMetrics(png) {
  const center = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
  const edgeRegions = [
    { x: 0, y: 0, w: 1, h: 0.12 },
    { x: 0, y: 0.88, w: 1, h: 0.12 },
    { x: 0, y: 0.12, w: 0.12, h: 0.76 },
    { x: 0.88, y: 0.12, w: 0.12, h: 0.76 },
  ];
  const centerLuma = averageLuma(png, center);
  const edgeLuma = edgeRegions.reduce((sum, region) => sum + averageLuma(png, region), 0) / edgeRegions.length;
  return {
    centerLuma,
    edgeLuma,
    edgeToCenter: centerLuma <= 0 ? 0 : edgeLuma / centerLuma,
  };
}

function compareMoment(opts, moment, browserPath, retroPath) {
  let browser = readPng(browserPath);
  const retro = readPng(retroPath);
  browser = resizeNearest(browser, retro.width, retro.height);

  const diff = new PNG({ width: retro.width, height: retro.height });
  const diffPixels = pixelmatch(browser.data, retro.data, diff.data, retro.width, retro.height, {
    threshold: 0.24,
    includeAA: true,
  });
  const diffPath = path.join(opts.outDir, 'diff', `${moment.id}-${moment.label}.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const browserAverage = averageColor(browser);
  const retroAverage = averageColor(retro);
  const browserSky = averageColor(browser, { x: 0, y: 0, w: 1, h: 0.5 });
  const retroSky = averageColor(retro, { x: 0, y: 0, w: 1, h: 0.5 });
  const colorSimilarity = 1 - colorDistance(browserAverage, retroAverage);
  const skyColorSimilarity = 1 - colorDistance(browserSky, retroSky);
  const pixelSimilarity = 1 - diffPixels / (retro.width * retro.height);
  const fieldScore = fieldSimilarity(browser, retro);
  const browserSaturation = averageSaturation(browser);
  const retroSaturation = averageSaturation(retro);
  const browserSharpness = sharpnessScore(browser);
  const retroSharpness = sharpnessScore(retro);
  const browserEdges = edgeMetrics(browser);
  const retroEdges = edgeMetrics(retro);
  const score = fieldScore * 0.5 + colorSimilarity * 0.25 + skyColorSimilarity * 0.2 + pixelSimilarity * 0.05;

  return {
    id: moment.id,
    label: moment.label,
    browser: path.relative(ROOT, browserPath),
    retroarch: path.relative(ROOT, retroPath),
    diff: path.relative(ROOT, diffPath),
    dimensions: `${retro.width}x${retro.height}`,
    browserAverage,
    retroAverage,
    averageDelta: colorDelta(browserAverage, retroAverage),
    browserSky,
    retroSky,
    skyDelta: colorDelta(browserSky, retroSky),
    colorSimilarity,
    skyColorSimilarity,
    fieldScore,
    pixelSimilarity,
    browserSaturation,
    retroSaturation,
    saturationDelta: retroSaturation - browserSaturation,
    browserSharpness,
    retroSharpness,
    sharpnessRatio: browserSharpness <= 0 ? 0 : retroSharpness / browserSharpness,
    browserEdges,
    retroEdges,
    edgeLumaRatio: browserEdges.edgeLuma <= 0 ? 0 : retroEdges.edgeLuma / browserEdges.edgeLuma,
    edgeToCenterDelta: retroEdges.edgeToCenter - browserEdges.edgeToCenter,
    score,
  };
}

function pushGuardFailure(failures, metric, actual, expected, detail = '') {
  failures.push(
    `${metric}: got ${(actual * 100).toFixed(1)}%, expected >= ${(expected * 100).toFixed(1)}%${detail ? ` (${detail})` : ''}`
  );
}

function evaluateGuards(summary, thresholds) {
  const failures = [];
  if (!Object.keys(thresholds).length) return failures;

  if (thresholds.minAverageScore != null && summary.averageScore < thresholds.minAverageScore) {
    pushGuardFailure(failures, 'average score', summary.averageScore, thresholds.minAverageScore);
  }

  for (const result of summary.results) {
    const prefix = result.id;
    if (thresholds.minMomentScore != null && result.score < thresholds.minMomentScore) {
      pushGuardFailure(failures, `${prefix} score`, result.score, thresholds.minMomentScore);
    }
    if (thresholds.minSkyColorSimilarity != null && result.skyColorSimilarity < thresholds.minSkyColorSimilarity) {
      pushGuardFailure(failures, `${prefix} sky similarity`, result.skyColorSimilarity, thresholds.minSkyColorSimilarity);
    }
    if (thresholds.minEdgeLumaRatio != null && result.edgeLumaRatio < thresholds.minEdgeLumaRatio) {
      pushGuardFailure(failures, `${prefix} edge luma ratio`, result.edgeLumaRatio, thresholds.minEdgeLumaRatio);
    }
    if (thresholds.minEdgeToCenter != null && result.retroEdges.edgeToCenter < thresholds.minEdgeToCenter) {
      pushGuardFailure(failures, `${prefix} RA edge/center`, result.retroEdges.edgeToCenter, thresholds.minEdgeToCenter);
    }
    if (thresholds.minSharpnessRatio != null && result.sharpnessRatio < thresholds.minSharpnessRatio) {
      pushGuardFailure(failures, `${prefix} sharpness ratio`, result.sharpnessRatio, thresholds.minSharpnessRatio);
    }
    if (
      thresholds.maxAbsSaturationDelta != null &&
      Math.abs(result.saturationDelta) > thresholds.maxAbsSaturationDelta
    ) {
      failures.push(
        `${prefix} saturation delta: got ${(result.saturationDelta * 100).toFixed(1)}%, ` +
          `expected abs <= ${(thresholds.maxAbsSaturationDelta * 100).toFixed(1)}%`
      );
    }
  }

  return failures;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  ensureDirs(opts.outDir);
  const server = await ensureServer(opts);
  try {
    const browser = await captureBrowser(opts);
    const retro = captureRetroArch(opts);
    const results = MOMENTS.map(moment => compareMoment(opts, moment, browser.get(moment.id).path, retro.get(moment.id).path));
    const summary = {
      generatedAt: new Date().toISOString(),
      outDir: path.relative(ROOT, opts.outDir),
      retroCart: opts.retroCart,
      retroCartPath: path.relative(ROOT, retro.get(MOMENTS[0].id).cart),
      guard: opts.guard,
      thresholds: opts.thresholds,
      averageScore: results.reduce((sum, result) => sum + result.score, 0) / results.length,
      results,
    };
    const reportPath = path.join(opts.outDir, 'report.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);

    console.log(`\nSpace Harrier visual parity report (${opts.retroCart} cart on RetroArch)`);
    for (const result of results) {
      const ba = result.browserAverage;
      const ra = result.retroAverage;
      const bs = result.browserSky;
      const rs = result.retroSky;
      console.log(
        `${result.id}: score=${(result.score * 100).toFixed(1)} ` +
          `field=${(result.fieldScore * 100).toFixed(1)} ` +
          `avg=${(result.colorSimilarity * 100).toFixed(1)} ` +
          `sky=${(result.skyColorSimilarity * 100).toFixed(1)} ` +
          `pixel=${(result.pixelSimilarity * 100).toFixed(1)}`
      );
      console.log(
        `  avg web rgb(${ba.r.toFixed(0)},${ba.g.toFixed(0)},${ba.b.toFixed(0)}) ` +
          `ra rgb(${ra.r.toFixed(0)},${ra.g.toFixed(0)},${ra.b.toFixed(0)}) ` +
          `delta rgb(${result.averageDelta.r.toFixed(0)},${result.averageDelta.g.toFixed(0)},${result.averageDelta.b.toFixed(0)})`
      );
      console.log(
        `  sky web rgb(${bs.r.toFixed(0)},${bs.g.toFixed(0)},${bs.b.toFixed(0)}) ` +
          `ra rgb(${rs.r.toFixed(0)},${rs.g.toFixed(0)},${rs.b.toFixed(0)}) ` +
          `delta rgb(${result.skyDelta.r.toFixed(0)},${result.skyDelta.g.toFixed(0)},${result.skyDelta.b.toFixed(0)})`
      );
      console.log(
        `  sharp web=${result.browserSharpness.toFixed(2)} ra=${result.retroSharpness.toFixed(2)} ` +
          `ratio=${(result.sharpnessRatio * 100).toFixed(1)}% ` +
          `sat web=${result.browserSaturation.toFixed(3)} ra=${result.retroSaturation.toFixed(3)}`
      );
      console.log(
        `  edge/center web=${result.browserEdges.edgeToCenter.toFixed(3)} ` +
          `ra=${result.retroEdges.edgeToCenter.toFixed(3)} ` +
          `delta=${result.edgeToCenterDelta.toFixed(3)} ` +
          `edge luma ratio=${(result.edgeLumaRatio * 100).toFixed(1)}%`
      );
    }
    console.log(`average=${(summary.averageScore * 100).toFixed(1)}`);
    console.log(`report=${path.relative(ROOT, reportPath)}`);
    const guardFailures = evaluateGuards(summary, opts.thresholds);
    if (guardFailures.length) {
      console.error('\nVisual parity guard failed:');
      for (const failure of guardFailures) console.error(`  - ${failure}`);
      throw new Error(`Space Harrier visual parity guard failed (${guardFailures.length} checks)`);
    }
    if (Object.keys(opts.thresholds).length) {
      console.log(`guard=${opts.guard || 'custom'} passed`);
    }
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
