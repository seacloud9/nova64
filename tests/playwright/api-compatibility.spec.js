import { test, expect } from '@playwright/test';

import { REQUIRED_BACKEND_SURFACE_KEYS } from '../../runtime/shared/backend-surface.js';
import { BABYLON_BACKEND_CAPABILITIES } from '../../runtime/backends/babylon/capabilities.js';
import { THREEJS_BACKEND_CAPABILITIES } from '../../runtime/backends/threejs/capabilities.js';

const BACKENDS = ['threejs', 'babylon'];

async function openApiSandbox(page, backend) {
  const url =
    backend === 'babylon'
      ? '/babylon_console.html?demo=test-minimal'
      : '/console.html?demo=test-minimal';

  await page.goto(url);
  await page.waitForFunction(
    () =>
      typeof globalThis.createCube === 'function' &&
      typeof globalThis.nova64?.scene?.engine !== 'undefined' &&
      typeof globalThis.nova64?.camera?.getCamera === 'function',
    { timeout: 30000 }
  );
  await page.waitForTimeout(500);
}

async function getFlatSurfaceTypes(page) {
  return page.evaluate(keys =>
    Object.fromEntries(keys.map(key => [key, typeof globalThis[key]])),
    REQUIRED_BACKEND_SURFACE_KEYS
  );
}

test.describe('Backend Surface Parity', () => {
  test('required flat surface keys should exist in both backends', async ({ page }) => {
    const flatTypes = {};

    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);
      flatTypes[backend] = await getFlatSurfaceTypes(page);
    }

    for (const key of REQUIRED_BACKEND_SURFACE_KEYS) {
      expect(flatTypes.threejs[key], `${key} should exist in threejs`).not.toBe('undefined');
      expect(flatTypes.babylon[key], `${key} should exist in babylon`).toBe(flatTypes.threejs[key]);
    }
  });

  test('namespaced engine and camera accessors should stay wired in both backends', async ({
    page,
  }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => ({
        backend: nova64.scene.getBackendCapabilities?.().backend ?? null,
        engineCreateMaterial: typeof nova64.scene.engine?.createMaterial,
        engineSetMeshMaterial: typeof nova64.scene.engine?.setMeshMaterial,
        getCamera: typeof nova64.camera.getCamera,
        getScene: typeof nova64.scene.getScene,
        getRenderer: typeof nova64.scene.getRenderer,
      }));

      expect(result.backend).toBe(backend);
      expect(result.engineCreateMaterial).toBe('function');
      expect(result.engineSetMeshMaterial).toBe('function');
      expect(result.getCamera).toBe('function');
      expect(result.getScene).toBe('function');
      expect(result.getRenderer).toBe('function');
    }
  });

  test('camera access should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => {
        setCameraPosition(3, 4, 12);
        setCameraTarget(0, 1, 0);
        setCameraLookAt([0, 0, -5]);
        setCameraFOV(70);

        const camera = nova64.camera.getCamera();
        const renderer = nova64.scene.getRenderer();
        const scene = nova64.scene.getScene();

        return {
          hasCamera: !!camera,
          hasRenderer: !!renderer,
          hasScene: !!scene,
          position: {
            x: Number(camera?.position?.x ?? 0),
            y: Number(camera?.position?.y ?? 0),
            z: Number(camera?.position?.z ?? 0),
          },
        };
      });

      expect(result.hasCamera, `camera should exist in ${backend}`).toBe(true);
      expect(result.hasRenderer, `renderer should exist in ${backend}`).toBe(true);
      expect(result.hasScene, `scene should exist in ${backend}`).toBe(true);
      expect(result.position).toEqual({ x: 3, y: 4, z: 12 });
    }
  });

  test('point light mutators should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => {
        const lightId = createPointLight(0xffffff, 1.2, 20, 0, 5, 0);
        return {
          lightId,
          moved: setPointLightPosition(lightId, 1, 2, 3),
          recolored: setPointLightColor(lightId, 0xff44aa, 1.5),
          removed: removeLight(lightId),
        };
      });

      expect(result.lightId).toBeTruthy();
      expect(result.moved, `setPointLightPosition should work in ${backend}`).toBe(true);
      expect(result.recolored, `setPointLightColor should work in ${backend}`).toBe(true);
      expect(result.removed, `removeLight should work in ${backend}`).toBe(true);
    }
  });

  test('instancing helpers should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => {
        const instancedId = createInstancedMesh('cube', 3, 0x88ccff, { size: 1 });
        return {
          instancedId,
          firstTransform: setInstanceTransform(instancedId, 0, 0, 0, -5, 0, 0, 0, 1, 1, 1),
          firstColor: setInstanceColor(instancedId, 0, 0xff0000),
          finalized: finalizeInstances(instancedId),
          removed: removeInstancedMesh(instancedId),
        };
      });

      expect(result.instancedId).toBeTruthy();
      expect(result.firstTransform, `setInstanceTransform should work in ${backend}`).toBe(true);
      expect(result.firstColor, `setInstanceColor should work in ${backend}`).toBe(true);
      expect(result.finalized, `finalizeInstances should work in ${backend}`).toBe(true);
      expect(result.removed, `removeInstancedMesh should work in ${backend}`).toBe(true);
    }
  });

  test('backend capabilities should be explicit and backend-specific', async ({ page }) => {
    await openApiSandbox(page, 'threejs');
    const threeCaps = await page.evaluate(() => nova64.scene.getBackendCapabilities());

    await openApiSandbox(page, 'babylon');
    const babylonCaps = await page.evaluate(() => nova64.scene.getBackendCapabilities());

    expect(threeCaps).toMatchObject(THREEJS_BACKEND_CAPABILITIES);
    expect(babylonCaps).toMatchObject(BABYLON_BACKEND_CAPABILITIES);
    expect(threeCaps.skybox).toBe(true);
    expect(babylonCaps.skybox).toBe(false);
  });

  test('unsupported Babylon capabilities should fail safely instead of crashing carts', async ({
    page,
  }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await openApiSandbox(page, 'babylon');

    const result = await page.evaluate(() => {
      const caps = nova64.scene.getBackendCapabilities();
      const skyboxResult = createGradientSkybox(0x87ceeb, 0x000033);
      const ditheringResult = enableDithering(true);

      return {
        backend: caps.backend,
        skybox: caps.skybox,
        dithering: caps.dithering,
        skyboxResult,
        ditheringResult,
      };
    });

    const errorText = logs
      .filter(log => log.type === 'error')
      .map(log => log.text)
      .join('\n');

    expect(result.backend).toBe('babylon');
    expect(result.skybox).toBe(false);
    expect(result.dithering).toBe(false);
    expect(result.skyboxResult).toBeNull();
    expect(result.ditheringResult).toBe(false);
    expect(errorText).not.toContain('gpu.endFrame() error:');
    expect(errorText).not.toContain('Cart update() error:');
  });
});
