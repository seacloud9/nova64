import { PNG } from 'pngjs';

/**
 * Playwright Test Helpers for Nova64 Backend Comparison
 */

/**
 * Load a cart in either Three.js or Babylon.js backend
 * @param {import('@playwright/test').Page} page
 * @param {string} cartName - e.g., 'space-harrier-3d'
 * @param {'threejs'|'babylon'} backend
 */
export async function loadCart(page, cartName, backend = 'threejs') {
  const url =
    backend === 'babylon'
      ? `/babylon_console.html?demo=${cartName}`
      : `/console.html?demo=${cartName}`;

  await page.goto(url);

  // Wait for cart to initialize
  await page.waitForFunction(
    () => {
      return !document.body.textContent.includes('Loading');
    },
    { timeout: 30000 }
  );

  // Wait an additional 2 seconds for rendering to stabilize
  await page.waitForTimeout(2000);
}

/**
 * Get console logs from the page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{type: string, text: string}>>}
 */
export async function getConsoleLogs(page) {
  const logs = [];
  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });
  return logs;
}

/**
 * Extract debug metrics from console logs
 * @param {Array<{type: string, text: string}>} logs
 */
export function extractMetrics(logs) {
  const metrics = {
    printCalls: [],
    framebufferPixels: [],
    playerMoves: [],
    errors: [],
    warnings: [],
  };

  logs.forEach(log => {
    const text = log.text;

    // Extract print() calls
    if (text.includes('print() called:')) {
      const match = text.match(/text="([^"]+)"/);
      if (match) metrics.printCalls.push(match[1]);
    }

    // Extract framebuffer pixel counts
    if (text.includes('Framebuffer composite:')) {
      const match = text.match(/(\d+) non-zero pixels/);
      if (match) metrics.framebufferPixels.push(parseInt(match[1]));
    }

    // Extract player movement
    if (text.includes('[Space Harrier] Player move:')) {
      const match = text.match(/pos=\(([^)]+)\)/);
      if (match) metrics.playerMoves.push(match[1]);
    }

    if (log.type === 'error') metrics.errors.push(text);
    if (log.type === 'warning') metrics.warnings.push(text);
  });

  return metrics;
}

/**
 * Simulate player input
 * @param {import('@playwright/test').Page} page
 * @param {string} key - e.g., 'w', 'a', 's', 'd', 'Space'
 * @param {number} duration - milliseconds to hold key
 */
export async function pressKey(page, key, duration = 100) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

/**
 * Take a screenshot of the canvas
 * @param {import('@playwright/test').Page} page
 * @param {string} _backend
 * @param {object} [options]
 */
export async function screenshotCanvas(page, _backend, options = {}) {
  // Both backends use id="screen"
  const canvasSelector = '#screen';
  const canvas = page.locator(canvasSelector);
  return await canvas.screenshot(options);
}

/**
 * Compare two screenshots using pixel diff
 * @param {Buffer} screenshot1
 * @param {Buffer} screenshot2
 * @returns {Promise<number>} - Similarity percentage (0-100)
 */
export async function compareScreenshots(screenshot1, screenshot2) {
  // For now, just return a placeholder
  // In a real implementation, you'd use a library like pixelmatch
  return 95; // Placeholder
}

/**
 * Wait for 3D scene to be ready
 * @param {import('@playwright/test').Page} page
 * @param {string} backend
 */
export async function waitFor3DScene(page, backend) {
  // Wait for the main canvas to exist (both backends use id="screen")
  const canvasSelector = '#screen';
  await page.waitForSelector(canvasSelector, { timeout: 30000 });

  // Wait for Nova64 API to be available (global functions exposed)
  await page.waitForFunction(
    () => {
      return (
        typeof globalThis.createCube === 'function' &&
        typeof globalThis.setCameraPosition === 'function'
      );
    },
    { timeout: 30000 }
  );

  // Wait an additional 2 seconds for first frame to render
  await page.waitForTimeout(2000);
}

/**
 * Get player position from console logs
 * @param {Array<{type: string, text: string}>} logs
 */
export function getPlayerPosition(logs) {
  const playerLogs = logs.filter(log => log.text.includes('Player move:'));
  if (playerLogs.length === 0) return null;

  const lastLog = playerLogs[playerLogs.length - 1];
  const match = lastLog.text.match(/pos=\(([^)]+)\)/);
  if (!match) return null;

  const [x, y, z] = match[1].split(',').map(s => parseFloat(s.trim()));
  return { x, y, z };
}

/**
 * Check if text is rendering (via framebuffer pixels)
 * @param {import('@playwright/test').Page} page
 * @param {Array<{type: string, text: string}>} [logs]
 */
export async function isTextRendering(page, logs = []) {
  const printLogs = logs.filter(log => log.text.includes('print() called:'));
  const screenshot = await screenshotCanvas(page, 'text-probe');
  const { width, height, data } = PNG.sync.read(screenshot);

  const countRegion = (region, predicate, step = 2) => {
    const x0 = Math.max(0, Math.floor(region.x * width));
    const y0 = Math.max(0, Math.floor(region.y * height));
    const x1 = Math.min(width, Math.ceil((region.x + region.w) * width));
    const y1 = Math.min(height, Math.ceil((region.y + region.h) * height));
    let matches = 0;
    let total = 0;

    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const i = (y * width + x) * 4;
        total++;
        if (predicate(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          matches++;
        }
      }
    }

    return {
      matches,
      total,
      ratio: total === 0 ? 0 : matches / total,
    };
  };

  const isNonDark = (r, g, b, a) => a > 0 && r + g + b > 45;
  const isWarmBright = (r, g, b, a) => a > 48 && r > 140 && g > 40 && b < 180;

  const fullFrame = countRegion({ x: 0, y: 0, w: 1, h: 1 }, isNonDark, 4);
  const title = countRegion({ x: 0.18, y: 0.08, w: 0.64, h: 0.26 }, isWarmBright, 2);
  const prompt = countRegion({ x: 0.18, y: 0.86, w: 0.64, h: 0.08 }, isWarmBright, 2);
  const canvasStats = {
    hasCanvas: true,
    width,
    height,
    nonDarkPixels: fullFrame.matches,
    titleWarmPixels: title.matches,
    promptWarmPixels: prompt.matches,
    titleRatio: title.ratio,
    promptRatio: prompt.ratio,
  };

  return {
    printCallsMade: printLogs.length > 0,
    hasFramebufferContent: canvasStats.hasCanvas && canvasStats.nonDarkPixels > 1000,
    hasTitleTextPixels:
      canvasStats.hasCanvas &&
      (canvasStats.titleWarmPixels > 100 || canvasStats.titleRatio > 0.003),
    hasPromptTextPixels:
      canvasStats.hasCanvas &&
      (canvasStats.promptWarmPixels > 20 || canvasStats.promptRatio > 0.001),
    printCalls: printLogs.length,
    samplePrint: printLogs[0]?.text || null,
    canvasStats,
  };
}
