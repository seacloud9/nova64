#!/usr/bin/env node
// Compare browser Three.js output against the Godot host for every mirrored
// cart. This is intentionally a report-first harness: Godot parity is still
// uneven, so use --fail-on-threshold when you want CI-style gating.

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GODOT_ROOT = path.resolve(SCRIPT_DIR, '..');
const ROOT = path.resolve(GODOT_ROOT, '..');
const GODOT_PROJECT = path.join(GODOT_ROOT, 'godot_project');
const GODOT_TEST_CARTS = path.join(GODOT_ROOT, 'tests', 'carts');
const EXAMPLES = path.join(ROOT, 'examples');
const RESULTS = path.join(GODOT_ROOT, 'test-results', 'visual-parity');
const BROWSER_DIR = path.join(RESULTS, 'browser');
const GODOT_DIR = path.join(RESULTS, 'godot');
const DIFF_DIR = path.join(RESULTS, 'diff');

// Locate a Godot 4.4+ binary across Linux / WSL / Windows. The smoke runner
// hard-codes the Windows install path; mirror that here and translate to
// /mnt/c/... when we're running inside WSL so `pnpm godot:visual` works
// without the caller setting GODOT manually.
function isWsl() {
  if (process.platform !== 'linux') return false;
  try {
    const release = fs.readFileSync('/proc/version', 'utf8');
    return /microsoft/i.test(release);
  } catch {
    return false;
  }
}

function existsExecutable(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    try {
      fs.accessSync(p, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

function resolveGodotBinary() {
  // 1. Honor anything already on PATH.
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['godot'], {
    encoding: 'utf8',
  });
  if (which.status === 0) {
    const first = (which.stdout || '').split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }
  const which4 = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['godot4'], {
    encoding: 'utf8',
  });
  if (which4.status === 0) {
    const first = (which4.stdout || '').split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }

  // 2. Standard Windows install used by run-cart-smoke.ps1.
  const winCandidates = [
    'C:\\Program Files\\Godot_v4.4.1-stable_win64.exe\\Godot_v4.4.1-stable_win64_console.exe',
    'C:\\Program Files\\Godot_v4.4.1-stable_win64.exe\\Godot_v4.4.1-stable_win64.exe',
    'C:\\Program Files\\Godot\\Godot_v4.4.1-stable_win64_console.exe',
    'C:\\Program Files\\Godot\\Godot_v4.4.1-stable_win64.exe',
  ];

  if (process.platform === 'win32') {
    for (const c of winCandidates) {
      if (existsExecutable(c)) return c;
    }
  } else if (isWsl()) {
    for (const c of winCandidates) {
      const wsl = '/mnt/' + c[0].toLowerCase() + c.slice(2).replace(/\\/g, '/');
      if (existsExecutable(wsl)) return wsl;
    }
  }

  // 3. Last-resort fallback — let checkGodot() produce a clear error.
  return 'godot';
}

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.NOVA64_BASE_URL || 'http://127.0.0.1:3000',
    browserBackend: 'threejs',
    carts: [],
    failOnThreshold: false,
    frames: 60,
    godot: process.env.GODOT || resolveGodotBinary(),
    godotHeadless: process.env.GODOT_HEADLESS === '1',
    list: false,
    maxDiff: 35,
    noStartServer: false,
    port: 3000,
    press: '',
    pressCount: 1,
    pressGapMs: 120,
    pressFrames: 3,
    pressMs: 120,
    reportOnly: false,
    threshold: 0.2,
    loadTimeoutMs: 120000,
    waitMs: 2000,
    width: 1280,
    height: 720,
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg === '--all') continue;
    if (arg === '--fail-on-threshold') out.failOnThreshold = true;
    else if (arg === '--headless-godot') out.godotHeadless = true;
    else if (arg === '--list') out.list = true;
    else if (arg === '--no-start-server') out.noStartServer = true;
    else if (arg === '--report-only') out.reportOnly = true;
    else if (arg.startsWith('--base-url=')) out.baseUrl = arg.slice('--base-url='.length);
    else if (arg.startsWith('--browser-backend='))
      out.browserBackend = arg.slice('--browser-backend='.length);
    else if (arg.startsWith('--cart=')) out.carts.push(arg.slice('--cart='.length));
    else if (arg.startsWith('--frames=')) out.frames = Number(arg.slice('--frames='.length));
    else if (arg.startsWith('--godot=')) out.godot = arg.slice('--godot='.length);
    else if (arg.startsWith('--height=')) out.height = Number(arg.slice('--height='.length));
    else if (arg.startsWith('--load-timeout-ms='))
      out.loadTimeoutMs = Number(arg.slice('--load-timeout-ms='.length));
    else if (arg.startsWith('--max-diff=')) out.maxDiff = Number(arg.slice('--max-diff='.length));
    else if (arg.startsWith('--port=')) out.port = Number(arg.slice('--port='.length));
    else if (arg.startsWith('--press=')) out.press = arg.slice('--press='.length);
    else if (arg.startsWith('--press-count='))
      out.pressCount = Number(arg.slice('--press-count='.length));
    else if (arg.startsWith('--press-gap-ms='))
      out.pressGapMs = Number(arg.slice('--press-gap-ms='.length));
    else if (arg.startsWith('--press-frames='))
      out.pressFrames = Number(arg.slice('--press-frames='.length));
    else if (arg.startsWith('--press-ms=')) out.pressMs = Number(arg.slice('--press-ms='.length));
    else if (arg.startsWith('--threshold='))
      out.threshold = Number(arg.slice('--threshold='.length));
    else if (arg.startsWith('--wait-ms=')) out.waitMs = Number(arg.slice('--wait-ms='.length));
    else if (arg.startsWith('--width=')) out.width = Number(arg.slice('--width='.length));
    else if (!arg.startsWith('--')) out.carts.push(arg);
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (out.browserBackend !== 'threejs' && out.browserBackend !== 'babylon') {
    throw new Error('--browser-backend must be threejs or babylon');
  }
  return out;
}

function listCartDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => fs.existsSync(path.join(root, name, 'code.js')))
    .sort();
}

function cartInventory(requested) {
  const browser = new Set(listCartDirs(EXAMPLES));
  const godot = new Set(listCartDirs(GODOT_TEST_CARTS));
  const names = requested.length
    ? [...new Set(requested)].sort()
    : [...godot].filter(name => browser.has(name)).sort();

  return names.map(name => ({
    name,
    browser: browser.has(name),
    godot: godot.has(name),
  }));
}

function ensureDirs() {
  for (const dir of [RESULTS, BROWSER_DIR, GODOT_DIR, DIFF_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

async function waitForServer(baseUrl, child) {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    if (await isServerReady(baseUrl)) return;
    if (child.exitCode !== null) {
      throw new Error(`Vite exited before ${baseUrl} became ready`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
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
  await waitForServer(opts.baseUrl, child);
  return child;
}

function syncCarts() {
  const script = path.join(GODOT_ROOT, 'scripts', 'sync-carts.sh');
  const result = spawnSync('bash', [script], {
    cwd: GODOT_ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`sync-carts failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function checkGodot(godotBin) {
  const result = spawnSync(godotBin, ['--version'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `Godot executable not found: ${godotBin}\nSet GODOT=/path/to/Godot_4.4+ or pass --godot=/path/to/godot.`
    );
  }
  if (result.status !== 0) {
    throw new Error(`Godot probe failed:\n${result.stdout}\n${result.stderr}`);
  }
  return (result.stdout || result.stderr || '').trim();
}

function isWindowsExecutableFromWsl(exePath) {
  return process.platform === 'linux' && exePath.toLowerCase().endsWith('.exe');
}

function toGodotHostPath(filePath, opts) {
  if (!isWindowsExecutableFromWsl(opts.godot)) return filePath;
  const result = spawnSync('wslpath', ['-w', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`wslpath failed for ${filePath}:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

async function captureBrowserCart(browser, cart, opts) {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: opts.width + 160, height: opts.height + 160 },
  });
  const page = await context.newPage();
  const messages = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));

  const html = opts.browserBackend === 'babylon' ? 'babylon_console.html' : 'cart-runner.html';
  const url = `${opts.baseUrl}/${html}?demo=${encodeURIComponent(cart)}&w=${opts.width}&h=${opts.height}`;
  const outPath = path.join(BROWSER_DIR, `${cart}.png`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#screen', { timeout: 30000 });
  await page.waitForFunction(
    expectedPath => {
      const state = globalThis.__nova64CartLoadState;
      if (!state) return false;
      return !!state.ready && typeof state.path === 'string' && state.path.endsWith(expectedPath);
    },
    `/examples/${cart}/code.js`,
    { timeout: opts.loadTimeoutMs }
  );
  if (opts.press) {
    const pressCount = Math.max(1, Math.floor(opts.pressCount || 1));
    for (let i = 0; i < pressCount; i++) {
      await page.keyboard.down(opts.press);
      await page.waitForTimeout(opts.pressMs);
      await page.keyboard.up(opts.press);
      if (i + 1 < pressCount) await page.waitForTimeout(opts.pressGapMs);
    }
  }
  await page.waitForTimeout(opts.waitMs);
  await page.locator('#screen').screenshot({ path: outPath });
  await context.close();

  return { path: outPath, messages };
}

function captureGodotCart(cart, opts) {
  const outPath = path.join(GODOT_DIR, `${cart}.png`);
  const godotProjectPath = toGodotHostPath(GODOT_PROJECT, opts);
  const godotOutPath = toGodotHostPath(outPath, opts);
  const args = [
    ...(opts.godotHeadless ? ['--headless'] : []),
    '--path',
    godotProjectPath,
    '--resolution',
    `${opts.width}x${opts.height}`,
    '--script',
    'res://scripts/conformance_runner.gd',
    '--',
    `--cart=res://carts/${cart}`,
    `--frames=${opts.frames}`,
    `--snapshot=${godotOutPath}`,
  ];
  if (opts.press) {
    args.push(
      `--press=${opts.press.toLowerCase()}`,
      `--press-frames=${opts.pressFrames}`,
      `--press-count=${Math.max(1, Math.floor(opts.pressCount || 1))}`
    );
  }

  const result = spawnSync(opts.godot, args, {
    cwd: GODOT_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) throw result.error;
  if (result.status !== 0 && !fs.existsSync(outPath)) {
    throw new Error(`Godot exited ${result.status}\n${output}`);
  }
  if (!fs.existsSync(outPath)) {
    throw new Error(`Godot did not write snapshot: ${outPath}\n${output}`);
  }
  const messages = output.split('\n').filter(line => line.includes('[nova64'));
  if (result.status !== 0) {
    messages.push(`Godot exited ${result.status} after writing snapshot`);
  }
  return { path: outPath, messages };
}

function compareImages(browserPath, godotPath, diffPath, opts) {
  const browser = PNG.sync.read(fs.readFileSync(browserPath));
  const godot = PNG.sync.read(fs.readFileSync(godotPath));
  if (browser.width !== godot.width || browser.height !== godot.height) {
    return {
      error: `dimension mismatch browser=${browser.width}x${browser.height} godot=${godot.width}x${godot.height}`,
    };
  }

  const diff = new PNG({ width: browser.width, height: browser.height });
  const numDiffPixels = pixelmatch(
    browser.data,
    godot.data,
    diff.data,
    browser.width,
    browser.height,
    { threshold: opts.threshold }
  );
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = browser.width * browser.height;
  return {
    width: browser.width,
    height: browser.height,
    numDiffPixels,
    totalPixels,
    percentDiff: (numDiffPixels / totalPixels) * 100,
  };
}

function writeReports(results, opts) {
  const report = {
    generatedAt: new Date().toISOString(),
    options: {
      browserBackend: opts.browserBackend,
      frames: opts.frames,
      maxDiff: opts.maxDiff,
      threshold: opts.threshold,
      press: opts.press,
      pressCount: opts.pressCount,
      pressGapMs: opts.pressGapMs,
      pressFrames: opts.pressFrames,
      pressMs: opts.pressMs,
      loadTimeoutMs: opts.loadTimeoutMs,
      width: opts.width,
      height: opts.height,
    },
    results,
  };

  fs.writeFileSync(path.join(RESULTS, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# Godot Visual Parity Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Reference backend: ${opts.browserBackend}`,
    '',
    '| Cart | Status | Diff | Notes |',
    '| --- | --- | ---: | --- |',
  ];
  for (const result of results) {
    const diff = typeof result.percentDiff === 'number' ? `${result.percentDiff.toFixed(2)}%` : '-';
    const notes = result.error
      ? result.error.replace(/\n/g, '<br>')
      : result.notes?.join('<br>') || '';
    lines.push(`| ${result.cart} | ${result.status} | ${diff} | ${notes} |`);
  }
  fs.writeFileSync(path.join(RESULTS, 'report.md'), `${lines.join('\n')}\n`);
}

function printSummary(results, opts) {
  const counts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  const diffed = results
    .filter(result => typeof result.percentDiff === 'number')
    .sort((a, b) => b.percentDiff - a.percentDiff);
  const worst = diffed.slice(0, 10);

  console.log('\nGodot visual parity summary');
  console.log(`  carts: ${results.length}`);
  console.log(`  pass: ${counts.pass || 0}`);
  console.log(`  diff: ${counts.diff || 0}`);
  console.log(`  skipped: ${counts.skipped || 0}`);
  console.log(`  failed: ${counts.failed || 0}`);
  if (worst.length) {
    console.log('\nWorst visual diffs:');
    for (const result of worst) {
      console.log(`  ${result.cart.padEnd(28)} ${result.percentDiff.toFixed(2)}%`);
    }
  }
  console.log(`\nReport: ${path.join(RESULTS, 'report.md')}`);
  console.log(`Images: ${RESULTS}`);
  if (!opts.failOnThreshold && !opts.reportOnly) {
    console.log('\nTip: add --fail-on-threshold to turn diff thresholds into a failing test.');
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inventory = cartInventory(opts.carts);

  if (opts.list) {
    for (const item of inventory) {
      const status = item.browser && item.godot ? 'ready' : 'missing';
      console.log(`${status}\t${item.name}\tbrowser=${item.browser}\tgodot=${item.godot}`);
    }
    return;
  }

  ensureDirs();
  syncCarts();
  const godotVersion = checkGodot(opts.godot);
  console.log(`Godot: ${godotVersion}`);

  const server = await ensureServer(opts);
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const item of inventory) {
      const result = { cart: item.name, notes: [] };
      if (!item.browser || !item.godot) {
        result.status = 'skipped';
        result.error = `missing ${!item.browser ? 'browser example' : 'Godot cart'}`;
        results.push(result);
        console.log(`SKIP ${item.name} (${result.error})`);
        continue;
      }

      process.stdout.write(`CAPTURE ${item.name} ... `);
      try {
        const browserShot = await captureBrowserCart(browser, item.name, opts);
        const godotShot = captureGodotCart(item.name, opts);
        const diffPath = path.join(DIFF_DIR, `${item.name}.png`);
        const comparison = compareImages(browserShot.path, godotShot.path, diffPath, opts);

        result.browserPath = browserShot.path;
        result.godotPath = godotShot.path;
        result.diffPath = diffPath;
        result.notes.push(...browserShot.messages.slice(0, 5));
        result.notes.push(...godotShot.messages.slice(0, 5));

        if (comparison.error) {
          result.status = 'failed';
          result.error = comparison.error;
          console.log(`FAIL (${comparison.error})`);
        } else {
          Object.assign(result, comparison);
          result.status = comparison.percentDiff <= opts.maxDiff ? 'pass' : 'diff';
          console.log(`${result.status.toUpperCase()} ${comparison.percentDiff.toFixed(2)}%`);
        }
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : String(err);
        console.log(`FAIL (${result.error.split('\n')[0]})`);
      }
      results.push(result);
      writeReports(results, opts);
    }
  } finally {
    await browser.close();
    if (server) server.kill('SIGTERM');
  }

  writeReports(results, opts);
  printSummary(results, opts);

  const hasInfraFailure = results.some(result => result.status === 'failed');
  const hasDiffFailure = results.some(result => result.status === 'diff');
  if (!opts.reportOnly && (hasInfraFailure || (opts.failOnThreshold && hasDiffFailure))) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
