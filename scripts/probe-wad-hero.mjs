// Capture screenshots + errors for fps-demo-3d (WAD) and hero-demo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const targets = ['fps-demo-3d', 'hero-demo'];
const OUT = 'C:/Users/brend/exp/nova64/scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

for (const cart of targets) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + String(e.message || e).slice(0, 400)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('ERR: ' + m.text().slice(0, 400));
  });
  const url = `http://127.0.0.1:5180/console.html?demo=${cart}`;
  console.log(`\n=== ${cart} → ${url}`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  } catch (e) {
    console.log('NAV:', e.message);
  }
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${OUT}/${cart}.png`, fullPage: false });
  const uniq = [...new Set(errs)];
  console.log(`errors: ${uniq.length}`);
  for (const e of uniq.slice(0, 12)) console.log('  ', e);
  await page.close();
}

await browser.close();
console.log('\nshots in', OUT);
