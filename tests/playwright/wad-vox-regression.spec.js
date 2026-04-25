import { test, expect } from '@playwright/test';
import { extractMetrics, loadCart, pressKey, waitFor3DScene } from './helpers.js';

const BACKENDS = ['threejs', 'babylon'];

function collectConsole(page) {
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  return logs;
}

function getErrorText(logs) {
  return logs
    .filter(log => log.type === 'error')
    .map(log => log.text)
    .join('\n');
}

async function getWadDemoState(page) {
  return await page.evaluate(() => globalThis.__nova64WadDemoState?.() ?? null);
}

async function getVoxelState(page) {
  return await page.evaluate(() => ({
    backend: globalThis.nova64?.scene?.getBackendCapabilities?.().backend ?? null,
    entityCount:
      globalThis.getVoxelEntityCount?.() ?? globalThis.nova64?.voxel?.getVoxelEntityCount?.() ?? 0,
    highestBlock:
      globalThis.getVoxelHighestBlock?.(0, 0) ??
      globalThis.nova64?.voxel?.getVoxelHighestBlock?.(0, 0) ??
      0,
  }));
}

async function getHiddenSceneMeshCount(page) {
  return await page.evaluate(() => {
    const scene = globalThis.nova64?.scene?.getScene?.();
    const meshes = scene?.meshes ?? scene?.children ?? [];
    return meshes.filter(mesh => (mesh?.isVisible ?? mesh?.visible ?? true) === false).length;
  });
}

test.describe('WAD Regression', () => {
  for (const backend of BACKENDS) {
    test(`wad-demo: bundled FreeDoom asset should load and start in ${backend}`, async ({
      page,
    }) => {
      const logs = collectConsole(page);

      await loadCart(page, 'wad-demo', backend);

      await expect
        .poll(async () => (await getWadDemoState(page))?.gameState || '', {
          timeout: 30000,
        })
        .toBe('menu');

      const menuState = await getWadDemoState(page);
      expect(menuState?.loadError).toBeNull();
      expect(menuState?.engineAvailable).toBe(true);
      expect(menuState?.mapCount ?? 0).toBeGreaterThan(0);
      expect(menuState?.currentMap).toBeTruthy();

      await pressKey(page, 'Enter', 100);

      await expect
        .poll(async () => (await getWadDemoState(page))?.gameState || '', { timeout: 10000 })
        .toBe('playing');

      const playingState = await getWadDemoState(page);
      expect(playingState?.wallCount ?? 0).toBeGreaterThan(0);
      expect(playingState?.playerHealth ?? 0).toBeGreaterThan(0);
      expect(playingState?.ammo ?? 0).toBeGreaterThan(0);
      expect(playingState?.texturedWallCount ?? 0).toBeGreaterThan(0);
      expect(playingState?.texturedSpriteCount ?? 0).toBeGreaterThan(0);
      expect(playingState?.texturedFloorCount ?? 0).toBeGreaterThan(0);

      await page.waitForTimeout(1000);

      const hiddenMeshCount = await getHiddenSceneMeshCount(page);
      expect(hiddenMeshCount).toBeGreaterThan(0);

      const errorText = getErrorText(logs);
      expect(errorText).not.toContain('Cart update() error:');
      expect(errorText).not.toContain('startLevel() crashed:');
      expect(errorText).not.toContain("reading 'x'");
      expect(errorText).not.toContain("reading 'uv'");
      expect(errorText).not.toContain('WAD load failed:');
    });
  }
});

test.describe('VOX Regression', () => {
  for (const backend of BACKENDS) {
    test(`vox-viewer: house.vox should load in ${backend}`, async ({ page }) => {
      const logs = collectConsole(page);

      await loadCart(page, 'vox-viewer', backend);
      await waitFor3DScene(page, backend);

      await expect
        .poll(
          () => extractMetrics(logs).printCalls.find(text => text.startsWith('Model: ')) || '',
          { timeout: 15000 }
        )
        .toContain('house.vox');

      const errorText = getErrorText(logs);
      expect(errorText).not.toContain('Failed to load .vox model:');
      expect(errorText).toBe('');
    });
  }
});

test.describe('Voxel Regression', () => {
  for (const cartName of ['minecraft-demo', 'voxel-creatures']) {
    test(`${cartName}: Babylon voxel carts should boot without Three-only scene errors`, async ({
      page,
    }) => {
      const logs = collectConsole(page);

      await loadCart(page, cartName, 'babylon');
      await waitFor3DScene(page, 'babylon');

      await expect
        .poll(async () => (await getVoxelState(page)).highestBlock, { timeout: 30000 })
        .toBeGreaterThan(0);

      await expect
        .poll(async () => (await getVoxelState(page)).entityCount, { timeout: 30000 })
        .toBeGreaterThan(0);

      const state = await getVoxelState(page);
      const errorText = getErrorText(logs);

      expect(state.backend).toBe('babylon');
      expect(errorText).not.toContain('gpu.scene.add is not a function');
      expect(errorText).not.toContain('gpu.scene.remove is not a function');
      expect(errorText).not.toContain('THREE is not defined');
      expect(errorText).not.toContain('Cart update() error:');
      expect(errorText).not.toContain('Cart init() threw:');
    });
  }
});

test.describe('Wizardry Regression', () => {
  for (const backend of BACKENDS) {
    test(`wizardry-3d: reactive game store should initialize in ${backend}`, async ({ page }) => {
      const logs = collectConsole(page);

      await loadCart(page, 'wizardry-3d', backend);
      await waitFor3DScene(page, backend);
      await page.waitForTimeout(1500);

      const metrics = extractMetrics(logs);
      const errorText = getErrorText(logs);

      expect(metrics.printCalls).toContain('WIZARDRY');
      expect(errorText).not.toContain('createState is not a function');
      expect(errorText).not.toContain('Cart init() threw:');
    });
  }
});
