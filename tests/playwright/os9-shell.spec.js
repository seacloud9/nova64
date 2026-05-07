// @ts-check
import { test, expect } from '@playwright/test';

/**
 * OS9 Shell – minimize / restore bug-fix verification
 * and new screensaver smoke tests.
 */

const OS9_URL = '/os9-shell/index.html';

/**
 * Wait for the OS9 boot to complete and the desktop to appear.
 */
async function waitForBoot(page, timeoutMs = 40000) {
  await page.goto(OS9_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.desktop', { timeout: timeoutMs });
  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// Minimize / Restore Bug Fix
// ---------------------------------------------------------------------------

test.describe('OS9 Shell – Window Minimize / Restore', () => {
  test('minimized window uses visibility:hidden, not display:none', async ({ page }) => {
    await waitForBoot(page);

    // Double-click the Game Launcher desktop icon to open a window
    // Use .desktop-icon-label with exact text to avoid strict mode issues
    const gameLauncherIcon = page.locator('.desktop-icon').filter({ hasText: /^Game Launcher$/ }).first();
    await gameLauncherIcon.dblclick();
    await page.waitForTimeout(1500);

    // There should be at least one window
    const windows = page.locator('.window');
    expect(await windows.count()).toBeGreaterThanOrEqual(1);

    const windowEl = windows.first();
    const windowId = await windowEl.getAttribute('data-window-id');
    expect(windowId).toBeTruthy();

    // Click minimize button
    const minimizeBtn = windowEl.locator('.window-minimize');
    await minimizeBtn.click();
    await page.waitForTimeout(500);

    // Should NOT use display:none — should use visibility:hidden
    const displayVal = await windowEl.evaluate(
      el => window.getComputedStyle(el).display
    );
    expect(displayVal).not.toBe('none');

    const visibilityVal = await windowEl.evaluate(
      el => window.getComputedStyle(el).visibility
    );
    expect(visibilityVal).toBe('hidden');

    // Dock button should appear
    const dockItem = page.locator('.minimized-dock-item');
    await expect(dockItem.first()).toBeVisible();

    // Click dock button to restore
    await dockItem.first().click();
    await page.waitForTimeout(500);

    // Window should be visible again
    const visAfter = await windowEl.evaluate(
      el => window.getComputedStyle(el).visibility
    );
    expect(visAfter).toBe('visible');

    // Content area should have content
    const content = windowEl.locator('.window-content');
    await expect(content).toBeVisible();
    const contentHeight = await content.evaluate(el => el.scrollHeight);
    expect(contentHeight).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Screensaver Smoke Tests
// ---------------------------------------------------------------------------

test.describe('OS9 Shell – Screensavers', () => {
  const screensaverIds = [
    'flying-toasters',
    'maze-3d',
    'queens',
    'aquarium',
  ];

  for (const hackId of screensaverIds) {
    test(`screensaver "${hackId}" activates and renders`, async ({ page }) => {
      await waitForBoot(page);

      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      // Activate the screensaver via the global store hook
      const activated = await page.evaluate((id) => {
        const store = window.__screensaverStore;
        if (store && typeof store.getState === 'function') {
          store.getState().setHack(id);
          store.getState().activate();
          return true;
        }
        return false;
      }, hackId);

      if (!activated) {
        // If global hook is not available, skip gracefully
        test.skip(true, '__screensaverStore global not available in built bundle');
        return;
      }

      // Give screensaver time to init and render a few frames
      await page.waitForTimeout(2500);

      // The screensaver overlay should be visible
      const overlay = page.locator('.screensaver-overlay');
      await expect(overlay).toBeVisible({ timeout: 5000 });

      // The canvas should have non-zero dimensions
      const canvas = overlay.locator('canvas.screensaver-canvas');
      const dims = await canvas.evaluate(el => ({
        width: el.width,
        height: el.height,
      }));
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);

      // No uncaught JS errors
      expect(errors).toEqual([]);

      // Dismiss the screensaver
      await overlay.click();
      await page.waitForTimeout(500);
    });
  }
});
