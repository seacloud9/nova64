#!/usr/bin/env node
// visual-check.mjs — capture one screenshot of every cart on BOTH hosts (the
// web runtime and the Godot host) so they can be eyeballed side by side.
//
// This is a spot-check tool, not a pass/fail gate: Godot and three.js do not
// render identically (see AGENTS.md), so the diff column is there to point your
// eye at what changed, not to assert equality.
//
// What it does guarantee is that each shot is of a cart that actually STARTED.
// A screenshot of a loading screen, a map-select menu, or a blank canvas is
// worse than no screenshot, so every frame is checked for signal and carts that
// need a keypress to begin gameplay get one (see START_OVERRIDES).
//
//   pnpm visual:check                       both hosts, every mirrored cart
//   pnpm visual:check --cart=wad-demo       just one (repeatable)
//   pnpm visual:check --web-only            skip Godot
//   pnpm visual:check --godot-only          skip the browser
//   pnpm visual:check --list                print the cart list and exit
//
// Output (untracked, see .gitignore):
//   tmp/visual-check/web/<cart>.png
//   tmp/visual-check/godot/<cart>.png
//   tmp/visual-check/diff/<cart>.png
//   tmp/visual-check/index.html     side-by-side contact sheet — open this
//   tmp/visual-check/report.json

import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { checkGodot, resolveGodotBinary, toGodotHostPath } from './lib/godot-binary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = path.join(ROOT, 'examples');
const GODOT_PROJECT = path.join(ROOT, 'nova64-godot', 'godot_project');
const GODOT_CARTS = path.join(GODOT_PROJECT, 'carts');
const OUT = path.join(ROOT, 'tmp', 'visual-check');

const WIDTH = 1280;
const HEIGHT = 720;

// ── How each cart reaches gameplay ───────────────────────────────────────────
// Most carts render their world as soon as they load. The ones listed here sit
// on a menu or need time to stream an asset first, so they get a keypress and a
// longer budget. `webReady` is evaluated in the page until it returns true,
// which is the strongest "it really started" signal we have on the web side.
const START_OVERRIDES = {
  'wad-demo': {
    // Streams a 28MB WAD, then waits on a map-select screen.
    loadMs: 180_000,
    settleMs: 6_000,
    webKey: 'Enter',
    webReady: `globalThis.__nova64WadDemoState?.().gameState === 'playing'`,
    godotFrames: 1500,
    godotPress: 'enter',
    godotPressCount: 90,
  },
};

const DEFAULTS = {
  loadMs: 120_000,
  settleMs: 5_000,
  webKey: null,
  webReady: null,
  godotFrames: 420,
  godotPress: null,
  godotPressCount: 1,
};

const startFor = cart => ({ ...DEFAULTS, ...(START_OVERRIDES[cart] || {}) });

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    carts: [],
    web: true,
    godot: true,
    list: false,
    baseUrl: process.env.NOVA64_BASE_URL || 'http://127.0.0.1:3000',
    godotBin: process.env.GODOT || '',
    noStartServer: false,
    gpu: false,
  };
  for (const arg of argv) {
    if (arg === '--list') out.list = true;
    else if (arg === '--web-only') out.godot = false;
    else if (arg === '--godot-only') out.web = false;
    else if (arg === '--no-start-server') out.noStartServer = true;
    else if (arg === '--gpu') out.gpu = true;
    else if (arg.startsWith('--cart=')) out.carts.push(arg.slice(7));
    else if (arg.startsWith('--base-url=')) out.baseUrl = arg.slice(11);
    else if (arg.startsWith('--godot=')) out.godotBin = arg.slice(8);
    else if (arg === '--') continue;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

// ── Frame inspection ─────────────────────────────────────────────────────────
// "Did the game start?" is answered from the pixels: a loading screen, a solid
// clear colour, or a dead canvas all collapse to near-zero variation.
function inspect(file) {
  if (!fs.existsSync(file)) return { ok: false, status: 'MISSING' };
  let png;
  try {
    png = PNG.sync.read(fs.readFileSync(file));
  } catch (e) {
    return { ok: false, status: 'UNREADABLE', note: String(e.message) };
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  const seen = new Set();
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      const l = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      sum += l;
      sumSq += l * l;
      n++;
      if (seen.size < 4096) {
        // Quantise so anti-aliasing noise doesn't inflate the count.
        seen.add(
          ((png.data[i] >> 3) << 10) | ((png.data[i + 1] >> 3) << 5) | (png.data[i + 2] >> 3)
        );
      }
    }
  }
  const mean = sum / n;
  const stddev = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  // A real 3D frame has both tonal spread and a varied palette. These thresholds
  // are deliberately loose — they catch "nothing rendered", not "looks wrong".
  const blank = stddev < 3 || seen.size < 12;
  return {
    ok: !blank,
    status: blank ? 'BLANK' : 'OK',
    mean: +mean.toFixed(1),
    stddev: +stddev.toFixed(1),
    colors: seen.size,
    width: png.width,
    height: png.height,
  };
}

// ── Web capture ──────────────────────────────────────────────────────────────
async function isServerUp(baseUrl) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 2000);
    const res = await fetch(baseUrl, { signal: c.signal });
    clearTimeout(t);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer(opts) {
  if (await isServerUp(opts.baseUrl)) return null;
  if (opts.noStartServer) {
    throw new Error(`${opts.baseUrl} is unreachable and --no-start-server was passed`);
  }
  console.log(`• starting vite dev server for ${opts.baseUrl}`);
  const child = spawn('pnpm', ['dev'], { cwd: ROOT, stdio: 'ignore', shell: true });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await isServerUp(opts.baseUrl)) return child;
    if (child.exitCode !== null) throw new Error('vite exited before the server came up');
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`timed out waiting for ${opts.baseUrl}`);
}

async function captureWeb(browser, cart, opts) {
  const cfg = startFor(cart);
  const page = await browser.newPage({
    viewport: { width: WIDTH + 160, height: HEIGHT + 160 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  try {
    await page.goto(
      `${opts.baseUrl}/cart-runner.html?demo=${encodeURIComponent(cart)}&w=${WIDTH}&h=${HEIGHT}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      }
    );
    await page.waitForSelector('#screen', { timeout: 30_000 });
    // The runtime publishes this once the cart module is live.
    await page.waitForFunction(
      () => globalThis.__nova64CartLoadState && globalThis.__nova64CartLoadState.ready,
      null,
      { timeout: cfg.loadMs }
    );

    if (cfg.webKey) {
      // Press until the cart says it started; a single press can land in a frame
      // the cart does not poll.
      const ready = cfg.webReady ? new Function(`return (${cfg.webReady})`) : null;
      const deadline = Date.now() + 60_000;
      do {
        if (ready && (await page.evaluate(ready).catch(() => false))) break;
        await page.keyboard.down(cfg.webKey);
        await page.waitForTimeout(100);
        await page.keyboard.up(cfg.webKey);
        await page.waitForTimeout(600);
      } while (ready && Date.now() < deadline);
    }
    // A cart that declares how to tell it started must actually say so. Without
    // this a menu or loading screen screenshots perfectly happily — it has plenty
    // of pixel variation, so the blank check would never catch it.
    let started = true;
    if (cfg.webReady) {
      started = await page
        .waitForFunction(new Function(`return (${cfg.webReady})`), null, { timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      if (!started) errors.push(`never satisfied its start condition: ${cfg.webReady}`);
    }

    await page.waitForTimeout(cfg.settleMs);
    const file = path.join(OUT, 'web', `${cart}.png`);
    await page.locator('#screen').screenshot({ path: file });
    return { file, errors, started };
  } finally {
    await page.close();
  }
}

// ── Godot capture ────────────────────────────────────────────────────────────
// conformance_runner.gd ticks the cart for N frames, can inject a key, and
// writes the viewport to PNG. It drives input internally, so it works without
// the window being focused (handy when the desktop is locked).
function captureGodot(cart, opts) {
  const cfg = startFor(cart);
  const file = path.join(OUT, 'godot', `${cart}.png`);
  const args = [
    '--path',
    toGodotHostPath(GODOT_PROJECT, opts.godotBin),
    '--resolution',
    `${WIDTH}x${HEIGHT}`,
    '--script',
    'res://scripts/conformance_runner.gd',
    '--',
    `--cart=res://carts/${cart}`,
    `--frames=${cfg.godotFrames}`,
    `--snapshot=${toGodotHostPath(file, opts.godotBin)}`,
  ];
  if (cfg.godotPress) {
    args.push(
      `--press=${cfg.godotPress}`,
      '--press-frames=8',
      `--press-count=${cfg.godotPressCount}`
    );
  }
  const r = spawnSync(opts.godotBin, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const errors = output
    .split(/\r?\n/)
    .filter(l => /cart (init|update|draw)|SCRIPT ERROR|Parse Error/.test(l))
    .slice(0, 5);
  return { file, errors };
}

// ── Reporting ────────────────────────────────────────────────────────────────
function writeDiff(cart) {
  const a = path.join(OUT, 'web', `${cart}.png`);
  const b = path.join(OUT, 'godot', `${cart}.png`);
  if (!fs.existsSync(a) || !fs.existsSync(b)) return null;
  const pa = PNG.sync.read(fs.readFileSync(a));
  const pb = PNG.sync.read(fs.readFileSync(b));
  if (pa.width !== pb.width || pa.height !== pb.height) return null;
  const out = new PNG({ width: pa.width, height: pa.height });
  const n = pixelmatch(pa.data, pb.data, out.data, pa.width, pa.height, { threshold: 0.12 });
  const file = path.join(OUT, 'diff', `${cart}.png`);
  fs.writeFileSync(file, PNG.sync.write(out));
  return { file, pct: +((n / (pa.width * pa.height)) * 100).toFixed(1) };
}

function writeIndex(rows) {
  const esc = s =>
    String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const cell = (rel, label) =>
    fs.existsSync(path.join(OUT, rel))
      ? `<a href="${rel}" target="_blank"><img src="${rel}" loading="lazy" alt="${label}"></a>`
      : `<div class="missing">no ${label} capture</div>`;
  const badge = s => `<span class="badge ${s === 'OK' ? 'ok' : 'bad'}">${esc(s)}</span>`;

  const body = rows
    .map(
      r => `
  <section>
    <h2>${esc(r.cart)}</h2>
    <p class="meta">
      web ${badge(r.web.status)}${r.web.stddev != null ? ` <span class="num">σ${r.web.stddev} · ${r.web.colors} colours</span>` : ''}
      &nbsp;·&nbsp; godot ${badge(r.godot.status)}${r.godot.stddev != null ? ` <span class="num">σ${r.godot.stddev} · ${r.godot.colors} colours</span>` : ''}
      ${r.diffPct != null ? `&nbsp;·&nbsp; <span class="num">${r.diffPct}% of pixels differ</span>` : ''}
    </p>
    ${r.errors.length ? `<p class="err">${r.errors.map(esc).join('<br>')}</p>` : ''}
    <div class="grid">
      <figure>${cell(`web/${r.cart}.png`, 'web')}<figcaption>web</figcaption></figure>
      <figure>${cell(`godot/${r.cart}.png`, 'godot')}<figcaption>godot</figcaption></figure>
      <figure>${cell(`diff/${r.cart}.png`, 'diff')}<figcaption>diff</figcaption></figure>
    </div>
  </section>`
    )
    .join('\n');

  fs.writeFileSync(
    path.join(OUT, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Nova64 visual check</title>
<style>
  :root { color-scheme: dark; }
  body { background:#14161a; color:#e8eaed; font:14px/1.5 ui-monospace,Consolas,monospace; margin:0; padding:24px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .lede { color:#9aa3ad; margin:0 0 24px; }
  section { border-top:1px solid #2a2f37; padding:20px 0; }
  h2 { font-size:15px; margin:0 0 6px; }
  .meta { margin:0 0 10px; color:#9aa3ad; }
  .num { color:#7fb2d9; }
  .err { color:#ff9d9d; white-space:pre-wrap; margin:0 0 10px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  figure { margin:0; }
  img { width:100%; display:block; border:1px solid #2a2f37; border-radius:4px; background:#000; }
  figcaption { color:#9aa3ad; padding-top:4px; }
  .missing { border:1px dashed #3a414b; border-radius:4px; padding:40px 8px; text-align:center; color:#6b747e; }
  .badge { padding:1px 6px; border-radius:3px; font-weight:600; }
  .badge.ok { background:#1d3b24; color:#86e29b; }
  .badge.bad { background:#452024; color:#ff9d9d; }
</style>
<h1>Nova64 visual check</h1>
<p class="lede">${rows.length} cart(s) · generated ${new Date().toISOString()} · the two hosts do not render identically, so use the diff to guide your eye rather than as a pass/fail.</p>
${body}
`
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function listCarts() {
  if (!fs.existsSync(GODOT_CARTS)) return [];
  // Only carts present on BOTH hosts can be compared.
  return fs
    .readdirSync(GODOT_CARTS)
    .filter(name => !name.startsWith('.'))
    .filter(name => fs.existsSync(path.join(EXAMPLES, name, 'code.js')))
    .sort();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const all = listCarts();
  if (opts.list) {
    console.log(all.join('\n'));
    return 0;
  }
  const carts = opts.carts.length ? opts.carts : all;
  const unknown = carts.filter(c => !all.includes(c));
  if (unknown.length) {
    console.error(`✗ not mirrored on both hosts: ${unknown.join(', ')}`);
    console.error(`  run with --list to see what is available`);
    return 2;
  }

  for (const d of ['web', 'godot', 'diff']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

  if (opts.godot) {
    opts.godotBin = resolveGodotBinary(opts.godotBin);
    try {
      checkGodot(opts.godotBin);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      return 2;
    }
    console.log(`• godot: ${opts.godotBin}`);
  }

  let server = null;
  let browser = null;
  const rows = [];
  try {
    if (opts.web) {
      server = await ensureServer(opts);
      browser = await chromium.launch({
        headless: true,
        args: opts.gpu
          ? []
          : [
              // Software rendering keeps the shots reproducible across machines,
              // and is the only path that works under WSLg.
              '--use-gl=angle',
              '--use-angle=swiftshader',
              '--enable-unsafe-swiftshader',
              '--disable-gpu-sandbox',
            ],
      });
    }

    for (const cart of carts) {
      process.stdout.write(`${cart.padEnd(24)}`);
      const row = { cart, web: { status: 'SKIPPED' }, godot: { status: 'SKIPPED' }, errors: [] };

      if (opts.web) {
        try {
          const { file, errors, started } = await captureWeb(browser, cart, opts);
          row.web = inspect(file);
          // A frame full of detail still fails if it is the wrong screen.
          if (row.web.status === 'OK' && started === false) {
            row.web = { ...row.web, ok: false, status: 'NOT-STARTED' };
          }
          row.errors.push(...errors.map(e => `web: ${e}`));
        } catch (e) {
          row.web = { ok: false, status: 'FAILED' };
          row.errors.push(`web: ${String(e.message).split('\n')[0]}`);
        }
      }
      if (opts.godot) {
        try {
          const { file, errors } = captureGodot(cart, opts);
          row.godot = inspect(file);
          row.errors.push(...errors.map(e => `godot: ${e}`));
        } catch (e) {
          row.godot = { ok: false, status: 'FAILED' };
          row.errors.push(`godot: ${String(e.message).split('\n')[0]}`);
        }
      }

      const diff = opts.web && opts.godot ? writeDiff(cart) : null;
      if (diff) row.diffPct = diff.pct;
      rows.push(row);

      const mark = s => (s === 'OK' ? '✓' : s === 'SKIPPED' ? '–' : '✗');
      console.log(
        `web ${mark(row.web.status)} ${String(row.web.status).padEnd(8)} ` +
          `godot ${mark(row.godot.status)} ${String(row.godot.status).padEnd(8)} ` +
          (row.diffPct != null ? `diff ${String(row.diffPct).padStart(5)}%` : '')
      );
      for (const e of row.errors) console.log(`    ${e}`);
    }
  } finally {
    if (browser) await browser.close();
    if (server) server.kill('SIGTERM');
  }

  writeIndex(rows);
  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify({ generated: new Date().toISOString(), rows }, null, 2)
  );

  const bad = rows.filter(
    r =>
      (r.web.status !== 'OK' && r.web.status !== 'SKIPPED') ||
      (r.godot.status !== 'OK' && r.godot.status !== 'SKIPPED')
  );
  console.log(
    `\n${rows.length - bad.length}/${rows.length} cart(s) captured on every requested host`
  );
  console.log(`→ open ${path.relative(ROOT, path.join(OUT, 'index.html'))}`);
  if (bad.length) {
    console.log(`\n✗ no usable frame for: ${bad.map(r => r.cart).join(', ')}`);
    console.log('  BLANK       nothing rendered — a dead canvas or a flat clear colour.');
    console.log('  NOT-STARTED the cart loaded but never reported that gameplay began.');
    console.log('  Both usually mean the cart needs a start key or a longer budget:');
    console.log('  add an entry to START_OVERRIDES in scripts/visual-check.mjs.');
  }
  return bad.length ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(e => {
    console.error(`✗ ${e?.stack || e}`);
    process.exit(2);
  });
