import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import { loadCart } from './helpers.js';

/**
 * hello-world cart regression suite.
 *
 * Guards against the black-screen failure mode that plagued this cart:
 *  - nova64.post.setBloom/setChromatic/setVignette crashing init()
 *  - bare-global clearSkybox/createSpaceSkybox/enableSkyboxAutoAnimate throwing ReferenceError
 *  - setMeshEmissive missing from runtime or not gated behind meshOptions capability
 *
 * All three families of bugs cause init() to abort before orbs are created,
 * producing a black canvas and per-frame "mesh with id undefined" floods.
 */

test.describe('hello-world cart', () => {
  test('init() completes without throwing', async ({ page }) => {
    const errors = [];
    const warnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await loadCart(page, 'hello-world', 'threejs');

    // No init() crash
    const initErrors = errors.filter(t => /Cart init\(\) threw|ReferenceError|TypeError/.test(t));
    expect(initErrors).toEqual([]);
  });

  test('canvas renders non-black content', async ({ page }) => {
    await loadCart(page, 'hello-world', 'threejs');

    // Three.js claims the WebGL context — getContext('2d') would return null.
    // Use Playwright's DevTools screenshot of the element instead (captures
    // what's visually rendered, works for WebGL canvases).
    const screenshotBuffer = await page.locator('#screen').screenshot();
    const png = PNG.sync.read(screenshotBuffer);

    let nonDarkPixels = 0;
    for (let i = 0; i < png.data.length; i += 16) {
      if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 30) nonDarkPixels++;
    }

    expect(nonDarkPixels).toBeGreaterThan(200);
  });

  test('no "mesh with id undefined" flood in update loop', async ({ page }) => {
    const meshUndefinedWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('mesh with id undefined')) {
        meshUndefinedWarnings.push(msg.text());
      }
    });

    await loadCart(page, 'hello-world', 'threejs');
    // Allow a few extra frames to accumulate any per-frame flood
    await page.waitForTimeout(500);

    expect(meshUndefinedWarnings.length).toBe(0);
  });

  test('nova64.post shim is available and delegates to nova64.fx', async ({ page }) => {
    await page.goto('/console.html');
    await page.waitForFunction(() => typeof globalThis.nova64?.fx?.enableBloom === 'function', {
      timeout: 30000,
    });

    const shimOk = await page.evaluate(() => {
      const n = globalThis.nova64;
      return (
        typeof n?.post?.setBloom === 'function' &&
        typeof n?.post?.setChromatic === 'function' &&
        typeof n?.post?.setVignette === 'function'
      );
    });

    expect(shimOk).toBe(true);
  });

  test('nova64.light exposes skybox helpers', async ({ page }) => {
    await page.goto('/console.html');
    await page.waitForFunction(() => typeof globalThis.nova64?.light?.clearSkybox === 'function', {
      timeout: 30000,
    });

    const skyboxOk = await page.evaluate(() => {
      const l = globalThis.nova64?.light;
      return (
        typeof l?.clearSkybox === 'function' &&
        typeof l?.createSpaceSkybox === 'function' &&
        typeof l?.enableSkyboxAutoAnimate === 'function'
      );
    });

    expect(skyboxOk).toBe(true);
  });

  test('setMeshEmissive is available in nova64.scene', async ({ page }) => {
    await page.goto('/console.html');
    await page.waitForFunction(
      () => typeof globalThis.nova64?.scene?.setMeshEmissive === 'function',
      { timeout: 30000 }
    );

    const ok = await page.evaluate(
      () => typeof globalThis.nova64?.scene?.setMeshEmissive === 'function'
    );
    expect(ok).toBe(true);
  });
});
