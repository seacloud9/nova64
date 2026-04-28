// tests/playwright/visual-regression.spec.js
// Visual regression tests using pixelmatch to compare screenshots

import { test, expect } from '@playwright/test';
import { loadCart, pressKey, screenshotCanvas } from './helpers.js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

/**
 * These tests compare visual output between Three.js and Babylon.js backends
 * using pixelmatch for pixel-perfect comparison
 */

const SCREENSHOTS_DIR = 'test-results/screenshots';
const DIFF_DIR = 'test-results/diffs';

// Ensure directories exist
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(DIFF_DIR)) {
  fs.mkdirSync(DIFF_DIR, { recursive: true });
}

/**
 * Compare two PNG images and return the number of different pixels
 */
function compareImages(img1Path, img2Path, diffPath, threshold = 0.1) {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    numDiffPixels,
    totalPixels: width * height,
    percentDiff: (numDiffPixels / (width * height)) * 100,
  };
}

/**
 * Take screenshots of both backends and compare them
 */
async function compareBackends(page, cartName, options = {}) {
  const {
    waitTime = 2000,
    threshold = 0.1,
    maxDiffPercent = 5, // Allow 5% difference
  } = options;

  // Take Three.js screenshot
  await loadCart(page, cartName, 'threejs');
  await page.waitForTimeout(waitTime);

  const threejsPath = path.join(SCREENSHOTS_DIR, `${cartName}-threejs.png`);
  await screenshotCanvas(page, 'threejs', { path: threejsPath });

  // Take Babylon.js screenshot
  await loadCart(page, cartName, 'babylon');
  await page.waitForTimeout(waitTime);

  const babylonPath = path.join(SCREENSHOTS_DIR, `${cartName}-babylon.png`);
  await screenshotCanvas(page, 'babylon', { path: babylonPath });

  // Compare images
  const diffPath = path.join(DIFF_DIR, `${cartName}-diff.png`);
  const result = compareImages(threejsPath, babylonPath, diffPath, threshold);

  console.log(`${cartName} visual comparison:`, result);

  return result;
}

async function startWadDemo(page) {
  await expect
    .poll(async () => page.evaluate(() => globalThis.__nova64WadDemoState?.()?.gameState || ''), {
      timeout: 30000,
    })
    .toBe('menu');

  await pressKey(page, 'Enter', 100);

  await expect
    .poll(async () => page.evaluate(() => globalThis.__nova64WadDemoState?.()?.gameState || ''), {
      timeout: 10000,
    })
    .toBe('playing');

  await page.waitForTimeout(1000);
}

test.describe('Visual Regression - Basic 3D', () => {
  test('hello-3d should look similar', async ({ page }) => {
    const result = await compareBackends(page, 'hello-3d', {
      waitTime: 2000,
      threshold: 0.2,
      maxDiffPercent: 37,
    });

    expect(result.percentDiff, 'Visual output should be reasonably similar').toBeLessThan(37);
  });

  test('hello-skybox should look similar', async ({ page }) => {
    const result = await compareBackends(page, 'hello-skybox', {
      waitTime: 2000,
      threshold: 0.2,
      maxDiffPercent: 40, // Skyboxes might have rendering differences
    });

    expect(result.percentDiff, 'Skybox should be reasonably similar').toBeLessThan(40);
  });
});

test.describe('Visual Regression - 3D Showcases', () => {
  test('crystal-cathedral-3d should look similar', async ({ page }) => {
    const result = await compareBackends(page, 'crystal-cathedral-3d', {
      waitTime: 3000,
      threshold: 0.2,
      maxDiffPercent: 50, // Advanced materials will differ significantly
    });

    expect(result.percentDiff, 'Cathedral should be reasonably similar').toBeLessThan(50);
  });

  test('pbr-showcase should look similar', async ({ page }) => {
    const result = await compareBackends(page, 'pbr-showcase', {
      waitTime: 3000,
      threshold: 0.15,
      // Babylon is still missing full PMREM/post-processing parity, but it should
      // stay in the same visual ballpark instead of regressing to the old near-total mismatch.
      maxDiffPercent: 30,
    });

    expect(result.percentDiff, 'PBR materials should stay reasonably similar').toBeLessThan(30);
  });

  test('tsl-showcase galaxy scene should stay reasonably similar', async ({ page }) => {
    const result = await compareBackends(page, 'tsl-showcase', {
      waitTime: 1000,
      threshold: 0.2,
      maxDiffPercent: 45,
    });

    expect(result.percentDiff, 'Galaxy TSL scene should stay reasonably similar').toBeLessThan(45);
  });
});

test.describe('Visual Regression - WAD', () => {
  test('wad-demo gameplay frame should stay reasonably similar', async ({ page }) => {
    await loadCart(page, 'wad-demo', 'threejs');
    await startWadDemo(page);
    const threejsPath = path.join(SCREENSHOTS_DIR, 'wad-demo-threejs.png');
    await screenshotCanvas(page, 'threejs', { path: threejsPath });

    await loadCart(page, 'wad-demo', 'babylon');
    await startWadDemo(page);
    const babylonPath = path.join(SCREENSHOTS_DIR, 'wad-demo-babylon.png');
    await screenshotCanvas(page, 'babylon', { path: babylonPath });

    const diffPath = path.join(DIFF_DIR, 'wad-demo-diff.png');
    const result = compareImages(threejsPath, babylonPath, diffPath, 0.2);

    console.log('wad-demo visual comparison:', result);
    expect(result.percentDiff, 'WAD gameplay frame should stay reasonably similar').toBeLessThan(35);
  });
});

test.describe('Visual Regression - Voxel', () => {
  test('minecraft-demo should stay reasonably similar', async ({ page }) => {
    test.setTimeout(120000);
    const result = await compareBackends(page, 'minecraft-demo', {
      waitTime: 7000,
      threshold: 0.18,
      maxDiffPercent: 15,
    });

    expect(result.percentDiff, 'Minecraft demo should stay reasonably similar').toBeLessThan(15);
  });
});

test.describe('Visual Regression - Start Screens', () => {
  test('space-harrier-3d start screen should match', async ({ page }) => {
    const result = await compareBackends(page, 'space-harrier-3d', {
      waitTime: 2000, // Before starting game
      threshold: 0.1,
      maxDiffPercent: 5,
    });

    expect(result.percentDiff, 'Start screen text should match').toBeLessThan(5);
  });

  test('startscreen-demo should match', async ({ page }) => {
    const result = await compareBackends(page, 'startscreen-demo', {
      waitTime: 2000,
      threshold: 0.1,
      maxDiffPercent: 5,
    });

    expect(result.percentDiff, 'Start screen demo should match').toBeLessThan(5);
  });
});

test.describe('Visual Regression - UI Demos', () => {
  test('hud-demo should match', async ({ page }) => {
    const result = await compareBackends(page, 'hud-demo', {
      waitTime: 2000,
      threshold: 0.1,
      maxDiffPercent: 5,
    });

    expect(result.percentDiff, 'HUD elements should match').toBeLessThan(5);
  });

  test('ui-demo should match', async ({ page }) => {
    const result = await compareBackends(page, 'ui-demo', {
      waitTime: 2000,
      threshold: 0.1,
      maxDiffPercent: 5,
    });

    expect(result.percentDiff, 'UI elements should match').toBeLessThan(5);
  });
});

test.describe('Visual Regression - Particle Systems', () => {
  test('particles-demo initial frame should match', async ({ page }) => {
    const result = await compareBackends(page, 'particles-demo', {
      waitTime: 1000, // Capture early to avoid randomness
      threshold: 0.2,
      maxDiffPercent: 20, // Particles can vary due to timing
    });

    expect(result.percentDiff, 'Particles should be roughly similar').toBeLessThan(20);
  });
});

test.describe('Visual Regression - 2D Canvas', () => {
  test('test-2d-overlay should match exactly', async ({ page }) => {
    const result = await compareBackends(page, 'test-2d-overlay', {
      waitTime: 1000,
      threshold: 0.05, // Strict threshold for 2D
      maxDiffPercent: 2,
    });

    expect(result.percentDiff, '2D overlay should match exactly').toBeLessThan(2);
  });

  test('canvas-ui-showcase should match', async ({ page }) => {
    const result = await compareBackends(page, 'canvas-ui-showcase', {
      waitTime: 2000,
      threshold: 0.1,
      maxDiffPercent: 5,
    });

    expect(result.percentDiff, 'Canvas UI should match').toBeLessThan(5);
  });
});

test.describe('Visual Regression - Lighting', () => {
  test('lighting should be similar across backends', async ({ page }) => {
    // Create a custom test cart with specific lighting
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      // Create scene with specific lighting
      await page.evaluate(() => {
        const cube = createCube(2, 0xff0000, [0, 0, -5]);
        setAmbientLight(0xffffff, 0.5);
        createPointLight(0xffffff, 1.0, [5, 5, 5]);
        setCameraPosition(0, 0, 10);
      });

      await page.waitForTimeout(1000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `lighting-${backend}.png`);
      await screenshotCanvas(page, backend, { path: screenshotPath });
    }

    // Compare lighting screenshots
    const diffPath = path.join(DIFF_DIR, 'lighting-diff.png');
    const result = compareImages(
      path.join(SCREENSHOTS_DIR, 'lighting-threejs.png'),
      path.join(SCREENSHOTS_DIR, 'lighting-babylon.png'),
      diffPath,
      0.15
    );

    console.log('Lighting comparison:', result);
    expect(result.percentDiff, 'Lighting should be similar').toBeLessThan(15);
  });
});

test.describe('Visual Regression - Materials', () => {
  test('holographic material should look similar', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      await page.evaluate(() => {
        const cube = createCube(2, 0xff00ff, [0, 0, -5], { material: 'holographic' });
        setCameraPosition(0, 0, 10);
        setAmbientLight(0xffffff, 1.0);
      });

      await page.waitForTimeout(1000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `holographic-${backend}.png`);
      await screenshotCanvas(page, backend, { path: screenshotPath });
    }

    const diffPath = path.join(DIFF_DIR, 'holographic-diff.png');
    const result = compareImages(
      path.join(SCREENSHOTS_DIR, 'holographic-threejs.png'),
      path.join(SCREENSHOTS_DIR, 'holographic-babylon.png'),
      diffPath,
      0.2
    );

    console.log('Holographic material comparison:', result);
    expect(result.percentDiff, 'Holographic material should be similar').toBeLessThan(20);
  });

  test('metallic material should look similar', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      await page.evaluate(() => {
        const sphere = createSphere(1.5, 0xffaa00, [0, 0, -5], { material: 'metallic' });
        setCameraPosition(0, 0, 10);
        setAmbientLight(0xffffff, 1.0);
        createPointLight(0xffffff, 1.5, [3, 3, 3]);
      });

      await page.waitForTimeout(1000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `metallic-${backend}.png`);
      await screenshotCanvas(page, backend, { path: screenshotPath });
    }

    const diffPath = path.join(DIFF_DIR, 'metallic-diff.png');
    const result = compareImages(
      path.join(SCREENSHOTS_DIR, 'metallic-threejs.png'),
      path.join(SCREENSHOTS_DIR, 'metallic-babylon.png'),
      diffPath,
      0.2
    );

    console.log('Metallic material comparison:', result);
    expect(result.percentDiff, 'Metallic material should be similar').toBeLessThan(20);
  });
});

test.describe('Visual Regression - Fog', () => {
  test('fog should render similarly', async ({ page }) => {
    for (const backend of ['threejs', 'babylon']) {
      const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
      await page.goto(url);
      await page.waitForTimeout(1000);

      await page.evaluate(() => {
        // Create multiple cubes at different depths to show fog
        for (let i = 0; i < 5; i++) {
          const z = -5 - (i * 3);
          createCube(2, 0x00ffff, [0, 0, z]);
        }
        setFog(0x000000, 5, 25);
        setCameraPosition(0, 0, 10);
      });

      await page.waitForTimeout(1000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, `fog-${backend}.png`);
      await screenshotCanvas(page, backend, { path: screenshotPath });
    }

    const diffPath = path.join(DIFF_DIR, 'fog-diff.png');
    const result = compareImages(
      path.join(SCREENSHOTS_DIR, 'fog-threejs.png'),
      path.join(SCREENSHOTS_DIR, 'fog-babylon.png'),
      diffPath,
      0.15
    );

    console.log('Fog comparison:', result);
    expect(result.percentDiff, 'Fog should render similarly').toBeLessThan(15);
  });
});

test.describe('Visual Regression Report', () => {
  test.afterAll(async () => {
    // Generate a simple HTML report of all visual comparisons
    const reportPath = path.join('test-results', 'visual-regression-report.html');

    const screenshots = fs.readdirSync(SCREENSHOTS_DIR);
    const diffs = fs.readdirSync(DIFF_DIR);

    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .comparison { margin: 20px 0; border: 1px solid #ccc; padding: 10px; }
    .comparison h3 { margin-top: 0; }
    .images { display: flex; gap: 10px; }
    .images img { max-width: 400px; border: 1px solid #ddd; }
    .diff { border: 2px solid red; }
  </style>
</head>
<body>
  <h1>Visual Regression Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
`;

    // Group screenshots by cart name
    const cartNames = new Set();
    screenshots.forEach(file => {
      const match = file.match(/^(.+?)-(threejs|babylon)\.png$/);
      if (match) cartNames.add(match[1]);
    });

    cartNames.forEach(cartName => {
      const threejsFile = `${cartName}-threejs.png`;
      const babylonFile = `${cartName}-babylon.png`;
      const diffFile = `${cartName}-diff.png`;

      if (screenshots.includes(threejsFile) && screenshots.includes(babylonFile)) {
        html += `
  <div class="comparison">
    <h3>${cartName}</h3>
    <div class="images">
      <div>
        <h4>Three.js</h4>
        <img src="../screenshots/${threejsFile}" alt="${cartName} Three.js">
      </div>
      <div>
        <h4>Babylon.js</h4>
        <img src="../screenshots/${babylonFile}" alt="${cartName} Babylon.js">
      </div>
      ${diffs.includes(diffFile) ? `
      <div>
        <h4>Difference</h4>
        <img src="../diffs/${diffFile}" alt="${cartName} Diff" class="diff">
      </div>
      ` : ''}
    </div>
  </div>
`;
      }
    });

    html += `
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
    console.log(`Visual regression report generated: ${reportPath}`);
  });
});
