import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message));
page.on('console', (m) => { if (m.type()==='error') errs.push('ERR: '+m.text().slice(0,400)); });
try {
  await page.goto('http://127.0.0.1:5180/console.html', { waitUntil:'load', timeout:15000 });
} catch (e) { console.log('NAV:', e.message); }
await page.waitForTimeout(3500);
console.log('=== TITLE:', await page.title());
console.log('=== URL:', page.url());
console.log('=== BODY (first 800):');
console.log((await page.evaluate(() => document.body.innerText)).slice(0,800));
console.log('=== ERRORS:');
for (const e of [...new Set(errs)]) console.log(' ', e);
await page.screenshot({ path: 'C:/Users/brend/exp/nova64/scripts/console-state.png', fullPage: false });
await browser.close();
