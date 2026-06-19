import { chromium } from '@playwright/test';

const BASE = process.env.NOVA64_BASE || 'http://localhost:3017';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const allLogs = [];
const errors = [];
const warnings = [];
const shaderRelated = [];
page.on('console', msg => {
  const text = msg.text();
  const type = msg.type();
  allLogs.push({ type, text });
  if (type === 'error') errors.push(text);
  if (type === 'warning') warnings.push(text);
  if (/shader|glsl|compile|program link|fragment|vertex|effect/i.test(text)) {
    shaderRelated.push({ type, text });
  }
});
page.on('pageerror', err => errors.push('pageerror: ' + err.message));

console.log('Loading babylon indie-odyssey...');
await page.goto(`${BASE}/babylon_console.html?demo=indie-odyssey`, { waitUntil: 'domcontentloaded' });

await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_DEBUG?.forceCombat, { timeout: 60000 });
console.log('Cart ready. Forcing combat...');
await page.evaluate(() => globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['data_imp', 'glitch_rat']));

await page.waitForFunction(() => {
  const assets = globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || [];
  return assets.length >= 2 && assets.every(a => ['ready', 'error'].includes(a.modelStatus));
}, { timeout: 30000 });

await page.waitForTimeout(3000);
console.log('Combat steady-state sampled.\n');

console.log('=== ALL CONSOLE ERRORS ===');
errors.forEach(e => console.log('  ERR:', e));
console.log('\n=== CONSOLE WARNINGS (first 20) ===');
warnings.slice(0, 20).forEach(w => console.log('  WARN:', w));
console.log('\n=== SHADER / GLSL / COMPILE RELATED LOGS ===');
shaderRelated.forEach(s => console.log('  ' + s.type.toUpperCase() + ':', s.text));

console.log('\n=== SUMMARY ===');
console.log('Total logs:', allLogs.length);
console.log('Errors:', errors.length);
console.log('Warnings:', warnings.length);
console.log('Shader-related:', shaderRelated.length);

await browser.close();
