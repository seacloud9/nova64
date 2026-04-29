import { test, expect } from '@playwright/test';
import { extractMetrics, loadCart, pressKey, waitFor3DScene } from './helpers.js';

const BACKENDS = ['threejs', 'babylon'];
const HELLO_3D_PATH = '/examples/hello-3d/code.js';
const MINECRAFT_DEMO_PATH = '/examples/minecraft-demo/code.js';
const VOXEL_TERRAIN_PATH = '/examples/voxel-terrain/code.js';

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

async function getVoxelSnapshot(page, x = 0, z = 0) {
  return await page.evaluate(
    ({ x, z }) => ({
      seed:
        globalThis.getVoxelConfig?.()?.seed ??
        globalThis.nova64?.voxel?.getVoxelConfig?.()?.seed ??
        null,
      highest:
        globalThis.getVoxelHighestBlock?.(x, z) ??
        globalThis.nova64?.voxel?.getVoxelHighestBlock?.(x, z) ??
        0,
      biome:
        globalThis.getVoxelBiome?.(x, z) ?? globalThis.nova64?.voxel?.getVoxelBiome?.(x, z) ?? null,
    }),
    { x, z }
  );
}

async function getVoxelPlayerState(page, x = 0, z = 0) {
  return await page.evaluate(
    ({ x, z }) => {
      const camera = globalThis.getCamera?.() ?? globalThis.nova64?.camera?.getCamera?.();
      const position = camera?.position ?? null;
      return {
        seed:
          globalThis.getVoxelConfig?.()?.seed ??
          globalThis.nova64?.voxel?.getVoxelConfig?.()?.seed ??
          null,
        highest:
          globalThis.getVoxelHighestBlock?.(x, z) ??
          globalThis.nova64?.voxel?.getVoxelHighestBlock?.(x, z) ??
          0,
        biome:
          globalThis.getVoxelBiome?.(x, z) ??
          globalThis.nova64?.voxel?.getVoxelBiome?.(x, z) ??
          null,
        camera: position ? { x: position.x, y: position.y, z: position.z } : null,
      };
    },
    { x, z }
  );
}

async function loadCartFromDashboard(page, modulePath, backend = 'threejs', options = {}) {
  const { navigate = true } = options;
  const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
  if (navigate) {
    await page.goto(url);
  }
  await page.waitForSelector('#cart', { timeout: 30000 });
  await page.selectOption('#cart', modulePath);
  await expect
    .poll(
      () =>
        page.evaluate(
          () => globalThis.__NOVA64_CURRENT_CART_PATH ?? globalThis.__nova64CurrentCartPath ?? null
        ),
      { timeout: 30000 }
    )
    .toBe(modulePath);
  await page.waitForTimeout(2000);
}

function distanceBetweenPoints(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

async function getNovaStoreState(page) {
  return await page.evaluate(() => globalThis.novaStore?.getState?.() ?? null);
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

  test('minecraft-demo: default voxel world seed and terrain should match between backends', async ({
    page,
  }) => {
    await loadCart(page, 'minecraft-demo', 'threejs');
    await waitFor3DScene(page, 'threejs');
    await expect
      .poll(async () => (await getVoxelSnapshot(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const threeSnapshot = await getVoxelSnapshot(page);

    await loadCart(page, 'minecraft-demo', 'babylon');
    await waitFor3DScene(page, 'babylon');
    await expect
      .poll(async () => (await getVoxelSnapshot(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const babylonSnapshot = await getVoxelSnapshot(page);

    expect(babylonSnapshot.seed).toBe(threeSnapshot.seed);
    expect(babylonSnapshot.highest).toBe(threeSnapshot.highest);
    expect(babylonSnapshot.biome).toBe(threeSnapshot.biome);
  });

  test('dashboard cart selector should give minecraft-demo the same world as direct demo load in Three.js', async ({
    page,
  }) => {
    await loadCart(page, 'minecraft-demo', 'threejs');
    await waitFor3DScene(page, 'threejs');
    await expect
      .poll(async () => (await getVoxelPlayerState(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const directState = await getVoxelPlayerState(page);

    await loadCartFromDashboard(page, MINECRAFT_DEMO_PATH, 'threejs');
    await expect
      .poll(async () => (await getVoxelPlayerState(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const dashboardState = await getVoxelPlayerState(page);

    expect(dashboardState.seed).toBe(directState.seed);
    expect(dashboardState.highest).toBe(directState.highest);
    expect(dashboardState.biome).toBe(directState.biome);
  });

  test('dashboard-selected voxel carts should reset world state and still allow movement in Three.js', async ({
    page,
  }) => {
    await loadCartFromDashboard(page, MINECRAFT_DEMO_PATH, 'threejs');
    await expect
      .poll(async () => (await getVoxelPlayerState(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const minecraftState = await getVoxelPlayerState(page);

    await loadCartFromDashboard(page, VOXEL_TERRAIN_PATH, 'threejs');
    await expect
      .poll(async () => (await getVoxelPlayerState(page)).highest, { timeout: 30000 })
      .toBeGreaterThan(0);
    const voxelTerrainState = await getVoxelPlayerState(page);

    expect(minecraftState.seed).not.toBeNull();
    expect(voxelTerrainState.seed).not.toBeNull();
    expect(voxelTerrainState.seed).not.toBe(minecraftState.seed);

    await page.locator('#screen').click();
    const beforeMove = voxelTerrainState.camera;
    await pressKey(page, 'w', 500);

    await expect
      .poll(
        async () => distanceBetweenPoints(beforeMove, (await getVoxelPlayerState(page)).camera),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0.1);
  });
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

test.describe('Cart Reset Regression', () => {
  test('dashboard cart loads should reset novaStore defaults in Three.js', async ({ page }) => {
    await page.goto('/console.html');
    await page.waitForSelector('#cart', { timeout: 30000 });

    await page.evaluate(() => {
      globalThis.novaStore?.setState({
        gameState: 'playing',
        score: 99,
        lives: 1,
        level: 7,
        time: 12.5,
        paused: true,
        playerX: 42,
        playerY: -3,
      });
    });

    await loadCartFromDashboard(page, HELLO_3D_PATH, 'threejs', { navigate: false });

    await expect
      .poll(async () => (await getNovaStoreState(page))?.score ?? -1, { timeout: 10000 })
      .toBe(0);

    const resetState = await getNovaStoreState(page);

    expect(resetState).toMatchObject({
      gameState: 'start',
      score: 0,
      lives: 3,
      level: 1,
      paused: false,
      playerX: 0,
      playerY: 0,
    });
    expect(resetState?.time ?? Infinity).toBeLessThan(5);
  });

  test('dashboard cart loads should clear stuck input state in Three.js', async ({ page }) => {
    await page.goto('/console.html');
    await page.waitForSelector('#cart', { timeout: 30000 });

    const dirtyInput = await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      return {
        w: globalThis.key?.('KeyW') ?? false,
        space: globalThis.key?.('Space') ?? false,
      };
    });

    expect(dirtyInput.w).toBe(true);
    expect(dirtyInput.space).toBe(true);

    await loadCartFromDashboard(page, HELLO_3D_PATH, 'threejs', { navigate: false });

    await expect
      .poll(
        async () =>
          await page.evaluate(() => ({
            w: globalThis.key?.('KeyW') ?? false,
            space: globalThis.key?.('Space') ?? false,
          })),
        { timeout: 10000 }
      )
      .toEqual({ w: false, space: false });
  });
});
