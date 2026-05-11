// Walk every cart in examples/*, load it via console.html?demo=, capture errors.
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const carts = readdirSync(resolve('examples'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const summary = [];
for (const cart of carts) {
  const errors = [];
  const onErr = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 300));
  };
  const onPageErr = (e) => errors.push('PAGEERR: ' + String(e.message || e).slice(0, 300));
  page.on('console', onErr);
  page.on('pageerror', onPageErr);

  try {
    await page.goto(`http://127.0.0.1:5180/console.html?demo=${cart}`, {
      waitUntil: 'load',
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
  } catch (e) {
    errors.push('NAV: ' + e.message.slice(0, 200));
  }

  page.off('console', onErr);
  page.off('pageerror', onPageErr);
  const uniq = [...new Set(errors)];
  summary.push({ cart, n: uniq.length, errors: uniq });
  console.log(`${uniq.length === 0 ? 'OK ' : 'ERR'} ${cart}${uniq.length ? ' — ' + uniq[0] : ''}`);
}

await browser.close();

const failed = summary.filter((s) => s.n > 0);
console.log(`\n${carts.length - failed.length}/${carts.length} carts OK`);
if (failed.length) {
  console.log('\n=== FAILURES ===');
  for (const f of failed) {
    console.log(`\n— ${f.cart}`);
    for (const e of f.errors) console.log('  ', e);
  }
}
