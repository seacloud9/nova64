import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const firstCart = readme
  .split('## 🎨 **Creating Your First 3D Cart**')[1]
  .match(/```javascript\n([\s\S]*?)```/)[1];

test.beforeEach(async ({ page }) => {
  await page.route('**/__studio-test-host', route =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body>
      <script>
        window.statuses = [];
        addEventListener('message', event => {
          if (event.source === document.querySelector('iframe')?.contentWindow)
            window.statuses.push(event.data);
        });
      </script>
      <iframe src="/cart-runner.html?studio=1" width="640" height="360"></iframe>
    </body></html>`,
    })
  );
  await page.goto('/__studio-test-host');
  await page.waitForFunction(() => window.statuses.some(s => s.type === 'EXECUTE_READY'));
});

test('the README cart runs through the studio host and draws HUD text without browser print', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const frame = page.frames().find(f => f.url().includes('cart-runner.html'));
  await frame.evaluate(() => {
    window.browserPrintCalls = 0;
    window.hudCalls = 0;
    window.print = () => {
      window.browserPrintCalls++;
    };
    const print = nova64.draw.print;
    nova64.draw.print = (...args) => {
      window.hudCalls++;
      return print(...args);
    };
  });
  await page.evaluate(code => {
    document
      .querySelector('iframe')
      .contentWindow.postMessage({ type: 'EXECUTE_CODE', code }, location.origin);
  }, firstCart);
  await page.waitForFunction(() => window.statuses.some(s => s.type === 'EXECUTE_SUCCESS'));
  await frame.waitForFunction(() => window.hudCalls > 1);
  expect(await frame.evaluate(() => window.browserPrintCalls)).toBe(0);
  expect(errors).toEqual([]);
});

test('the module shape the old README documented runs instead of failing', async ({ page }) => {
  // nova64@0.5.3 documented `export function init()`, so this form is already
  // widespread in copied snippets and in assistant-generated carts. It has to
  // run end to end through the real embedding path, not merely error politely.
  await page.evaluate(() => {
    window.statuses.length = 0;
    document.querySelector('iframe').contentWindow.postMessage(
      {
        type: 'EXECUTE_CODE',
        code: [
          'export function init() { globalThis.__moduleShapeRan = true; }',
          'export function update(dt) {}',
          'export function draw() {}',
        ].join('\n'),
      },
      location.origin
    );
  });
  await page.waitForFunction(() => window.statuses.some(s => s.type === 'EXECUTE_SUCCESS'));
  const frame = page.frames().find(f => f.url().includes('cart-runner.html'));
  expect(await frame.evaluate(() => window.__moduleShapeRan)).toBe(true);
});

test('import syntax is returned to the host with an actionable studio error', async ({ page }) => {
  // Unlike `export`, an import cannot be dropped — the cart would reference
  // bindings that were never created — so it must still fail, and say why.
  await page.evaluate(() => {
    window.statuses.length = 0;
    document.querySelector('iframe').contentWindow.postMessage(
      {
        type: 'EXECUTE_CODE',
        code: "import cart from './cart.js'; function init() {}",
      },
      location.origin
    );
  });
  await page.waitForFunction(() => window.statuses.some(s => s.type === 'EXECUTE_ERROR'));
  const error = await page.evaluate(
    () => window.statuses.find(s => s.type === 'EXECUTE_ERROR').error
  );
  expect(error).toMatch(/Studio executes scripts/);
  expect(error).toMatch(/without import or export/);
});

test('opaque-origin code is rejected with a warning before execution', async ({ page }) => {
  const warnings = [];
  page.on('console', message => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  const frame = page.frames().find(f => f.url().includes('cart-runner.html'));
  // Synthetic event isolates the runtime's guard from iframe sandbox/CORS loading.
  await frame.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        origin: 'null',
        data: { type: 'EXECUTE_CODE', code: 'globalThis.untrustedCartRan = true;' },
      })
    );
  });
  await expect
    .poll(() => warnings.some(w => w.includes('Rejected EXECUTE_CODE: untrusted origin: null')))
    .toBe(true);
  expect(await frame.evaluate(() => window.untrustedCartRan)).toBeUndefined();
  expect(await page.evaluate(() => window.statuses.some(s => s.type === 'EXECUTE_SUCCESS'))).toBe(
    false
  );
});
