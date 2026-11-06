#!/usr/bin/env node
// Compatibility sweep for the NATIVE libretro core (the same core RetroArch
// loads on desktop). Runs every cart under examples/ through the headless
// harness (retroarch/build/harness) and reports whether it loads, throws, or
// renders an empty frame. Mirrors scripts/retroarch-web-sweep.mjs for the WASM
// player.
//
//   node scripts/retroarch-native-sweep.mjs [--only a,b] [--frames N] [--out f.json]
//                                           [--baseline f.json] [--gles]
//
// Build first: make -C retroarch && make -C retroarch harness
//
// --baseline: compare with a saved results file and exit 1 only when a cart
// that was `ok` there now loads/throws worse (a regression). Without it, the
// exit code is 0 and the report is informational.
//
// Without --gles the harness renders only the software 2D layer, so 3D-only
// carts can show as `blank` even though they work. Treat `blank` as "look at
// this", not as a failure.
import { spawnSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const only = flag('--only')?.split(',');
const frames = Number(flag('--frames', 180));
const outFile = flag('--out', 'retroarch-native-sweep.json');
const baselineFile = flag('--baseline');
const gles = args.includes('--gles');

const ext = process.platform === 'darwin' ? 'dylib' : process.platform === 'win32' ? 'dll' : 'so';
const core = process.env.CORE || `retroarch/nova64_libretro.${ext}`;
const harness = process.env.HARNESS || 'retroarch/build/harness';
for (const f of [core, harness]) {
  if (!existsSync(f)) {
    console.error(`missing ${f}. Build with: make -C retroarch && make -C retroarch harness`);
    process.exit(2);
  }
}

const carts = readdirSync('examples', { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(`examples/${d.name}/code.js`))
  .map(d => d.name)
  .filter(n => !only || only.includes(n))
  .sort();

// Count distinct colours in a binary PPM (P6). One colour means an empty frame.
function distinctColours(ppmPath) {
  const buf = readFileSync(ppmPath);
  let pos = 0;
  const token = () => {
    while (pos < buf.length && /\s/.test(String.fromCharCode(buf[pos]))) pos++;
    if (buf[pos] === 0x23) {
      while (pos < buf.length && buf[pos] !== 0x0a) pos++;
      return token();
    }
    const start = pos;
    while (pos < buf.length && !/\s/.test(String.fromCharCode(buf[pos]))) pos++;
    return buf.toString('latin1', start, pos);
  };
  if (token() !== 'P6') return -1;
  const w = Number(token());
  const h = Number(token());
  token(); // maxval
  pos++; // single whitespace before pixel data
  const seen = new Set();
  for (let i = 0; i < w * h && seen.size < 16; i++) {
    const o = pos + i * 3;
    seen.add((buf[o] << 16) | (buf[o + 1] << 8) | buf[o + 2]);
  }
  return seen.size;
}

const tmp = mkdtempSync(join(tmpdir(), 'nova64-native-sweep-'));
const results = [];
for (const name of carts) {
  const ppm = join(tmp, `${name}.ppm`);
  const harnessArgs = [
    core,
    `examples/${name}/code.js`,
    '--frames',
    String(frames),
    '--capture',
    ppm,
  ];
  if (gles) harnessArgs.push('--gles');
  const t0 = Date.now();
  const run = spawnSync(harness, harnessArgs, { encoding: 'utf8', timeout: 60000 });
  const ms = Date.now() - t0;
  const out = `${run.stdout || ''}\n${run.stderr || ''}`;
  const exception = out.split('\n').find(l => l.includes('JS exception'));
  const r = { cart: name, status: 'ok', detail: '', ms };
  if (run.error?.code === 'ETIMEDOUT') {
    r.status = 'timeout';
    r.detail = `no result after ${frames} frames in 60s`;
  } else if (/\bok=0\b/.test(out) || out.includes('cart failed to compile/load')) {
    r.status = 'load-fail';
    r.detail = (exception || out.split('\n').find(l => l.includes('failed')) || '').trim();
  } else if (exception) {
    r.status = 'throws';
    r.detail = exception.replace(/^.*?\[nova64\]\s*/, '').trim();
  } else if (run.status !== 0 || !/ok=\d/.test(out)) {
    r.status = 'crash';
    r.detail = `harness exited ${run.status ?? run.signal}`;
  } else if (existsSync(ppm) && distinctColours(ppm) <= 1) {
    r.status = 'blank';
    r.detail = 'frame is a single colour';
  }
  results.push(r);
  const extra = r.status === 'ok' ? `${ms} ms` : r.detail;
  console.log(`${r.status.padEnd(10)} ${name.padEnd(30)} ${String(extra).slice(0, 110)}`);
}
rmSync(tmp, { recursive: true, force: true });
// Timings are printed above but left out of the file so it can serve as a
// stable baseline (regenerate with --out retroarch/tests/native-sweep-baseline.json).
writeFileSync(
  outFile,
  JSON.stringify(
    results.map(({ ms: _ms, ...r }) => r),
    null,
    2
  ) + '\n'
);

const counts = results.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log(
  `\n${results.length} carts: ${Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')}`
);
console.log(`results → ${outFile}`);

if (baselineFile) {
  // Lower rank = healthier. A regression is any cart that got worse.
  const rank = { ok: 0, blank: 1, throws: 2, 'load-fail': 3, timeout: 4, crash: 5 };
  const base = Object.fromEntries(
    JSON.parse(readFileSync(baselineFile, 'utf8')).map(r => [r.cart, r])
  );
  const regressions = results.filter(
    r => base[r.cart] && rank[r.status] > rank[base[r.cart].status]
  );
  const fixed = results.filter(r => base[r.cart] && rank[r.status] < rank[base[r.cart].status]);
  if (fixed.length) {
    console.log(`\nImproved vs baseline (update ${baselineFile}):`);
    for (const r of fixed) console.log(`  + ${r.cart}: ${base[r.cart].status} -> ${r.status}`);
  }
  if (regressions.length) {
    console.log(`\nREGRESSIONS vs ${baselineFile}:`);
    for (const r of regressions)
      console.log(`  - ${r.cart}: ${base[r.cart].status} -> ${r.status}  ${r.detail}`);
    process.exit(1);
  }
  console.log(`\nNo regressions vs ${baselineFile}.`);
}
process.exit(0);
