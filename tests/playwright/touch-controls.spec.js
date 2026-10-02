// On-screen touch controls.
//
// The whole design rests on one claim: a touch press is indistinguishable from
// a key press, because both go through input.setKeyState(). These tests check
// that claim through the public cart-facing API (nova64.key / nova64.keyp)
// rather than by poking at internals, and they drive the overlay with real
// touch events on an emulated phone and tablet.

import { test, expect, devices } from '@playwright/test';

// `defaultBrowserType` cannot be set inside a describe (it would force a new
// worker), and the project already pins chromium — so take everything else:
// viewport, deviceScaleFactor, userAgent, isMobile and hasTouch.
const { defaultBrowserType: _p, ...PHONE } = devices['Pixel 5'];
const { defaultBrowserType: _t, ...TABLET } = devices['iPad (gen 7)'];

// cart-runner.html is the chrome-less shell, so the overlay is the only UI.
const URL = '/cart-runner.html?demo=hello-world&w=1280&h=720';

const ROOT = '#nova64-touch-controls';

// Each test boots the runtime from scratch, which on a cold Vite start is well
// past the 30s default.
test.describe.configure({ timeout: 120_000 });

async function bootWithTouch(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`${ROOT} .n64t-pad`, { timeout: 60_000 });
}

/** Ask the runtime what the cart would see. */
const keyDown = (page, code) => page.evaluate(c => globalThis.nova64.input.key(c), code);

/** Controls carry data-control; labels are not unique ("START" contains an "A"). */
const control = (page, id) => page.locator(`${ROOT} [data-control="${id}"]`);

/**
 * Touch a control at a relative position inside it (0..1 on each axis).
 * Dispatched as a real PointerEvent in the page so pointerId, coordinates and
 * multi-touch all behave as they would under a finger.
 */
async function touch(page, id, type, pointerId, fx = 0.5, fy = 0.5) {
  await page.evaluate(
    ({ id, type, pointerId, fx, fy }) => {
      const el = document.querySelector(`#nova64-touch-controls [data-control="${id}"]`);
      if (!el) throw new Error(`no control "${id}"`);
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 1,
          bubbles: true,
          cancelable: true,
          clientX: r.left + r.width * fx,
          clientY: r.top + r.height * fy,
        })
      );
    },
    { id, type, pointerId, fx, fy }
  );
}

test.describe('touch controls', () => {
  test.use({ ...PHONE });

  test('appear automatically on a phone', async ({ page }) => {
    await bootWithTouch(page);
    await expect(page.locator(`${ROOT} .n64t-pad`)).toBeVisible();
    await expect(page.locator(`${ROOT} .n64t-actions`)).toBeVisible();
    await expect(page.locator(`${ROOT} .n64t-toggle`)).toBeVisible();
  });

  test('a button press reads as a held key, and releases on lift', async ({ page }) => {
    await bootWithTouch(page);
    const a = control(page, 'a');

    expect(await keyDown(page, 'Space')).toBe(false);

    await touch(page, 'a', 'pointerdown', 1);
    expect(await keyDown(page, 'Space')).toBe(true);
    await expect(a).toHaveClass(/is-active/);

    await touch(page, 'a', 'pointerup', 1);
    expect(await keyDown(page, 'Space')).toBe(false);
    await expect(a).not.toHaveClass(/is-active/);
  });

  test('a press survives a frame — it is held, not a one-shot', async ({ page }) => {
    await bootWithTouch(page);
    await touch(page, 'a', 'pointerdown', 1);
    // input.step() runs every frame and rotates the prev-key map; a held key
    // must still read as down several frames later.
    await page.waitForTimeout(250);
    expect(await keyDown(page, 'Space')).toBe(true);
    await touch(page, 'a', 'pointerup', 1);
  });

  test('two controls can be held at once', async ({ page }) => {
    await bootWithTouch(page);
    // Left arm of the d-pad, plus the A button, on separate pointers.
    await touch(page, 'pad', 'pointerdown', 2, 0.12, 0.5);
    await touch(page, 'a', 'pointerdown', 3);

    // Moving and firing at the same time — the thing a d-pad exists for.
    expect(await keyDown(page, 'ArrowLeft')).toBe(true);
    expect(await keyDown(page, 'KeyA')).toBe(true);
    expect(await keyDown(page, 'Space')).toBe(true);

    // Releasing one must not release the other.
    await touch(page, 'a', 'pointerup', 3);
    expect(await keyDown(page, 'Space')).toBe(false);
    expect(await keyDown(page, 'ArrowLeft')).toBe(true);
  });

  test('the d-pad produces diagonals', async ({ page }) => {
    await bootWithTouch(page);
    // Up-left of the pad centre.
    await touch(page, 'pad', 'pointerdown', 4, 0.18, 0.18);
    expect(await keyDown(page, 'ArrowUp')).toBe(true);
    expect(await keyDown(page, 'ArrowLeft')).toBe(true);
    // ...and not the opposite arms.
    expect(await keyDown(page, 'ArrowDown')).toBe(false);
    expect(await keyDown(page, 'ArrowRight')).toBe(false);
  });

  test('a thumb resting dead centre presses nothing', async ({ page }) => {
    await bootWithTouch(page);
    await touch(page, 'pad', 'pointerdown', 9, 0.5, 0.5);
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(await keyDown(page, code)).toBe(false);
    }
  });

  test('sliding across the pad swaps direction without sticking', async ({ page }) => {
    await bootWithTouch(page);
    await touch(page, 'pad', 'pointerdown', 10, 0.12, 0.5); // left
    expect(await keyDown(page, 'ArrowLeft')).toBe(true);
    await touch(page, 'pad', 'pointermove', 10, 0.88, 0.5); // slide to right
    expect(await keyDown(page, 'ArrowRight')).toBe(true);
    expect(await keyDown(page, 'ArrowLeft')).toBe(false);
  });

  test('the toggle hides the controls, stays reachable, and releases held keys', async ({
    page,
  }) => {
    await bootWithTouch(page);
    const pad = page.locator(`${ROOT} .n64t-pad`);
    const toggle = page.locator(`${ROOT} .n64t-toggle`);

    // Hold a direction, then hide while it is still down.
    await touch(page, 'pad', 'pointerdown', 5, 0.12, 0.5);
    expect(await keyDown(page, 'ArrowLeft')).toBe(true);

    await toggle.click();
    await expect(pad).toBeHidden();
    // A key stuck down after the pad vanished would be unrecoverable.
    expect(await keyDown(page, 'ArrowLeft')).toBe(false);
    // The way back must remain on screen.
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(pad).toBeVisible();
  });

  test('the overlay cannot scroll or select the page', async ({ page }) => {
    await bootWithTouch(page);
    const styles = await page.evaluate(() => {
      const el = document.querySelector('#nova64-touch-controls');
      const pad = el.querySelector('.n64t-pad');
      const get = (n, p) => getComputedStyle(n)[p];
      return {
        rootTouchAction: get(el, 'touchAction'),
        padTouchAction: get(pad, 'touchAction'),
        rootUserSelect: get(el, 'userSelect') || get(el, 'webkitUserSelect'),
      };
    });
    expect(styles.rootTouchAction).toBe('none');
    expect(styles.padTouchAction).toBe('none');
    expect(styles.rootUserSelect).toBe('none');
  });
});

test.describe('touch controls — configuration', () => {
  test('are absent on desktop by default', async ({ page }) => {
    // Default project (Desktop Chrome): fine pointer, so 'auto' must say no.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!globalThis.nova64, null, { timeout: 60_000 });
    await expect(page.locator(ROOT)).toHaveCount(0);
  });

  test('NOVA64_TOUCH_CONTROLS = true forces them on desktop', async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.NOVA64_TOUCH_CONTROLS = true;
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`${ROOT} .n64t-pad`)).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('touch controls — tablet', () => {
  test.use({ ...TABLET });

  test('appear on a tablet and sit inside the safe area', async ({ page }) => {
    await bootWithTouch(page);
    const pad = page.locator(`${ROOT} .n64t-pad`);
    await expect(pad).toBeVisible();
    const box = await pad.boundingBox();
    const size = page.viewportSize();
    // Comfortably on screen, not clipped off an edge.
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    // Touch targets must stay generous on a big screen.
    expect(box.width).toBeGreaterThanOrEqual(120);
  });
});
