#!/usr/bin/env node
// Compatibility sweep for the RetroArch web player (WASM libretro core).
// Boots every cart under examples/ in headless Chromium and records whether it
// loads, throws, renders a non-blank frame, and roughly how fast it runs.
//
//   node scripts/retroarch-web-sweep.mjs [baseUrl] [--only name,name] [--out file.json]
// Expects a dev server on baseUrl (default http://localhost:5173), e.g. `pnpm dev`.
//
// Each cart gets a fresh page and a hard time limit, so one stuck cart can't
// stall the run. FPS is the browser's requestAnimationFrame rate under the
// software (SwiftShader) GL used headlessly — useful for relative comparison
// between carts, not as an absolute number for real GPUs.
import { chromium } from 'playwright';
import { readdirSync, existsSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const only = flag('--only')?.split(',');
const outFile = flag('--out') || 'retroarch-web-sweep.json';
const base = args[0] || 'http://localhost:5173';

const CART_MS = 45000; // hard cap per cart
const pause = ms => new Promise(r => setTimeout(r, ms));
function bounded(promise, label, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const carts = readdirSync('examples', { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(`examples/${d.name}/code.js`))
  .map(d => d.name)
  .filter(n => !only || only.includes(n))
  .sort();

// Read only small, serializable fields. The status object also holds the
// emscripten Module (whole WASM heap), which must never cross the protocol.
const readStatus = () => {
  const r = window.nova64RetroArch;
  if (!r) return null;
  const log = Array.isArray(r.log) ? r.log.map(String) : [];
  return {
    state: r.state,
    error: r.error ? String(r.error) : '',
    loaded: log.some(l => l.includes('[nova64] loaded')),
    exceptions: log.filter(l => l.includes('JS exception')).slice(0, 3),
  };
};

async function sweepOne(browser, name) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const result = { cart: name, status: 'fail', detail: '' };
  try {
    const cart = `/examples/${name}/code.js`;
    await page.goto(`${base}/retroarch-web/index.html?cart=${encodeURIComponent(cart)}`);
    let s;
    for (let i = 0; i < 12; i++) {
      s = await bounded(page.evaluate(readStatus), 'status', 5000);
      if (s && s.state !== 'loading') break;
      await pause(2500);
    }
    if (!s || s.state !== 'running') throw new Error(`player ${s?.state}: ${s?.error}`);
    if (!s.loaded) {
      // A cart that throws during compile/init never logs "loaded"; report why.
      result.status = s.exceptions.length ? 'throws' : 'fail';
      result.detail = s.exceptions[0] || 'cart never loaded';
      return result;
    }

    await pause(3000);
    await page.mouse.click(480, 360);
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      await pause(300);
    }
    await pause(2000);

    result.fps = await bounded(
      page.evaluate(
        () =>
          new Promise(resolve => {
            let n = 0;
            const t0 = performance.now();
            const tick = () => {
              n++;
              if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
              else resolve(Math.round((n * 1000) / (performance.now() - t0)));
            };
            requestAnimationFrame(tick);
          })
      ),
      'fps',
      8000
    );

    s = await bounded(page.evaluate(readStatus), 'status', 5000);
    const png = await bounded(page.screenshot(), 'screenshot', 15000);
    result.frameBytes = png.length;
    if (s.exceptions.length) {
      result.status = 'throws';
      result.detail = s.exceptions[0];
    } else if (pageErrors.length) {
      result.status = 'page-error';
      result.detail = pageErrors[0];
    } else if (png.length < 20000) {
      result.status = 'blank';
      result.detail = `${png.length} byte frame`;
    } else {
      result.status = 'ok';
    }
  } catch (err) {
    result.detail = err.message;
  } finally {
    await Promise.race([page.close().catch(() => {}), pause(3000)]);
  }
  return result;
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
for (const name of carts) {
  const r = await bounded(sweepOne(browser, name), name, CART_MS).catch(err => ({
    cart: name,
    status: 'fail',
    detail: err.message,
  }));
  results.push(r);
  const extra = r.status === 'ok' ? `${r.fps} fps` : r.detail;
  console.log(`${r.status.padEnd(10)} ${name.padEnd(32)} ${String(extra).slice(0, 110)}`);
  writeFileSync(outFile, JSON.stringify(results, null, 2));
}
await Promise.race([browser.close().catch(() => {}), pause(5000)]);

const counts = results.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log(
  `\n${results.length} carts: ${Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')}`
);
console.log(`results → ${outFile}`);
process.exit(0);
