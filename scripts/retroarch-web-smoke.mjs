#!/usr/bin/env node
// Smoke test for the RetroArch web player (public/retroarch-web/).
// Boots a cart on the WASM libretro core in headless Chromium and fails if
// the page errors, the core never reaches "running", or the frame is blank.
//
//   node scripts/retroarch-web-smoke.mjs [cartPath] [baseUrl]
// Expects a server on baseUrl (default http://localhost:5173), e.g. `pnpm dev`.
//
// Bounded so it can never hang a CI job:
//   SMOKE_TIMEOUT_MS  hard watchdog for the whole run (default 180000)
//   SMOKE_ATTEMPTS    attempts, each with a fresh browser (default 2)
import { chromium } from 'playwright';

const cart = process.argv[2] || '/examples/space-harrier-3d/code.js';
const base = process.argv[3] || 'http://localhost:5173';
const shot = 'retroarch-web-smoke.png';
const TOTAL_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 180000;
const ATTEMPTS = Math.max(1, Number(process.env.SMOKE_ATTEMPTS) || 2);
const STEP_MS = 30000;

const t0 = Date.now();
const step = (msg) => console.log(`  [${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

// Watchdog: Playwright's own timeouts can't fire if the renderer wedges the
// protocol connection, so enforce the limit from Node itself.
const watchdog = setTimeout(() => {
  console.error(`✗ RetroArch web smoke (${cart}): watchdog fired after ${TOTAL_MS}ms`);
  process.exit(1);
}, TOTAL_MS);

// Race any step against a timer so no single await can stall the run.
function bounded(promise, label, ms = STEP_MS) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function attempt(n) {
  step(`attempt ${n}/${ATTEMPTS}: launching browser`);
  const browser = await bounded(
    chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    'launch'
  );
  const pageErrors = [];
  try {
    const page = await bounded(browser.newPage({ viewport: { width: 960, height: 720 } }), 'newPage');
    page.setDefaultTimeout(STEP_MS);
    page.on('pageerror', (e) => pageErrors.push(e.message));

    step('loading player');
    await bounded(page.goto(`${base}/retroarch-web/index.html?cart=${encodeURIComponent(cart)}`), 'goto');

    step('waiting for core to leave "loading"');
    let s;
    for (let i = 0; i < 18; i++) {
      // Return only small fields: the player's log grows every frame and
      // serializing all of it back over the protocol can stall indefinitely.
      s = await bounded(
        page.evaluate(() => {
          const r = window.nova64RetroArch;
          if (!r) return null;
          const log = Array.isArray(r.log) ? r.log : [];
          return {
            state: r.state,
            error: r.error ? String(r.error) : '',
            loaded: log.some((l) => String(l).includes('[nova64] loaded')),
            logLength: log.length,
          };
        }),
        'poll state',
        10000
      );
      if (s && s.state !== 'loading') break;
      await pause(5000);
    }
    if (!s || s.state !== 'running') throw new Error(`player state ${s && s.state}: ${s && s.error}`);
    if (!s.loaded) throw new Error('core never reported loading the cart');

    step(`running (${s.logLength} log lines); letting a few frames render`);
    await pause(6000);
    step('sending input');
    await bounded(page.mouse.click(480, 360), 'click');
    for (const key of ['Enter', 'x']) {
      await bounded(page.keyboard.press(key), `press ${key}`);
      await pause(500);
    }
    await pause(4000);

    step('capturing frame');
    const png = await bounded(page.screenshot({ path: shot }), 'screenshot');
    // A blank/black frame compresses to almost nothing; real game frames don't.
    if (png.length < 20000) throw new Error(`frame looks blank (${png.length} byte screenshot)`);
    if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join('; ')}`);
    return png.length;
  } finally {
    // close() can block while the emscripten main loop is busy; don't wait on it.
    await Promise.race([browser.close().catch(() => {}), pause(5000)]);
  }
}

let lastError;
for (let n = 1; n <= ATTEMPTS; n++) {
  try {
    const bytes = await attempt(n);
    clearTimeout(watchdog);
    console.log(`✓ RetroArch web smoke (${cart}): core running, frame rendered (${bytes} bytes) → ${shot}`);
    process.exit(0);
  } catch (err) {
    lastError = err;
    step(`attempt ${n} failed: ${err.message}`);
  }
}
clearTimeout(watchdog);
console.error(`✗ RetroArch web smoke (${cart}): ${lastError.message}`);
process.exit(1);
