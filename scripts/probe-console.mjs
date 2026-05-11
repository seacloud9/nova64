// Drive console.html with Playwright, capture console messages and errors.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://127.0.0.1:5180/console.html';
const TIMEOUT = 15000;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const messages = [];
page.on('console', (msg) => {
  messages.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => {
  messages.push({ type: 'pageerror', text: String(err && err.stack || err) });
});

try {
  await page.goto(URL, { waitUntil: 'load', timeout: TIMEOUT });
} catch (e) {
  console.log('NAV_ERROR:', e.message);
}

// Let cart load
await page.waitForTimeout(4000);

// Trim repeated lines
const seen = new Map();
for (const m of messages) {
  const key = m.type + '|' + m.text.slice(0, 200);
  seen.set(key, (seen.get(key) || 0) + 1);
}
for (const [key, n] of seen) {
  const [type, ...rest] = key.split('|');
  console.log(`[${type}]${n>1?` x${n}`:''} ${rest.join('|')}`);
}

await browser.close();
