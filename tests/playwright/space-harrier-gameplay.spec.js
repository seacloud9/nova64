// tests/playwright/space-harrier-gameplay.spec.js
// Detailed Space Harrier gameplay parity testing

import { test, expect } from '@playwright/test';
import { loadCart, pressKey, getPlayerPosition } from './helpers.js';

test.describe('Space Harrier - Detailed Gameplay Parity', () => {
  test('should have identical player movement physics', async ({ page }) => {
    const logs = {
      threejs: [],
      babylon: [],
    };

    // Capture console logs
    page.on('console', msg => {
      logs.current?.push({ type: msg.type(), text: msg.text() });
    });

    // Test Three.js movement
    logs.current = logs.threejs;
    await loadCart(page, 'space-harrier-3d', 'threejs');
    await page.waitForTimeout(2000);

    // Start game
    await pressKey(page, 'Space', 100);
    await page.waitForTimeout(500);

    // Record initial position
    const threejsStart = getPlayerPosition(logs.threejs);
    console.log('Three.js start:', threejsStart);

    // Move right for 1 second
    await pressKey(page, 'ArrowRight', 1000);
    await page.waitForTimeout(200);

    const threejsRight = getPlayerPosition(logs.threejs);
    console.log('Three.js after right:', threejsRight);

    // Move left for 1 second
    await pressKey(page, 'ArrowLeft', 1000);
    await page.waitForTimeout(200);

    const threejsLeft = getPlayerPosition(logs.threejs);
    console.log('Three.js after left:', threejsLeft);

    // Move up for 1 second
    await pressKey(page, 'ArrowUp', 1000);
    await page.waitForTimeout(200);

    const threejsUp = getPlayerPosition(logs.threejs);
    console.log('Three.js after up:', threejsUp);

    // Test Babylon.js movement
    logs.current = logs.babylon;
    await loadCart(page, 'space-harrier-3d', 'babylon');
    await page.waitForTimeout(2000);

    // Start game
    await pressKey(page, 'Space', 100);
    await page.waitForTimeout(500);

    // Record initial position
    const babylonStart = getPlayerPosition(logs.babylon);
    console.log('Babylon start:', babylonStart);

    // Move right for 1 second
    await pressKey(page, 'ArrowRight', 1000);
    await page.waitForTimeout(200);

    const babylonRight = getPlayerPosition(logs.babylon);
    console.log('Babylon after right:', babylonRight);

    // Move left for 1 second
    await pressKey(page, 'ArrowLeft', 1000);
    await page.waitForTimeout(200);

    const babylonLeft = getPlayerPosition(logs.babylon);
    console.log('Babylon after left:', babylonLeft);

    // Move up for 1 second
    await pressKey(page, 'ArrowUp', 1000);
    await page.waitForTimeout(200);

    const babylonUp = getPlayerPosition(logs.babylon);
    console.log('Babylon after up:', babylonUp);

    // Compare positions - allow 5% tolerance for timing differences
    if (threejsStart && babylonStart) {
      expect(Math.abs(threejsStart.x - babylonStart.x)).toBeLessThan(1);
      expect(Math.abs(threejsStart.y - babylonStart.y)).toBeLessThan(1);
    }

    if (threejsRight && babylonRight) {
      const threejsDeltaX = threejsRight.x - (threejsStart?.x || 0);
      const babylonDeltaX = babylonRight.x - (babylonStart?.x || 0);
      console.log(`Right movement delta - Three.js: ${threejsDeltaX}, Babylon: ${babylonDeltaX}`);
      // Both should move in same direction (positive X)
      expect(threejsDeltaX).toBeGreaterThan(0);
      expect(babylonDeltaX).toBeGreaterThan(0);
      // Movement should be similar (within 20%)
      expect(Math.abs(threejsDeltaX - babylonDeltaX) / threejsDeltaX).toBeLessThan(0.2);
    }

    if (threejsLeft && babylonLeft) {
      const threejsDeltaX = threejsLeft.x - (threejsRight?.x || 0);
      const babylonDeltaX = babylonLeft.x - (babylonRight?.x || 0);
      console.log(`Left movement delta - Three.js: ${threejsDeltaX}, Babylon: ${babylonDeltaX}`);
      // Both should move in same direction (negative X)
      expect(threejsDeltaX).toBeLessThan(0);
      expect(babylonDeltaX).toBeLessThan(0);
      // Movement should be similar (within 20%)
      expect(Math.abs(threejsDeltaX - babylonDeltaX) / Math.abs(threejsDeltaX)).toBeLessThan(0.2);
    }

    if (threejsUp && babylonUp) {
      const threejsDeltaY = threejsUp.y - (threejsLeft?.y || 0);
      const babylonDeltaY = babylonUp.y - (babylonLeft?.y || 0);
      console.log(`Up movement delta - Three.js: ${threejsDeltaY}, Babylon: ${babylonDeltaY}`);
      // Both should move in same direction (positive Y)
      expect(threejsDeltaY).toBeGreaterThan(0);
      expect(babylonDeltaY).toBeGreaterThan(0);
      // Movement should be similar (within 20%)
      expect(Math.abs(threejsDeltaY - babylonDeltaY) / threejsDeltaY).toBeLessThan(0.2);
    }
  });

  test('should maintain same speed across backends', async ({ page }) => {
    const measurements = { threejs: [], babylon: [] };

    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      await loadCart(page, 'space-harrier-3d', backend);
      await page.waitForTimeout(2000);

      // Start game
      await pressKey(page, 'Space', 100);
      await page.waitForTimeout(500);

      const startPos = getPlayerPosition(logs);

      // Move right for exactly 2 seconds
      await pressKey(page, 'ArrowRight', 2000);
      await page.waitForTimeout(100);

      const endPos = getPlayerPosition(logs);

      if (startPos && endPos) {
        const distance = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) +
          Math.pow(endPos.y - startPos.y, 2) +
          Math.pow(endPos.z - startPos.z, 2)
        );
        const speed = distance / 2.0; // units per second
        measurements[backend] = { startPos, endPos, distance, speed };
        console.log(`${backend} - Start: ${JSON.stringify(startPos)}, End: ${JSON.stringify(endPos)}, Speed: ${speed} units/s`);
      }
    }

    // Compare speeds - should be within 10%
    if (measurements.threejs.speed && measurements.babylon.speed) {
      const speedDiff = Math.abs(measurements.threejs.speed - measurements.babylon.speed);
      const avgSpeed = (measurements.threejs.speed + measurements.babylon.speed) / 2;
      const percentDiff = (speedDiff / avgSpeed) * 100;

      console.log(`Speed difference: ${percentDiff.toFixed(2)}%`);
      expect(percentDiff).toBeLessThan(10);
    }
  });
});
