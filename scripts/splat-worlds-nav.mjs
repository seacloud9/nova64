// Derives each world's collision proxy from its scan: opaque, compact splats in
// the body-height band are binned on an XZ grid, dense cells become solid, and
// solid cells are merged into rectangles. Writes experiments/splat-worlds/nav.json
// (committed, so the cart never depends on this at runtime) plus an ASCII map.
// Authored walkways (spawn, doorway approaches) are carved free and the carved
// cell count is recorded, so overlaps with scanned furniture stay visible.
// Usage: node scripts/splat-worlds-nav.mjs [--base=URL] [--check]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const option = (key, fallback) =>
  process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5193');
const navFile = path.resolve('experiments/splat-worlds/nav.json');
const mapFile = path.resolve('retroarch/build/splat-worlds/nav-map.txt');

const CELL = 0.2; // metres
const BAND = [0.3, 1.8]; // above floor clutter, below head height
const MIN_OPACITY = 0.6;
const MAX_SCALE = 0.1; // ignore large soft "fog" splats
const DENSITY = 12; // splats per cell to count as solid
const LIMIT = 12; // matches the 24 m floor proxy

const browser = await chromium.launch({
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
let grids;
try {
  const page = await browser.newPage();
  await page.goto(`${base}/console.html?path=/experiments/splat-worlds/cart.js&w=640&h=360`);
  await page.waitForFunction(() => !!window.__splatWorlds, null, { timeout: 120000 });
  grids = await page.evaluate(
    ({ CELL, BAND, MIN_OPACITY, MAX_SCALE, LIMIT }) =>
      window.__splatWorlds.host.worlds.map(w => {
        w.splat.updateMatrixWorld(true);
        const m = w.splat.matrixWorld,
          size = Math.round((2 * LIMIT) / CELL),
          counts = new Array(size * size).fill(0);
        let floorHist = {};
        w.splat.forEachSplat((i, c, s, q, o) => {
          if (o < MIN_OPACITY || Math.max(s.x, s.y, s.z) > MAX_SCALE) return;
          c.applyMatrix4(m);
          const k = Math.round(c.y * 10);
          if (k >= -10 && k <= 5) floorHist[k] = (floorHist[k] ?? 0) + 1;
          if (c.y < BAND[0] || c.y > BAND[1]) return;
          const gx = Math.floor((c.x + LIMIT) / CELL),
            gz = Math.floor((c.z + LIMIT) / CELL);
          if (gx >= 0 && gz >= 0 && gx < size && gz < size) counts[gz * size + gx]++;
        });
        const top = Object.entries(floorHist).sort((a, b) => b[1] - a[1])[0];
        // A floating object (the relic) has no floor band; report null, not NaN.
        const floorPeak = top && top[1] > 1000 ? +top[0] / 10 : null;
        return { name: w.spec.name, size, counts, floorPeak };
      }),
    { CELL, BAND, MIN_OPACITY, MAX_SCALE, LIMIT }
  );
} finally {
  await browser.close();
}

// Authored walkways carved free: spawn and doorway approaches, in each world's
// own coordinates (see specs in cart.js). The apartment door overlaps a scanned
// pillar, so carving there is expected until the layout is re-authored.
const walkways = [
  [
    [-1.2, 0.8, 1.2, 3.2],
    [-1.3, -2.6, 1.3, -1.4],
  ], // apartment: spawn, door z=-2
  [[-1.3, -0.6, 1.3, 1.6]], // gallery: door z=0, arrival side
];

function mergeRects(solid, size) {
  const used = new Uint8Array(size * size),
    rects = [];
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      if (!solid[z * size + x] || used[z * size + x]) continue;
      let w = 1;
      while (x + w < size && solid[z * size + x + w] && !used[z * size + x + w]) w++;
      let h = 1;
      grow: while (z + h < size) {
        for (let i = 0; i < w; i++)
          if (!solid[(z + h) * size + x + i] || used[(z + h) * size + x + i]) break grow;
        h++;
      }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[(z + j) * size + x + i] = 1;
      const r = v => +(v * CELL - LIMIT).toFixed(2);
      rects.push([r(x), r(z), r(x + w), r(z + h)]);
    }
  return rects;
}
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

const nav = { generated: 'scripts/splat-worlds-nav.mjs', cell: CELL, band: BAND, worlds: [] };
const maps = [];
const problems = [];
grids.forEach((g, index) => {
  const solid = g.counts.map(c => c >= DENSITY);
  // Drop isolated single cells (sensor noise, stray splats).
  const { size } = g;
  const cleaned = solid.map((s, i) => {
    if (!s) return false;
    const x = i % size,
      z = Math.floor(i / size);
    let n = 0;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && solid[(z + dz) * size + x + dx]) n++;
    return n >= 2;
  });
  let carved = 0;
  for (let i = 0; i < cleaned.length; i++) {
    if (!cleaned[i]) continue;
    const x = (i % size) * CELL - LIMIT,
      z = Math.floor(i / size) * CELL - LIMIT;
    if (walkways[index].some(w => overlaps([x, z, x + CELL, z + CELL], w))) {
      cleaned[i] = false;
      carved++;
    }
  }
  const blockers = mergeRects(cleaned, size);
  for (const w of walkways[index])
    for (const b of blockers)
      if (overlaps(b, w)) problems.push(`${g.name}: ${b} blocks walkway ${w}`);
  if (blockers.length === 0) problems.push(`${g.name}: no blockers found; check scan transform`);
  if (Number.isFinite(g.floorPeak) && Math.abs(g.floorPeak) > 0.3)
    problems.push(`${g.name}: scan floor at y=${g.floorPeak}, proxy floor is 0`);
  nav.worlds.push({
    name: g.name,
    floorPeak: Number.isFinite(g.floorPeak) ? g.floorPeak : null,
    carvedCells: carved,
    walkways: walkways[index],
    blockers,
  });
  const rows = [];
  for (let z = 0; z < size; z += 2) {
    let row = '';
    for (let x = 0; x < size; x += 1) row += cleaned[z * size + x] ? '#' : '.';
    rows.push(row);
  }
  maps.push(`${g.name} (${blockers.length} blockers, top = -Z)\n${rows.join('\n')}`);
});

fs.mkdirSync(path.dirname(mapFile), { recursive: true });
fs.writeFileSync(mapFile, maps.join('\n\n') + '\n');
console.log('map', mapFile);
for (const w of nav.worlds)
  console.log(w.name, 'floor', w.floorPeak, 'blockers', w.blockers.length, 'carved', w.carvedCells);
if (problems.length) {
  console.error('FAIL\n' + problems.join('\n'));
  process.exit(1);
}
const json = JSON.stringify(nav) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(navFile) || fs.readFileSync(navFile, 'utf8') !== json) {
    console.error('nav.json is stale; run node scripts/splat-worlds-nav.mjs');
    process.exit(1);
  }
  console.log('nav.json up to date');
} else {
  fs.writeFileSync(navFile, json);
  console.log('wrote', navFile);
}
