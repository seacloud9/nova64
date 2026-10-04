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

test('module syntax is returned to the host with an actionable studio error', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('iframe').contentWindow.postMessage(
      {
        type: 'EXECUTE_CODE',
        code: 'export function init() {}',
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
