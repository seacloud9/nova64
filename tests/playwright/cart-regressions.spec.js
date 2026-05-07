import { test, expect } from '@playwright/test';

import { loadCart } from './helpers.js';

test.describe('Cart Regressions', () => {
  test('particle-fireworks should boot in Babylon without burst init errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', error => errors.push(error.message));

    await loadCart(page, 'particle-fireworks', 'babylon');
    await page.waitForTimeout(500);

    const hasBurstEmitter = await page.evaluate(
      () => typeof globalThis.nova64?.fx?.burstEmitter2D === 'function'
    );
    const seriousErrors = errors.filter(text =>
      /Cart init\(\) threw|burst is not defined|ReferenceError/.test(text)
    );

    expect(hasBurstEmitter).toBe(true);
    expect(seriousErrors).toEqual([]);
  });
});
