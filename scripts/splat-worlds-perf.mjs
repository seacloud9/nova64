// Real-time frame pacing and repeated-reload memory for the splat worlds demo.
// Unlike splat-worlds-check.mjs this keeps the browser's real rAF clock.
// Usage: node scripts/splat-worlds-perf.mjs [--base=URL] [--seconds=10] [--cycles=6] [--headed]
// Headless Chromium frame times reflect this machine's GPU through ANGLE, but
// are not a device performance claim. GPU memory is not observable from the
// page; we report renderer resource counts as a proxy.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const option = (key, fallback) =>
  process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5193');
const seconds = Number(option('seconds', '10'));
const cycles = Number(option('cycles', '16'));
// Regression gates. Steady-state slope = RSS growth per reload over the second
// half of the cycles (first half is allocator/JIT warm-up). Before the Babylon
// blob/buffer fixes the slope was ~23 MB/cycle; after, ~2-4 MB/cycle.
const MAX_SLOPE_MB = Number(option('max-slope', '10'));
const MAX_P95_MS = Number(option('max-p95', '50'));
const out = path.resolve(option('out', 'retroarch/build/splat-worlds'));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: !process.argv.includes('--headed'),
  args: [
    ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
    '--enable-precise-memory-info',
    '--disable-renderer-backgrounding',
  ],
});
// Resident memory of every Chromium process (browser, renderers, GPU), which
// includes splat ArrayBuffers and driver allocations the JS heap omits.
const browserCdp = await browser.newBrowserCDPSession();
async function treeRssMB() {
  const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
    const rows = execFileSync('ps', ['-A', '-o', 'pid=,rss=']).toString().trim().split('\n');
  const rssByPid = new Map(rows.map(r => r.trim().split(/\s+/).map(Number)));
  const byType = {};
  let kb = 0;
  for (const p of processInfo) {
    const rss = rssByPid.get(p.id) ?? 0;
    kb += rss;
    byType[p.type] = (byType[p.type] ?? 0) + Math.round(rss / 1024);
  }
  return { total: Math.round(kb / 1024), byType };
}
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const report = { base, seconds, cycles, userAgent: null, backends: {} };

try {
  for (const backend of ['three', 'babylon']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(
      `${base}/console.html?${backend === 'babylon' ? 'backend=babylon&' : ''}path=/experiments/splat-worlds/cart.js&w=640&h=360`
    );
    const t0 = Date.now();
    await page.waitForFunction(() => !!window.__splatWorlds, null, { polling: 100, timeout: 120000 });
    const loadMs = Date.now() - t0;
    report.userAgent ??= await page.evaluate(() => navigator.userAgent);
    const gpuInfo = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });

    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const { metrics } = await cdp.send('Performance.getMetrics');
      return Math.round(metrics.find(m => m.name === 'JSHeapUsedSize').value / 1048576);
    };
    const resources = () =>
      page.evaluate(() => {
        const r = window.__splatWorlds?.host;
        const scene = globalThis.nova64?.scene?.getScene?.();
        if (scene?.isScene === undefined && scene?.getEngine) {
          const e = scene.getEngine();
          return { textures: e.getLoadedTexturesCache().length, meshes: scene.meshes.length };
        }
        const info = globalThis.nova64?.scene?.getRenderer?.()?.info?.memory;
        return info ? { textures: info.textures, geometries: info.geometries } : { host: !!r };
      });

    // Frame pacing: walk a loop through the portal in both directions, effects cycling.
    await page.waitForTimeout(1500);
    const pacing = await page.evaluate(async seconds => {
      const p = window.__splatWorlds;
      const intervals = [];
      let crossings = 0,
        last = performance.now(),
        start = last;
      await new Promise(resolve => {
        function frame(now) {
          intervals.push(now - last);
          last = now;
          const t = (now - start) / 1000;
          const before = p.world;
          const z = 2 - ((t * 0.9) % 6); // passes door at z=-2 in world 0 / z=0 in world 1
          p.move(Math.sin(t) * 0.5, 1.6, p.world === 0 ? z : -z - 2);
          if (before !== p.world) crossings++;
          p.setEffect(Math.floor(t / 2) % 5);
          if (t < seconds) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      return { intervals: intervals.slice(5), crossings };
    }, seconds);
    const sorted = [...pacing.intervals].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    // Repeated reloads through the real reset + init path.
    const memory = [{ cycle: 0, heapMB: await heap(), ...(await treeRssMB().then(r => ({ rssMB: r.total, rss: r.byType }))), ...(await resources()) }];
    for (let c = 1; c <= cycles; c++) {
      await page.evaluate(async () => {
        const { runCartResetHooks } = await import('/runtime/cart-reset.js');
        runCartResetHooks();
        const cart = await import('/experiments/splat-worlds/cart.js?perf');
        await cart.init();
      });
      await page.waitForTimeout(500);
      memory.push({ cycle: c, heapMB: await heap(), ...(await treeRssMB().then(r => ({ rssMB: r.total, rss: r.byType }))), ...(await resources()) });
      console.log(backend, 'reload', c, JSON.stringify(memory.at(-1)));
    }
    const growth = memory.at(-1).heapMB - memory[1].heapMB;
    const rssGrowth = memory.at(-1).rssMB - memory[1].rssMB;
    const half = memory.slice(Math.ceil(memory.length / 2));
    const slope = (half.at(-1).rssMB - half[0].rssMB) / Math.max(1, half.length - 1);

    report.backends[backend] = {
      gpu: gpuInfo,
      loadMs,
      frames: sorted.length,
      crossings: pacing.crossings,
      frameMs: {
        mean: +mean.toFixed(2),
        p50: +pct(sorted, 0.5).toFixed(2),
        p95: +pct(sorted, 0.95).toFixed(2),
        p99: +pct(sorted, 0.99).toFixed(2),
        max: +sorted.at(-1).toFixed(2),
      },
      over33ms: sorted.filter(v => v > 33.4).length,
      memory,
      heapGrowthAfterFirstReloadMB: growth,
      rssGrowthAfterFirstReloadMB: rssGrowth,
      steadyRssSlopeMBPerReload: +slope.toFixed(2),
      peakRssMB: Math.max(...memory.map(m => m.rssMB)),
      errors,
    };
    console.log(backend, JSON.stringify({ ...report.backends[backend], memory: undefined }));
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(out, 'perf.json'), JSON.stringify(report, null, 2));
console.log('wrote', path.join(out, 'perf.json'));
const failures = [];
for (const [name, b] of Object.entries(report.backends)) {
  if (b.errors.length) failures.push(`${name}: page errors ${b.errors.join('; ')}`);
  if (b.crossings < 1) failures.push(`${name}: scripted walk never crossed a portal`);
  if (b.steadyRssSlopeMBPerReload > MAX_SLOPE_MB)
    failures.push(`${name}: RSS grows ${b.steadyRssSlopeMBPerReload} MB/reload (> ${MAX_SLOPE_MB})`);
  if (b.frameMs.p95 > MAX_P95_MS) failures.push(`${name}: p95 frame ${b.frameMs.p95} ms (> ${MAX_P95_MS})`);
}
if (failures.length) {
  console.error('FAIL\n' + failures.join('\n'));
  process.exit(1);
}
console.log('PASS');
