// tests/playwright/performance-comparison.spec.js
// Performance comparison tests between Three.js and Babylon.js backends

import { test, expect } from '@playwright/test';
import { loadCart } from './helpers.js';

/**
 * These tests measure and compare performance metrics between backends
 */

// Helper to measure FPS over a period
async function measureFPS(page, duration = 3000) {
  return await page.evaluate((dur) => {
    return new Promise((resolve) => {
      const frames = [];
      const startTime = performance.now();
      let lastTime = startTime;

      function measureFrame(now) {
        const delta = now - lastTime;
        if (delta > 0) {
          frames.push(1000 / delta);
        }
        lastTime = now;

        if (now - startTime < dur) {
          requestAnimationFrame(measureFrame);
          return;
        }

        // Calculate statistics
        const avgFPS = frames.reduce((a, b) => a + b, 0) / frames.length;
        const minFPS = Math.min(...frames);
        const maxFPS = Math.max(...frames);
        const sortedFrames = [...frames].sort((a, b) => a - b);
        const medianFPS = sortedFrames[Math.floor(sortedFrames.length / 2)];

        resolve({ avgFPS, minFPS, maxFPS, medianFPS, sampleCount: frames.length });
      }

      requestAnimationFrame(measureFrame);
    });
  }, duration);
}

// Helper to measure memory usage
async function measureMemory(page) {
  return await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  });
}

// Helper to get render stats from debug panel
async function getRenderStats(page) {
  return await page.evaluate(() => {
    // Try to get stats from global renderer
    if (typeof globalThis._renderer !== 'undefined') {
      const info = globalThis._renderer.info;
      if (info) {
        return {
          triangles: info.render?.triangles || 0,
          calls: info.render?.calls || 0,
          geometries: info.memory?.geometries || 0,
          textures: info.memory?.textures || 0,
        };
      }
    }
    return null;
  });
}

test.describe('FPS Performance Comparison', () => {
  const testCarts = [
    'hello-3d',
    'space-harrier-3d',
    'crystal-cathedral-3d',
    'particles-demo',
  ];

  for (const cartName of testCarts) {
    test(`${cartName} - FPS comparison`, async ({ page }) => {
      const results = {};

      for (const backend of ['threejs', 'babylon']) {
        await loadCart(page, cartName, backend);
        await page.waitForTimeout(2000); // Warmup

        // Measure FPS for 3 seconds
        const fps = await measureFPS(page, 3000);
        results[backend] = fps;

        console.log(`${cartName} (${backend}):`, fps);
      }

      // Log comparison
      console.log(`\n=== ${cartName} FPS Comparison ===`);
      console.log(`Three.js: ${results.threejs.avgFPS.toFixed(2)} avg, ${results.threejs.minFPS.toFixed(2)} min`);
      console.log(`Babylon:  ${results.babylon.avgFPS.toFixed(2)} avg, ${results.babylon.minFPS.toFixed(2)} min`);

      // Both backends should maintain at least 30 FPS average
      expect(results.threejs.avgFPS, 'Three.js should maintain 30+ FPS').toBeGreaterThanOrEqual(30);
      expect(results.babylon.avgFPS, 'Babylon.js should maintain 30+ FPS').toBeGreaterThanOrEqual(30);

      // Performance should be within 30% of each other
      const avgDiff = Math.abs(results.threejs.avgFPS - results.babylon.avgFPS);
      const avgMean = (results.threejs.avgFPS + results.babylon.avgFPS) / 2;
      const percentDiff = (avgDiff / avgMean) * 100;

      console.log(`Performance difference: ${percentDiff.toFixed(2)}%`);
      expect(percentDiff, 'FPS should be within 30% between backends').toBeLessThan(30);
    });
  }
});

test.describe('Memory Usage Comparison', () => {
  test('Memory usage comparison - Space Harrier', async ({ page }) => {
    const results = {};

    for (const backend of ['threejs', 'babylon']) {
      await loadCart(page, 'space-harrier-3d', backend);
      await page.waitForTimeout(3000);

      const memory = await measureMemory(page);
      results[backend] = memory;

      if (memory) {
        const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`${backend} memory usage: ${usedMB} MB`);
      }
    }

    if (results.threejs && results.babylon) {
      const threejsMB = results.threejs.usedJSHeapSize / 1024 / 1024;
      const babylonMB = results.babylon.usedJSHeapSize / 1024 / 1024;
      const diff = Math.abs(threejsMB - babylonMB);
      const percentDiff = (diff / threejsMB) * 100;

      console.log(`Memory difference: ${diff.toFixed(2)} MB (${percentDiff.toFixed(2)}%)`);

      // Memory usage should be reasonable (< 200MB)
      expect(threejsMB, 'Three.js memory should be reasonable').toBeLessThan(200);
      expect(babylonMB, 'Babylon.js memory should be reasonable').toBeLessThan(200);
    }
  });
});

test.describe('Render Stats Comparison', () => {
  test('Triangle count comparison - Crystal Cathedral', async ({ page }) => {
    const results = {};

    for (const backend of ['threejs', 'babylon']) {
      await loadCart(page, 'crystal-cathedral-3d', backend);
      await page.waitForTimeout(2000);

      const stats = await getRenderStats(page);
      results[backend] = stats;

      if (stats) {
        console.log(`${backend} render stats:`, stats);
      }
    }

    // Log comparison
    if (results.threejs && results.babylon) {
      console.log('\n=== Render Stats Comparison ===');
      console.log('Three.js:', results.threejs);
      console.log('Babylon:', results.babylon);

      // Triangle counts should be similar (within 20%)
      if (results.threejs.triangles > 0 && results.babylon.triangles > 0) {
        const diff = Math.abs(results.threejs.triangles - results.babylon.triangles);
        const mean = (results.threejs.triangles + results.babylon.triangles) / 2;
        const percentDiff = (diff / mean) * 100;

        console.log(`Triangle count difference: ${percentDiff.toFixed(2)}%`);
        expect(percentDiff, 'Triangle counts should be similar').toBeLessThan(20);
      }
    }
  });
});

test.describe('Load Time Comparison', () => {
  const testCarts = ['hello-3d', 'space-harrier-3d', 'crystal-cathedral-3d'];

  for (const cartName of testCarts) {
    test(`${cartName} - Load time comparison`, async ({ page }) => {
      const results = {};

      for (const backend of ['threejs', 'babylon']) {
        const startTime = Date.now();

        await loadCart(page, cartName, backend);

        // Wait for cart to be fully loaded
        await page.waitForFunction(() => {
          return document.readyState === 'complete';
        });

        const loadTime = Date.now() - startTime;
        results[backend] = loadTime;

        console.log(`${cartName} (${backend}) load time: ${loadTime}ms`);
      }

      // Log comparison
      console.log(`\n=== ${cartName} Load Time Comparison ===`);
      console.log(`Three.js: ${results.threejs}ms`);
      console.log(`Babylon:  ${results.babylon}ms`);

      const diff = Math.abs(results.threejs - results.babylon);
      const percentDiff = (diff / results.threejs) * 100;

      console.log(`Load time difference: ${diff}ms (${percentDiff.toFixed(2)}%)`);

      // Both should load within reasonable time (< 10 seconds)
      expect(results.threejs, 'Three.js should load quickly').toBeLessThan(10000);
      expect(results.babylon, 'Babylon.js should load quickly').toBeLessThan(10000);
    });
  }
});

test.describe('Stress Test - Many Objects', () => {
  test('Should handle 100 cubes without performance degradation', async ({ page }) => {
    const results = {};

    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      // Create 100 cubes
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          const x = (Math.random() - 0.5) * 20;
          const y = (Math.random() - 0.5) * 20;
          const z = -5 + (Math.random() - 0.5) * 10;
          const color = Math.random() * 0xffffff;
          createCube(0.5, color, [x, y, z]);
        }
      });

      await page.waitForTimeout(1000);

      // Measure FPS with many objects
      const fps = await measureFPS(page, 2000);
      const stats = await getRenderStats(page);

      results[backend] = { fps, stats };

      console.log(`${backend} stress test:`, fps, stats);
    }

    // Both backends should maintain at least 20 FPS with 100 cubes
    expect(results.threejs.fps.avgFPS, 'Three.js should handle 100 cubes').toBeGreaterThanOrEqual(20);
    expect(results.babylon.fps.avgFPS, 'Babylon.js should handle 100 cubes').toBeGreaterThanOrEqual(20);

    console.log('\n=== Stress Test Results ===');
    console.log(`Three.js: ${results.threejs.fps.avgFPS.toFixed(2)} FPS`);
    console.log(`Babylon:  ${results.babylon.fps.avgFPS.toFixed(2)} FPS`);
  });
});

test.describe('Frame Time Consistency', () => {
  test('Frame times should be consistent - hello-3d', async ({ page }) => {
    const results = {};

    for (const backend of ['threejs', 'babylon']) {
      await loadCart(page, 'hello-3d', backend);
      await page.waitForTimeout(2000);

      // Measure frame time variance
      const frameTimeStats = await page.evaluate(() => {
        return new Promise((resolve) => {
          const frameTimes = [];
          let lastTime = performance.now();
          let count = 0;
          const maxCount = 60; // 60 frames

          function measureFrame() {
            const now = performance.now();
            const delta = now - lastTime;
            frameTimes.push(delta);
            lastTime = now;
            count++;

            if (count < maxCount) {
              requestAnimationFrame(measureFrame);
            } else {
              // Calculate variance
              const mean = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
              const variance = frameTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / frameTimes.length;
              const stdDev = Math.sqrt(variance);

              resolve({ mean, variance, stdDev, frames: frameTimes.length });
            }
          }

          requestAnimationFrame(measureFrame);
        });
      });

      results[backend] = frameTimeStats;
      console.log(`${backend} frame time stats:`, frameTimeStats);
    }

    // Log comparison
    console.log('\n=== Frame Time Consistency ===');
    console.log(`Three.js: ${results.threejs.mean.toFixed(2)}ms avg, ${results.threejs.stdDev.toFixed(2)}ms stddev`);
    console.log(`Babylon:  ${results.babylon.mean.toFixed(2)}ms avg, ${results.babylon.stdDev.toFixed(2)}ms stddev`);

    // Standard deviation should be low (frame times consistent)
    expect(results.threejs.stdDev, 'Three.js frame times should be consistent').toBeLessThan(10);
    expect(results.babylon.stdDev, 'Babylon.js frame times should be consistent').toBeLessThan(10);
  });
});
