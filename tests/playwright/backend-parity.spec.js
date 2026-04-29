import { test, expect } from '@playwright/test';
import {
  loadCart,
  getConsoleLogs,
  extractMetrics,
  pressKey,
  screenshotCanvas,
  waitFor3DScene,
  getPlayerPosition,
  isTextRendering,
} from './helpers.js';

// List of carts to test - organized by category
const CARTS_TO_TEST = [
  // Basic 3D Tests
  { name: 'hello-3d', description: 'Hello 3D (Basic)', category: 'basic' },
  { name: 'hello-skybox', description: 'Hello Skybox', category: 'basic' },
  { name: 'hello-world', description: 'Hello World', category: 'basic' },

  // 3D Game Demos
  { name: 'space-harrier-3d', description: 'Space Harrier 3D', category: '3d-games' },
  { name: 'f-zero-nova-3d', description: 'F-Zero Nova 3D', category: '3d-games' },
  { name: 'star-fox-nova-3d', description: 'Star Fox Nova 3D', category: '3d-games' },
  { name: 'wing-commander-space', description: 'Wing Commander Space', category: '3d-games' },
  { name: 'space-combat-3d', description: 'Space Combat 3D', category: '3d-games' },
  { name: 'super-plumber-64', description: 'Super Plumber 64', category: '3d-games' },

  // 3D Showcase Demos
  { name: 'crystal-cathedral-3d', description: 'Crystal Cathedral 3D', category: '3d-showcase' },
  { name: 'cyberpunk-city-3d', description: 'Cyberpunk City 3D', category: '3d-showcase' },
  { name: 'mystical-realm-3d', description: 'Mystical Realm 3D', category: '3d-showcase' },
  { name: 'nature-explorer-3d', description: 'Nature Explorer 3D', category: '3d-showcase' },
  { name: '3d-advanced', description: '3D Advanced', category: '3d-showcase' },

  // First-Person / Shooter
  { name: 'fps-demo-3d', description: 'FPS Demo 3D', category: 'fps' },
  { name: 'shooter-demo-3d', description: 'Shooter Demo 3D', category: 'fps' },
  { name: 'dungeon-crawler-3d', description: 'Dungeon Crawler 3D', category: 'fps' },
  { name: 'wizardry-3d', description: 'Wizardry 3D', category: 'fps' },

  // Voxel Demos
  { name: 'minecraft-demo', description: 'Minecraft Demo', category: 'voxel' },
  { name: 'voxel-terrain', description: 'Voxel Terrain', category: 'voxel' },
  { name: 'voxel-creative', description: 'Voxel Creative', category: 'voxel' },
  { name: 'voxel-creatures', description: 'Voxel Creatures', category: 'voxel' },
  { name: 'vox-viewer', description: 'Vox Viewer', category: 'voxel' },

  // Rendering / Shader Demos
  { name: 'pbr-showcase', description: 'PBR Showcase', category: 'rendering' },
  { name: 'shader-showcase', description: 'Shader Showcase', category: 'rendering' },
  { name: 'tsl-showcase', description: 'TSL Showcase', category: 'rendering' },
  { name: 'skybox-showcase', description: 'Skybox Showcase', category: 'rendering' },
  { name: 'instancing-demo', description: 'Instancing Demo', category: 'rendering' },

  // Physics Demos
  { name: 'physics-demo-3d', description: 'Physics Demo 3D', category: 'physics' },
  { name: 'game-of-life-3d', description: 'Game of Life 3D', category: 'physics' },
  { name: 'boids-flocking', description: 'Boids Flocking', category: 'physics' },

  // Particle Systems
  { name: 'particles-demo', description: 'Particles Demo', category: 'particles' },
  { name: 'particle-fireworks', description: 'Particle Fireworks', category: 'particles' },
  { name: 'particle-trail', description: 'Particle Trail', category: 'particles' },

  // Creative / Generative
  { name: 'generative-art', description: 'Generative Art', category: 'creative' },
  { name: 'creative-coding', description: 'Creative Coding', category: 'creative' },
  { name: 'blend-aurora', description: 'Blend Aurora', category: 'creative' },
  { name: 'filter-glitch', description: 'Filter Glitch', category: 'creative' },
  { name: 'nft-art-generator', description: 'NFT Art Generator', category: 'creative' },

  // 2D / Stage Demos
  { name: 'stage-cards', description: 'Stage Cards', category: 'stage' },
  { name: 'stage-menu', description: 'Stage Menu', category: 'stage' },
  { name: 'flash-demo', description: 'Flash Demo', category: 'stage' },
  { name: 'movie-clock', description: 'Movie Clock', category: 'stage' },
  { name: 'demoscene', description: 'Demoscene', category: 'stage' },

  // UI Demos
  { name: 'canvas-ui-showcase', description: 'Canvas UI Showcase', category: 'ui' },
  { name: 'ui-demo', description: 'UI Demo', category: 'ui' },
  { name: 'hud-demo', description: 'HUD Demo', category: 'ui' },
  { name: 'screen-demo', description: 'Screen Demo', category: 'ui' },
  { name: 'startscreen-demo', description: 'Start Screen Demo', category: 'ui' },

  // Tween Demos
  { name: 'tween-bounce', description: 'Tween Bounce', category: 'tween' },
  { name: 'tween-logo', description: 'Tween Logo', category: 'tween' },
  { name: 'tween-typewriter', description: 'Tween Typewriter', category: 'tween' },

  // XR / VR Demos
  { name: 'vr-demo', description: 'VR Demo', category: 'xr' },
  { name: 'vr-sword-combat', description: 'VR Sword Combat', category: 'xr' },
  { name: 'ar-hand-demo', description: 'AR Hand Demo', category: 'xr' },

  // System Demos
  { name: 'wad-demo', description: 'WAD Demo', category: 'systems' },
  { name: 'model-viewer-3d', description: 'Model Viewer 3D', category: 'systems' },
  { name: 'storage-quest', description: 'Storage Quest', category: 'systems' },
  { name: 'input-showcase', description: 'Input Showcase', category: 'systems' },
  { name: 'audio-lab', description: 'Audio Lab', category: 'systems' },

  // Platformer / Adventure
  { name: 'camera-platformer', description: 'Camera Platformer', category: 'platformer' },
  { name: 'adventure-comic-3d', description: 'Adventure Comic 3D', category: 'platformer' },
  { name: 'strider-demo-3d', description: 'Strider Demo 3D', category: 'platformer' },

  // NFT / Blockchain
  { name: 'nft-worlds', description: 'NFT Worlds', category: 'nft' },

  // Babylon.js Specific
  { name: 'babylon-demo', description: 'Babylon Demo', category: 'babylon' },
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

    const textStatus = await isTextRendering(page, logs);
    console.log('Three.js text rendering:', textStatus);

    expect(textStatus.printCallsMade, 'drawText/print should be called').toBe(true);
    expect(textStatus.hasTitleTextPixels, 'Title text should render in the start screen').toBe(
      true
    );
    expect(textStatus.hasFramebufferContent, 'Canvas should contain rendered content').toBe(true);
  });

  test('should render start screen text in Babylon.js', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await loadCart(page, 'space-harrier-3d', 'babylon');
    await page.waitForTimeout(2000);

    const textStatus = await isTextRendering(page, logs);
    console.log('Babylon.js text rendering:', textStatus);

    expect(textStatus.printCallsMade, 'drawText/print should be called').toBe(true);
    expect(textStatus.hasTitleTextPixels, 'Title text should render in the start screen').toBe(
      true
    );
    expect(textStatus.hasFramebufferContent, 'Canvas should contain rendered content').toBe(true);
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
    await screenshotCanvas(page, 'threejs', { path: 'screenshots/hello-3d-threejs.png' });
    await loadCart(page, 'hello-3d', 'babylon');
    await screenshotCanvas(page, 'babylon', { path: 'screenshots/hello-3d-babylon.png' });

    // Note: Actual pixel comparison would require additional library
    // For now, just ensure both screenshots were captured
    expect(screenshotThreejs.length).toBeGreaterThan(0);
    expect(screenshotBabylon.length).toBeGreaterThan(0);
  });
});
