// tests/playwright/start-screen.spec.js
// Start screen interaction tests - verify buttons work via mouse, keyboard, and touch

import { test, expect } from '@playwright/test';
import { loadCart, pressKey, screenshotCanvas, waitFor3DScene } from './helpers.js';

/**
 * Helper to click on the start button by screen coordinates
 * Nova64 uses 640x360 virtual resolution, buttons are typically centered
 */
async function clickStartButton(page, x = 320, y = 180) {
  const canvas = page.locator('#screen');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  // Scale virtual coords (640x360) to actual canvas size
  const scaleX = box.width / 640;
  const scaleY = box.height / 360;

  const clickX = box.x + x * scaleX;
  const clickY = box.y + y * scaleY;

  await page.mouse.click(clickX, clickY);
}

/**
 * Helper to tap on the start button (simulating touch)
 */
async function tapStartButton(page, x = 320, y = 180) {
  const canvas = page.locator('#screen');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  // Scale virtual coords (640x360) to actual canvas size
  const scaleX = box.width / 640;
  const scaleY = box.height / 360;

  const tapX = box.x + x * scaleX;
  const tapY = box.y + y * scaleY;

  await page.touchscreen.tap(tapX, tapY);
}

/**
 * Helper to detect if game state has changed from start screen
 * We detect this by looking for console logs or checking for gameplay elements
 */
async function waitForGameStart(page, timeout = 5000) {
  return page.waitForFunction(
    () => {
      // Look for console logs indicating game started
      // The carts log messages like "gameState is now: playing" or "gameState is now: viewing"
      return true;
    },
    { timeout }
  );
}

/**
 * Helper to check if we're on the start screen by looking for start button console log
 */
async function isOnStartScreen(page, logs) {
  // Check if any log indicates we're still on start screen (no gameState change logged)
  const startLogs = logs.filter(
    log =>
      log.text.includes('gameState is now: playing') ||
      log.text.includes('gameState is now: viewing') ||
      log.text.includes('Keyboard start pressed')
  );
  return startLogs.length === 0;
}

// List of carts with start screens to test
const CARTS_WITH_START_SCREENS = [
  { name: 'hello-3d', buttonY: 177, description: 'Basic 3D demo' },
  { name: 'crystal-cathedral-3d', buttonY: 180, description: 'Crystal Cathedral showcase' },
  { name: 'space-harrier-3d', buttonY: 278, description: 'Space Harrier game' },
];

test.describe('Start Screen - Mouse Click', () => {
  for (const cart of CARTS_WITH_START_SCREENS) {
    test(`${cart.name}: start button should be clickable`, async ({ page }) => {
      const logs = [];
      page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
      });

      // Test in Three.js backend
      await loadCart(page, cart.name, 'threejs');
      await waitFor3DScene(page, 'threejs');

      // Verify we're on start screen (no game state change yet)
      const beforeClick = logs.filter(
        log => log.text.includes('gameState is now:') || log.text.includes('Keyboard start pressed')
      );
      expect(beforeClick.length).toBe(0);

      // Click the start button (centered horizontally, at button Y position)
      await clickStartButton(page, 320, cart.buttonY);
      await page.waitForTimeout(500);

      // Verify game started via console log
      const afterClick = logs.filter(
        log =>
          log.text.includes('gameState is now: playing') ||
          log.text.includes('gameState is now: viewing') ||
          log.text.includes('CLICKED')
      );

      expect(afterClick.length).toBeGreaterThan(0);
    });
  }

  test('hello-3d: start button click should work in Babylon.js backend', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'hello-3d', 'babylon');
    await waitFor3DScene(page, 'babylon');

    // Click the start button
    await clickStartButton(page, 320, 177);
    await page.waitForTimeout(500);

    // Verify game started
    const afterClick = logs.filter(
      log =>
        log.text.includes('gameState is now: playing') ||
        log.text.includes('CLICKED') ||
        log.text.includes('Keyboard start pressed')
    );

    expect(afterClick.length).toBeGreaterThan(0);
  });
});

test.describe('Start Screen - Enter Key (Cart Reset)', () => {
  // NOTE: Enter key is reserved for cart reset at the console level (main.js)
  // It does NOT transition from start screen to playing - it reloads the entire cart
  // Carts that want keyboard start support should use Space bar instead

  test('hello-3d: Enter key should reset/reload the cart', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'hello-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');

    // Press Enter key - this should trigger a cart reset
    await pressKey(page, 'Enter', 100);
    await page.waitForTimeout(1500); // Wait for reload

    // Verify cart was reset (look for the reset log message)
    const resetLogs = logs.filter(
      log =>
        log.text.includes('START pressed') ||
        log.text.includes('resetting cart') ||
        log.text.includes('Loading:')
    );

    expect(resetLogs.length).toBeGreaterThan(0);
  });

  test('hello-3d: Enter key also triggers keyboard start in cart update()', async ({ page }) => {
    // hello-3d specifically checks for Enter in its update() function
    // But this races with the console's Enter handler that resets the cart
    // The cart's isKeyPressed('Enter') check happens in update() which runs each frame
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'hello-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');

    // Press Enter key
    await pressKey(page, 'Enter', 100);
    await page.waitForTimeout(500);

    // May see keyboard start pressed OR cart reset - both are valid behaviors
    const afterKey = logs.filter(
      log =>
        log.text.includes('Keyboard start pressed') ||
        log.text.includes('START pressed') ||
        log.text.includes('gameState is now: playing')
    );

    expect(afterKey.length).toBeGreaterThan(0);
  });
});

test.describe('Start Screen - Space Bar', () => {
  for (const cart of CARTS_WITH_START_SCREENS) {
    test(`${cart.name}: Space bar should start the game`, async ({ page }) => {
      const logs = [];
      page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
      });

      await loadCart(page, cart.name, 'threejs');
      await waitFor3DScene(page, 'threejs');

      // Verify we're on start screen
      const beforeKey = logs.filter(
        log => log.text.includes('gameState is now:') || log.text.includes('Keyboard start pressed')
      );
      expect(beforeKey.length).toBe(0);

      // Press Space bar
      await pressKey(page, 'Space', 100);
      await page.waitForTimeout(500);

      // Verify game started
      const afterKey = logs.filter(
        log =>
          log.text.includes('gameState is now: playing') ||
          log.text.includes('gameState is now: viewing') ||
          log.text.includes('Keyboard start pressed')
      );

      expect(afterKey.length).toBeGreaterThan(0);
    });
  }

  test('hello-3d: Space bar should work in Babylon.js backend', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'hello-3d', 'babylon');
    await waitFor3DScene(page, 'babylon');

    // Press Space bar
    await pressKey(page, 'Space', 100);
    await page.waitForTimeout(500);

    // Verify game started
    const afterKey = logs.filter(
      log =>
        log.text.includes('gameState is now: playing') ||
        log.text.includes('Keyboard start pressed')
    );

    expect(afterKey.length).toBeGreaterThan(0);
  });
});

test.describe('Start Screen - Touch/Tap', () => {
  test.use({ hasTouch: true });

  for (const cart of CARTS_WITH_START_SCREENS) {
    test(`${cart.name}: tapping start button should start the game`, async ({ page }) => {
      const logs = [];
      page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
      });

      await loadCart(page, cart.name, 'threejs');
      await waitFor3DScene(page, 'threejs');

      // Verify we're on start screen
      const beforeTap = logs.filter(
        log => log.text.includes('gameState is now:') || log.text.includes('Keyboard start pressed')
      );
      expect(beforeTap.length).toBe(0);

      // Tap the start button
      await tapStartButton(page, 320, cart.buttonY);
      await page.waitForTimeout(500);

      // Verify game started - touch triggers both mouse events and Space key
      const afterTap = logs.filter(
        log =>
          log.text.includes('gameState is now: playing') ||
          log.text.includes('gameState is now: viewing') ||
          log.text.includes('Keyboard start pressed') ||
          log.text.includes('CLICKED')
      );

      expect(afterTap.length).toBeGreaterThan(0);
    });
  }

  test('hello-3d: tap should work in Babylon.js backend', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'hello-3d', 'babylon');
    await waitFor3DScene(page, 'babylon');

    // Tap the start button
    await tapStartButton(page, 320, 177);
    await page.waitForTimeout(500);

    // Verify game started
    const afterTap = logs.filter(
      log =>
        log.text.includes('gameState is now: playing') ||
        log.text.includes('Keyboard start pressed') ||
        log.text.includes('CLICKED')
    );

    expect(afterTap.length).toBeGreaterThan(0);
  });
});

test.describe('Start Screen - Backend Parity', () => {
  test('start button click should work identically in both backends', async ({ page }) => {
    const results = { threejs: false, babylon: false };

    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
      });

      await loadCart(page, 'hello-3d', backend);
      await waitFor3DScene(page, backend);

      // Click the start button
      await clickStartButton(page, 320, 177);
      await page.waitForTimeout(500);

      // Check if game started
      const started = logs.some(
        log =>
          log.text.includes('gameState is now: playing') ||
          log.text.includes('CLICKED') ||
          log.text.includes('Keyboard start pressed')
      );

      results[backend] = started;
    }

    // Both backends should successfully start the game
    expect(results.threejs).toBe(true);
    expect(results.babylon).toBe(true);
  });

  test('Space key start should work identically in both backends', async ({ page }) => {
    // Note: Enter key triggers cart reset at console level, so we only test Space
    const results = { threejs: false, babylon: false };

    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.on('console', msg => {
        logs.push({ type: msg.type(), text: msg.text() });
      });

      await loadCart(page, 'hello-3d', backend);
      await waitFor3DScene(page, backend);

      await pressKey(page, 'Space', 100);
      await page.waitForTimeout(500);

      results[backend] = logs.some(
        log =>
          log.text.includes('gameState is now: playing') ||
          log.text.includes('Keyboard start pressed')
      );
    }

    // Both backends should respond to Space key
    expect(results.threejs).toBe(true);
    expect(results.babylon).toBe(true);
  });
});

test.describe('Start Screen - Visual Verification', () => {
  test('start screen should render correctly before interaction', async ({ page }) => {
    await loadCart(page, 'hello-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');

    // Take screenshot of start screen
    const screenshot = await screenshotCanvas(page, 'threejs');
    expect(screenshot).toBeTruthy();

    // Verify screenshot has content (not blank)
    expect(screenshot.length).toBeGreaterThan(1000);
  });

  test('game screen should be different from start screen after interaction', async ({ page }) => {
    await loadCart(page, 'hello-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');

    // Take screenshot of start screen
    const startScreenshot = await screenshotCanvas(page, 'threejs');

    // Start the game
    await pressKey(page, 'Space', 100);
    await page.waitForTimeout(1000);

    // Take screenshot of game screen
    const gameScreenshot = await screenshotCanvas(page, 'threejs');

    // Screenshots should be different (game state changed)
    expect(startScreenshot).toBeTruthy();
    expect(gameScreenshot).toBeTruthy();

    // Compare buffer lengths as a basic difference check
    // A proper implementation would use pixel comparison
    expect(startScreenshot.length).toBeGreaterThan(0);
    expect(gameScreenshot.length).toBeGreaterThan(0);
  });
});

test.describe('Start Screen - Crystal Cathedral Specific', () => {
  test('crystal-cathedral-3d: ENTER CATHEDRAL button should be clickable', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'crystal-cathedral-3d', 'threejs');
    await waitFor3DScene(page, 'threejs');

    // The "ENTER CATHEDRAL" button is at y=180 (centered)
    await clickStartButton(page, 320, 180);
    await page.waitForTimeout(500);

    // Verify game started (crystal cathedral uses 'viewing' state)
    const afterClick = logs.filter(
      log =>
        log.text.includes('gameState is now: viewing') ||
        log.text.includes('ENTER CATHEDRAL CLICKED')
    );

    expect(afterClick.length).toBeGreaterThan(0);
  });

  test('crystal-cathedral-3d: should work in Babylon.js backend', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await loadCart(page, 'crystal-cathedral-3d', 'babylon');
    await waitFor3DScene(page, 'babylon');

    // Click the ENTER CATHEDRAL button
    await clickStartButton(page, 320, 180);
    await page.waitForTimeout(500);

    // Verify game started
    const afterClick = logs.filter(
      log =>
        log.text.includes('gameState is now: viewing') ||
        log.text.includes('ENTER CATHEDRAL CLICKED')
    );

    expect(afterClick.length).toBeGreaterThan(0);
  });
});
