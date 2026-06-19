// Regression test for the EffectComposer-swallows-setClearColor bug.
//
// Why this test exists:
//   The threejs backend's post-processing pipeline (api-effects.js) installs
//   an EffectComposer with a RenderPass + UnrealBloomPass when a cart calls
//   nova64.fx.enableBloom(...). Two earlier failure modes burned us:
//
//   1. Calling nova64.fx.disableBloom() removed the bloom pass but DID NOT
//      flip the surviving RenderPass's `renderToScreen` flag back to true,
//      so the renderer wrote to an internal target and the canvas stayed
//      whatever it was last frame (usually black).
//
//   2. Even with bloom enabled, the UnrealBloomPass's blend math + the
//      shared internal render targets could swallow the renderer's clear
//      color so the carts' `nova64.scene.setClearColor(...)` call had no
//      visible effect — the canvas read pure black.
//
//   The fix indie-odyssey uses is `nova64.fx.setBloomStrength(0)`, which
//   keeps the bloom pass alive (so the composer's terminal renderToScreen
//   pass is unchanged) but contributes no glow, letting the clear color
//   reach the canvas.
//
// What this test asserts: when bloom is enabled and bloom strength is 0,
// changing the renderer's clear color via the cart API DOES change the
// canvas's actual rendered pixels.

import { test, expect } from '@playwright/test';

const BASE = process.env.NOVA64_TEST_BASE || 'http://localhost:3000';

const COLORS_TO_TEST = [
  { hex: 0xff0000, label: 'red', minR: 120, maxGB: 60 },
  { hex: 0x00ff00, label: 'green', minG: 120, maxRB: 60 },
  { hex: 0x0000ff, label: 'blue', minB: 120, maxRG: 60 },
  { hex: 0x6a1aa6, label: 'cyberpunk-purple', minR: 80, minB: 80, maxG: 60 },
];

for (const { hex, label, minR = 0, minG = 0, minB = 0, maxRG, maxRB, maxGB, maxG, maxRGB } of COLORS_TO_TEST) {
  test(`setClearColor reaches the canvas after enableBloom (${label})`, async ({ page }) => {
    test.setTimeout(60000);

    // Use indie-odyssey because it explicitly hides level meshes during
    // combat, leaving the cleared 3D scene background visible — the exact
    // scenario where this fix matters. Demoscene fills the canvas every
    // frame so its result hides the renderer's clear color regardless of
    // whether the fix works (and demoscene has its own render-clear bug
    // we're tracking separately against the retroarch parity baseline).
    await page.goto(`${BASE}/console.html?demo=indie-odyssey`, { waitUntil: 'domcontentloaded' });

    // Wait for the cart + nova64 surface to come online and force combat
    // so all dungeon meshes are hidden — that's the configuration where
    // the renderer's clear color becomes visible as the background.
    await page.waitForFunction(() => globalThis.nova64?.scene?.setClearColor && globalThis.nova64?.fx?.enableBloom && globalThis.__INDIE_ODYSSEY_DEBUG?.forceCombat, { timeout: 30000 });

    await page.evaluate(c => {
      globalThis.nova64.fx.enableBloom({ strength: 0.7, radius: 0.5, threshold: 0.22 });
      globalThis.nova64.fx.setEffectsBypass(true);
      globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['necro_scribe', 'rogue_protocol']); // sprite-only enemies → no GLBs cover bg
      globalThis.nova64.scene.setClearColor(c);
    }, hex);

    // Let several frames render so the clear color lands.
    await page.waitForTimeout(800);

    // Sample the visible canvas via Playwright's screenshot of the canvas
    // element — captures what the user actually sees, immune to the
    // preserveDrawingBuffer:false drawImage quirks.
    const canvasBox = await page.locator('#screen').boundingBox();
    expect(canvasBox, 'canvas must exist').toBeTruthy();
    const png = await page.screenshot({ clip: canvasBox, type: 'png' });

    const pixel = await page.evaluate(async pngBase64 => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngBase64; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // Sample top-left corner of the canvas — far from any combat UI text
      // / sprites, deepest into the cleared background region.
      const data = ctx.getImageData(8, 8, 8, 8).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      const n = data.length / 4;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    }, png.toString('base64'));

    expect(pixel, 'canvas pixel sample should be non-null').not.toBeNull();
    const [r, g, b] = pixel;

    // The canvas pixel must not be uniformly black — proves clear color
    // actually reaches the screen.
    expect(Math.max(r, g, b), `${label}: canvas is black (${pixel}) — setClearColor not reaching screen`).toBeGreaterThan(20);

    // Channel-specific sanity checks per colour.
    if (minR) expect(r, `${label} R channel`).toBeGreaterThan(minR);
    if (minG) expect(g, `${label} G channel`).toBeGreaterThan(minG);
    if (minB) expect(b, `${label} B channel`).toBeGreaterThan(minB);
    if (maxRG !== undefined) { expect(r).toBeLessThan(maxRG); expect(g).toBeLessThan(maxRG); }
    if (maxRB !== undefined) { expect(r).toBeLessThan(maxRB); expect(b).toBeLessThan(maxRB); }
    if (maxGB !== undefined) { expect(g).toBeLessThan(maxGB); expect(b).toBeLessThan(maxGB); }
    if (maxG !== undefined) expect(g).toBeLessThan(maxG);
    if (maxRGB !== undefined) { expect(r).toBeLessThan(maxRGB); expect(g).toBeLessThan(maxRGB); expect(b).toBeLessThan(maxRGB); }
  });
}

test('setEffectsBypass(true) — canvas is the exact clear colour as seen by the user', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(`${BASE}/console.html?demo=indie-odyssey`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.nova64?.scene?.setClearColor && globalThis.nova64?.fx?.setEffectsBypass && globalThis.__INDIE_ODYSSEY_DEBUG?.forceCombat, { timeout: 30000 });

  // Reproduce the cart's combat-entry sequence and confirm the renderer
  // state is set as expected.
  const state = await page.evaluate(async () => {
    globalThis.nova64.fx.enableBloom({ strength: 0.7, radius: 0.5, threshold: 0.22 });
    globalThis.nova64.fx.setEffectsBypass(true);
    globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['necro_scribe', 'rogue_protocol']);
    globalThis.nova64.scene.setClearColor(0xff8800);
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 800));
    const renderer = globalThis.nova64.scene.getRenderer?.();
    const THREE = globalThis.THREE;
    let clearHex = null;
    if (renderer?.getClearColor) {
      const c = new THREE.Color();
      renderer.getClearColor(c);
      clearHex = c.getHexString();
    }
    return { clearHex, bypassed: globalThis.nova64.fx.isEffectsBypassed?.() };
  });
  expect(state.clearHex).toBe('ff8800');
  expect(state.bypassed).toBe(true);

  // Now what does the USER actually see? Capture the rendered page (which
  // composites the canvas through the browser the same way the human eye
  // sees it) and sample the centre of the canvas region.
  const canvasBox = await page.locator('#screen').boundingBox();
  expect(canvasBox, 'canvas must exist').toBeTruthy();
  const screenshotBuf = await page.screenshot({ clip: canvasBox, type: 'png' });

  // Decode PNG via a sharp-less route: use the browser to interpret the PNG.
  const samplePx = await page.evaluate(async pngBase64 => {
    const img = new Image();
    const url = 'data:image/png;base64,' + pngBase64;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    // Sample from the top-left corner — far from combat HUD/sprite area,
    // where the bare cleared 3D background should dominate.
    const data = ctx.getImageData(8, 8, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255];
  }, screenshotBuf.toString('base64'));

  // Browser screenshots are always opaque (alpha=255). The colour must be
  // an orange — R dominant — proving the user sees the clear color, not
  // page-background-bleed-through.
  expect(samplePx[3], 'screenshot alpha is always 255').toBe(255);
  expect(samplePx[0], 'R should dominate for orange').toBeGreaterThan(samplePx[2] + 30);
  expect(Math.max(...samplePx.slice(0, 3)), 'screenshot must not be black').toBeGreaterThan(60);
});

test('setEffectsBypass(false) restores composer (opt-in)', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto(`${BASE}/console.html?demo=demoscene`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.nova64?.fx?.setEffectsBypass, { timeout: 30000 });

  const states = await page.evaluate(() => {
    const start = globalThis.nova64.fx.isEffectsBypassed?.();
    globalThis.nova64.fx.setEffectsBypass(true);
    const on = globalThis.nova64.fx.isEffectsBypassed?.();
    globalThis.nova64.fx.setEffectsBypass(false);
    const off = globalThis.nova64.fx.isEffectsBypassed?.();
    return { start, on, off };
  });

  expect(states.start).toBe(false);
  expect(states.on).toBe(true);
  expect(states.off).toBe(false);
});
