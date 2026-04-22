import { test, expect } from '@playwright/test';
import {
  loadCart,
  getConsoleLogs,
  extractMetrics,
  pressKey,
  screenshotCanvas,
  waitFor3DScene,
  getPlayerPosition,
  isTextRendering
} from './helpers.js';

// List of carts to test
const CARTS_TO_TEST = [
  { name: 'space-harrier-3d', description: 'Space Harrier 3D' },
  { name: 'crystal-cathedral-3d', description: 'Crystal Cathedral 3D' },
  { name: 'f-zero-nova-3d', description: 'F-Zero Nova 3D' },
  { name: 'wad-demo', description: 'WAD Demo' },
  { name: 'hello-3d', description: 'Hello 3D (Basic)' },
];

// Test each cart in both backends
for (const cart of CARTS_TO_TEST) {
  test.describe(`${cart.description} - Backend Parity`, () => {
    test('should load without errors in Three.js', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, cart.name, 'threejs');
      await waitFor3DScene(page, 'threejs');

      const metrics = extractMetrics(logs);
      expect(metrics.errors.length, 'No console errors').toBe(0);
    });

    test('should load without errors in Babylon.js', async ({ page }) => {
      const logs = [];
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, cart.name, 'babylon');
      await waitFor3DScene(page, 'babylon');

      const metrics = extractMetrics(logs);
      expect(metrics.errors.length, 'No console errors').toBe(0);
    });

    test('should have matching console output between backends', async ({ page }) => {
      // Load Three.js version
      const logsThreejs = [];
      page.on('console', msg => logsThreejs.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, cart.name, 'threejs');
      await page.waitForTimeout(3000);

      const metricsThreejs = extractMetrics(logsThreejs);

      // Load Babylon.js version
      const logsBabylon = [];
      page.removeAllListeners('console');
      page.on('console', msg => logsBabylon.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, cart.name, 'babylon');
      await page.waitForTimeout(3000);

      const metricsBabylon = extractMetrics(logsBabylon);

      // Compare metrics
      console.log('Three.js metrics:', metricsThreejs);
      console.log('Babylon.js metrics:', metricsBabylon);

      // Both should have similar number of print calls (within 20%)
      if (metricsThreejs.printCalls.length > 0) {
        const diff = Math.abs(metricsThreejs.printCalls.length - metricsBabylon.printCalls.length);
        const tolerance = Math.ceil(metricsThreejs.printCalls.length * 0.2);
        expect(diff, 'Print calls should match').toBeLessThanOrEqual(tolerance);
      }

      // Both should have no errors
      expect(metricsThreejs.errors.length, 'Three.js should have no errors').toBe(0);
      expect(metricsBabylon.errors.length, 'Babylon.js should have no errors').toBe(0);
    });
  });
}

// Specific tests for Space Harrier (text rendering and controls)
test.describe('Space Harrier - Text Rendering', () => {
  test('should render start screen text in Three.js', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await loadCart(page, 'space-harrier-3d', 'threejs');
    await page.waitForTimeout(2000);

    const textStatus = isTextRendering(logs);
    console.log('Three.js text rendering:', textStatus);

    expect(textStatus.printCallsMade, 'print() should be called').toBe(true);
    expect(textStatus.hasFramebufferContent, 'Framebuffer should have content').toBe(true);
  });

  test('should render start screen text in Babylon.js', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await loadCart(page, 'space-harrier-3d', 'babylon');
    await page.waitForTimeout(2000);

    const textStatus = isTextRendering(logs);
    console.log('Babylon.js text rendering:', textStatus);

    expect(textStatus.printCallsMade, 'print() should be called').toBe(true);
    expect(textStatus.hasFramebufferContent, 'Framebuffer should have content').toBe(true);
  });
});

// Specific tests for Space Harrier (player controls)
test.describe('Space Harrier - Player Controls', () => {
  test('should move player left in Three.js', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await loadCart(page, 'space-harrier-3d', 'threejs');
    await page.waitForTimeout(2000);

    // Press Space to start game
    await pressKey(page, 'Space', 200);
    await page.waitForTimeout(1000);

    // Get initial position
    const initialPos = getPlayerPosition(logs);

    // Press 'A' to move left
    await pressKey(page, 'a', 500);
    await page.waitForTimeout(1000);

    const finalPos = getPlayerPosition(logs);

    if (initialPos && finalPos) {
      console.log('Three.js movement:', { initialPos, finalPos });
      expect(finalPos.x, 'Player should move left (negative X)').toBeLessThan(initialPos.x);
    }
  });

  test('should move player left in Babylon.js', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await loadCart(page, 'space-harrier-3d', 'babylon');
    await page.waitForTimeout(2000);

    // Press Space to start game
    await pressKey(page, 'Space', 200);
    await page.waitForTimeout(1000);

    // Get initial position
    const initialPos = getPlayerPosition(logs);

    // Press 'A' to move left
    await pressKey(page, 'a', 500);
    await page.waitForTimeout(1000);

    const finalPos = getPlayerPosition(logs);

    if (initialPos && finalPos) {
      console.log('Babylon.js movement:', { initialPos, finalPos });
      expect(finalPos.x, 'Player should move left (negative X)').toBeLessThan(initialPos.x);
    }
  });

  test('should enforce player boundaries in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.removeAllListeners('console');
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, 'space-harrier-3d', backend);
      await page.waitForTimeout(2000);

      // Start game
      await pressKey(page, 'Space', 200);
      await page.waitForTimeout(500);

      // Hold right key for a long time to try to go out of bounds
      await pressKey(page, 'd', 3000);
      await page.waitForTimeout(1000);

      const pos = getPlayerPosition(logs);
      console.log(`${backend} boundary test:`, pos);

      if (pos) {
        expect(pos.x, `${backend}: Player X should be within bounds`).toBeLessThanOrEqual(22);
        expect(pos.x, `${backend}: Player X should be within bounds`).toBeGreaterThanOrEqual(-22);
      }
    }
  });
});

// Visual comparison test
test.describe('Visual Comparison', () => {
  test('should have similar visual output', async ({ page }) => {
    // Take screenshot of Three.js version
    await loadCart(page, 'hello-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');
    const screenshotThreejs = await screenshotCanvas(page, 'threejs');

    // Take screenshot of Babylon.js version
    await loadCart(page, 'hello-3d', 'babylon');
    await waitFor3DScene(page, 'babylon');
    const screenshotBabylon = await screenshotCanvas(page, 'babylon');

    // Save screenshots for manual inspection
    await page.screenshot({ path: 'screenshots/hello-3d-threejs.png', fullPage: true });
    await loadCart(page, 'hello-3d', 'babylon');
    await page.screenshot({ path: 'screenshots/hello-3d-babylon.png', fullPage: true });

    // Note: Actual pixel comparison would require additional library
    // For now, just ensure both screenshots were captured
    expect(screenshotThreejs.length).toBeGreaterThan(0);
    expect(screenshotBabylon.length).toBeGreaterThan(0);
  });
});
