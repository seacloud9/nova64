// tests/playwright/api-compatibility.spec.js
// API compatibility tests between Three.js and Babylon.js backends

import { test, expect } from '@playwright/test';

/**
 * These tests verify that all Nova64 API functions work correctly in both backends
 */

test.describe('Core 3D API Compatibility', () => {
  test('createCube should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.removeAllListeners('console');
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      // Execute createCube API call
      const result = await page.evaluate(() => {
        try {
          const cube = createCube(2, 0xff0000, [0, 0, -5]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const errors = logs.filter(l => l.type === 'error');
      console.log(`${backend} createCube:`, result, 'Errors:', errors.length);

      expect(result.success, `createCube should work in ${backend}`).toBe(true);
      expect(errors.length, `No errors in ${backend}`).toBe(0);
    }
  });

  test('createSphere should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.removeAllListeners('console');
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const sphere = createSphere(1, 0x00ff00, [0, 0, -5]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const errors = logs.filter(l => l.type === 'error');
      expect(result.success, `createSphere should work in ${backend}`).toBe(true);
      expect(errors.length, `No errors in ${backend}`).toBe(0);
    }
  });

  test('createPlane should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const plane = createPlane(10, 10, 0x0000ff, [0, -1, 0]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `createPlane should work in ${backend}`).toBe(true);
    }
  });

  test('createCylinder should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const cylinder = createCylinder(1, 1, 2, 0xffff00, [0, 0, -5]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `createCylinder should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('Camera API Compatibility', () => {
  test('setCameraPosition should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          setCameraPosition(0, 5, 10);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setCameraPosition should work in ${backend}`).toBe(true);
    }
  });

  test('setCameraTarget should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          setCameraTarget(0, 0, 0);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setCameraTarget should work in ${backend}`).toBe(true);
    }
  });

  test('setCameraFOV should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          setCameraFOV(75);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setCameraFOV should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('Transform API Compatibility', () => {
  test('rotateMesh should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const cube = createCube(2, 0xff0000, [0, 0, -5]);
          rotateMesh(cube, 0, Math.PI / 4, 0);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `rotateMesh should work in ${backend}`).toBe(true);
    }
  });

  test('setPosition should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const cube = createCube(2, 0xff0000, [0, 0, -5]);
          setPosition(cube, [1, 2, 3]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setPosition should work in ${backend}`).toBe(true);
    }
  });

  test('setScale should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const cube = createCube(2, 0xff0000, [0, 0, -5]);
          setScale(cube, [2, 2, 2]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setScale should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('Lighting API Compatibility', () => {
  test('setAmbientLight should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          setAmbientLight(0xffffff, 0.5);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setAmbientLight should work in ${backend}`).toBe(true);
    }
  });

  test('createPointLight should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const light = createPointLight(0xffffff, 1.0, [0, 5, 0]);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `createPointLight should work in ${backend}`).toBe(true);
    }
  });

  test('setFog should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          setFog(0x000000, 10, 50);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `setFog should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('Skybox API Compatibility', () => {
  test('createSpaceSkybox should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          createSpaceSkybox();
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `createSpaceSkybox should work in ${backend}`).toBe(true);
    }
  });

  test('createGradientSkybox should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          createGradientSkybox(0x87ceeb, 0x000033);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `createGradientSkybox should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('2D Drawing API Compatibility', () => {
  test('print should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const logs = [];
      page.removeAllListeners('console');
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          print('Test', 10, 10, 0xffffff);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `print should work in ${backend}`).toBe(true);

      // Check for print() debug logs
      const printLogs = logs.filter(l => l.text.includes('print() called'));
      console.log(`${backend} print logs:`, printLogs.length);
    }
  });

  test('cls should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          cls(0x000000);
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `cls should work in ${backend}`).toBe(true);
    }
  });
});

test.describe('Advanced Material API Compatibility', () => {
  test('holographic material should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const cube = createCube(2, 0xff00ff, [0, 0, -5], { material: 'holographic' });
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `holographic material should work in ${backend}`).toBe(true);
    }
  });

  test('metallic material should work in both backends', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        try {
          const sphere = createSphere(1, 0xffaa00, [0, 0, -5], { material: 'metallic' });
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success, `metallic material should work in ${backend}`).toBe(true);
    }
  });
});
