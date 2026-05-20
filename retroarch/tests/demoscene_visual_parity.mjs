#!/usr/bin/env node
// Capture the web and RetroArch demoscene at matching scene beats and write a
// report-first visual comparison. This is intentionally perceptual/trend
// tooling: pixel-perfect parity is not expected across Three.js and GLES.

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

const DEFAULT_OUT = path.join(RETROARCH_DIR, 'build', 'demoscene-parity');
const SCENES = [
  { id: 's0', name: 'GRID_AWAKENING', webSeconds: 2.4, retroFrames: 145 },
  { id: 's1', name: 'DATA_TUNNEL', webSeconds: 14.0, retroFrames: 720 },
  { id: 's2', name: 'DIGITAL_CITY', webSeconds: 28.0, retroFrames: 1440 },
  { id: 's3', name: 'ENERGY_CORE', webSeconds: 39.0, retroFrames: 1980 },
  { id: 's4', name: 'THE_VOID', webSeconds: 50.5, retroFrames: 2520 },
];

function parseArgs(argv) {
  const opts = {
    baseUrl: '',
    failOnThreshold: false,
    noStartServer: false,
    outDir: DEFAULT_OUT,
    port: 5177,
    scenes: SCENES.map(scene => scene.id),
    threshold: 0.45,
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--fail-on-threshold') opts.failOnThreshold = true;
    else if (arg === '--no-start-server') opts.noStartServer = true;
    else if (arg.startsWith('--base-url=')) opts.baseUrl = arg.slice('--base-url='.length);
    else if (arg.startsWith('--out=')) opts.outDir = path.resolve(arg.slice('--out='.length));
    else if (arg.startsWith('--port=')) opts.port = Number(arg.slice('--port='.length));
    else if (arg.startsWith('--scene=')) {
      opts.scenes = arg
        .slice('--scene='.length)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--threshold=')) {
      opts.threshold = Number(arg.slice('--threshold='.length));
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }

  opts.baseUrl ||= `http://127.0.0.1:${opts.port}`;
  return opts;
}

function ensureDirs(outDir) {
  for (const dir of [
    outDir,
    path.join(outDir, 'browser'),
    path.join(outDir, 'retroarch'),
    path.join(outDir, 'diff'),
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
    throw new Error(
      `${command} ${args.join(' ')} failed\n${result.stdout || ''}\n${result.stderr || ''}`
    );
  }
  return result;
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

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureServer(opts) {
  if (await isServerReady(opts.baseUrl)) return null;
  if (opts.noStartServer) {
    throw new Error(`${opts.baseUrl} is not reachable and --no-start-server was used`);
  }

  const child = spawn(
    'pnpm',
    ['exec', 'vite', '--host', '127.0.0.1', '--port', String(opts.port)],
    {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
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

async function captureBrowser(opts, scenes) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${opts.baseUrl}/console.html?demo=demoscene`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await wait(1500);
  await page.keyboard.press('Space');

  const start = Date.now();
  const outputs = new Map();
  for (const scene of [...scenes].sort((a, b) => a.webSeconds - b.webSeconds)) {
    const targetMs = Math.max(0, scene.webSeconds * 1000 - (Date.now() - start));
    await wait(targetMs);
    const canvas = page.locator('#screen');
    const capture = await canvas.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    const outPath = path.join(opts.outDir, 'browser', `${scene.id}-${scene.name}.png`);
    await canvas.screenshot({ path: outPath });
    outputs.set(scene.id, { path: outPath, width: capture.width, height: capture.height });
    console.log(`[browser] ${scene.id} ${scene.name} ${capture.width}x${capture.height}`);
  }

  await browser.close();
  return outputs;
}

function captureRetroArch(opts, scenes) {
  const outputs = new Map();
  for (const scene of scenes) {
    const ppmPath = path.join(opts.outDir, 'retroarch', `${scene.id}-${scene.name}.ppm`);
    const pngPath = path.join(opts.outDir, 'retroarch', `${scene.id}-${scene.name}.png`);
    run(path.join(RETROARCH_DIR, 'build', 'harness'), [
      path.join(RETROARCH_DIR, 'nova64_libretro.so'),
      path.join(RETROARCH_DIR, 'games', 'demoscene.js'),
      '--gles',
      '--btn',
      'b',
      '--frames',
      String(scene.retroFrames),
      '--capture',
      ppmPath,
    ]);
    run('python3', [path.join(RETROARCH_DIR, 'tests', 'ppm_to_png.py'), ppmPath, pngPath]);
    outputs.set(scene.id, { path: pngPath });
    console.log(`[retroarch] ${scene.id} ${scene.name} frame=${scene.retroFrames}`);
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

function compareScene(opts, scene, browserPath, retroPath) {
  let browser = readPng(browserPath);
  const retro = readPng(retroPath);
  browser = resizeNearest(browser, retro.width, retro.height);

  const diff = new PNG({ width: retro.width, height: retro.height });
  const diffPixels = pixelmatch(browser.data, retro.data, diff.data, retro.width, retro.height, {
    threshold: 0.22,
    includeAA: true,
  });

  let abs = 0;
  let lumaAbs = 0;
  for (let i = 0; i < retro.width * retro.height; i++) {
    const o = i * 4;
    const dr = Math.abs(browser.data[o] - retro.data[o]);
    const dg = Math.abs(browser.data[o + 1] - retro.data[o + 1]);
    const db = Math.abs(browser.data[o + 2] - retro.data[o + 2]);
    abs += dr + dg + db;
    const bl = browser.data[o] * 0.2126 + browser.data[o + 1] * 0.7152 + browser.data[o + 2] * 0.0722;
    const rl = retro.data[o] * 0.2126 + retro.data[o + 1] * 0.7152 + retro.data[o + 2] * 0.0722;
    lumaAbs += Math.abs(bl - rl);
  }

  const pixels = retro.width * retro.height;
  const pixelSimilarity = 1 - diffPixels / pixels;
  const colorSimilarity = 1 - abs / (pixels * 3 * 255);
  const lumaSimilarity = 1 - lumaAbs / (pixels * 255);
  const perceptualScore = colorSimilarity * 0.55 + lumaSimilarity * 0.35 + pixelSimilarity * 0.1;
  const diffPath = path.join(opts.outDir, 'diff', `${scene.id}-${scene.name}.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    id: scene.id,
    name: scene.name,
    browser: path.relative(ROOT, browserPath),
    retroarch: path.relative(ROOT, retroPath),
    diff: path.relative(ROOT, diffPath),
    dimensions: `${retro.width}x${retro.height}`,
    diffPixels,
    pixelSimilarity,
    colorSimilarity,
    lumaSimilarity,
    perceptualScore,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const selected = SCENES.filter(scene => opts.scenes.includes(scene.id));
  if (!selected.length) throw new Error(`no scenes selected from: ${opts.scenes.join(',')}`);

  ensureDirs(opts.outDir);
  const server = await ensureServer(opts);
  try {
    const browser = await captureBrowser(opts, selected);
    const retro = captureRetroArch(opts, selected);
    const results = selected.map(scene =>
      compareScene(opts, scene, browser.get(scene.id).path, retro.get(scene.id).path)
    );
    const summary = {
      generatedAt: new Date().toISOString(),
      outDir: path.relative(ROOT, opts.outDir),
      threshold: opts.threshold,
      averagePerceptualScore:
        results.reduce((sum, result) => sum + result.perceptualScore, 0) / results.length,
      results,
    };
    const reportPath = path.join(opts.outDir, 'report.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);

    console.log('\nDemoscene visual parity report');
    for (const result of results) {
      console.log(
        `${result.id} ${result.name}: score=${(result.perceptualScore * 100).toFixed(1)} ` +
          `color=${(result.colorSimilarity * 100).toFixed(1)} ` +
          `luma=${(result.lumaSimilarity * 100).toFixed(1)} ` +
          `pixel=${(result.pixelSimilarity * 100).toFixed(1)}`
      );
    }
    console.log(`average=${(summary.averagePerceptualScore * 100).toFixed(1)}`);
    console.log(`report=${path.relative(ROOT, reportPath)}`);

    if (opts.failOnThreshold && summary.averagePerceptualScore < opts.threshold) {
      process.exitCode = 1;
    }
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
