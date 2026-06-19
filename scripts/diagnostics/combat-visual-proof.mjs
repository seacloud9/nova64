// Visual proof script: load indie-odyssey, force combat, take a snapshot of
// the actual rendered #screen canvas via canvas.drawImage (the ground-truth
// path that Playwright's page.screenshot() doesn't reliably capture for
// preserveDrawingBuffer:false WebGL canvases), and save it to disk.
//
// Run: bash tmp/run_indie_glb_combat_check.sh AFTER spawning vite OR just
// run this directly when vite is already on http://localhost:3017.
//
// Output: screenshots/indie-odyssey-fix/combat_visual_proof.png

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.NOVA64_TEST_BASE || 'http://localhost:3017';
const OUT_DIR = 'screenshots/indie-odyssey-fix';
const OUT_FILE = path.join(OUT_DIR, 'combat_visual_proof.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[indie-odyssey]') || text.includes('[gpu-threejs]') || text.includes('[api-fx]')) {
    console.log('  >', text);
  }
});
page.on('pageerror', err => console.error('  page error:', err.message));

console.log(`Loading ${BASE}/console.html?demo=indie-odyssey ...`);
await page.goto(`${BASE}/console.html?demo=indie-odyssey`, { waitUntil: 'domcontentloaded' });

await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_DEBUG?.forceCombat, { timeout: 30000 });
console.log('Cart ready — forcing combat with data_imp + glitch_rat ...');
await page.evaluate(() => globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['data_imp', 'glitch_rat']));

// Let combat lighting set up + GLBs load.
await page.waitForFunction(() => {
  const assets = globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || [];
  return assets.length >= 2 && assets.every(a => a.spriteStatus === 'ready');
}, { timeout: 30000 });
await page.waitForTimeout(1500);

console.log('Capturing #screen canvas bitmap via drawImage ...');
const { dataUrl, width, height, sample } = await page.evaluate(async () => {
  const canvas = document.getElementById('screen');
  if (!canvas) return null;
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  const c2 = document.createElement('canvas');
  c2.width = canvas.width;
  c2.height = canvas.height;
  const ctx = c2.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const cx = canvas.width >> 1;
  const cy = canvas.height >> 1;
  const px = ctx.getImageData(cx, cy, 1, 1).data;
  return { dataUrl: c2.toDataURL('image/png'), width: canvas.width, height: canvas.height, sample: [px[0], px[1], px[2], px[3]] };
});

if (!dataUrl) { console.error('FAIL: no canvas captured'); process.exit(1); }

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const base64 = dataUrl.split(',')[1];
fs.writeFileSync(OUT_FILE, Buffer.from(base64, 'base64'));

console.log(`\n✅ Saved canvas bitmap → ${OUT_FILE}`);
console.log(`   dimensions: ${width}x${height}`);
console.log(`   centre pixel RGBA: (${sample.join(', ')})`);
if (sample[3] === 255 && Math.max(sample[0], sample[1], sample[2]) > 60) {
  console.log('   STATUS: ✓ canvas is opaque with visible colour — combat scene is rendering');
} else if (sample[3] < 255) {
  console.log(`   STATUS: ✗ canvas alpha=${sample[3]} (expected 255) — context still alpha:true OR composer clobbered alpha`);
} else {
  console.log(`   STATUS: ⚠ alpha=255 but pixels dim — clear color may be off`);
}

await browser.close();
