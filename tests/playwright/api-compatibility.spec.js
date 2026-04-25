import { test, expect } from '@playwright/test';

import { REQUIRED_BACKEND_SURFACE_KEYS } from '../../runtime/shared/backend-surface.js';
import { BABYLON_BACKEND_CAPABILITIES } from '../../runtime/backends/babylon/capabilities.js';
import { THREEJS_BACKEND_CAPABILITIES } from '../../runtime/backends/threejs/capabilities.js';

const BACKENDS = ['threejs', 'babylon'];

async function openApiSandbox(page, backend, extraQuery = '') {
  const url =
    backend === 'babylon'
      ? `/babylon_console.html?demo=test-minimal${extraQuery}`
      : `/console.html?demo=test-minimal${extraQuery}`;

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
    expect(babylonCaps.skybox).toBe(true);
    expect(threeCaps.lod).toBe(true);
    expect(babylonCaps.lod).toBe(true);
    expect(threeCaps.raycast).toBe(true);
    expect(babylonCaps.raycast).toBe(true);
    expect(threeCaps.sceneSetup).toBe(true);
    expect(babylonCaps.sceneSetup).toBe(true);
    expect(threeCaps.pbrProperties).toBe(true);
    expect(babylonCaps.pbrProperties).toBe(true);
    expect(babylonCaps.noaPrototype).toBe(true);
  });

  test('NOA prototype probe should fail safely on Babylon and stay explicit on Three', async ({
    page,
  }) => {
    await openApiSandbox(page, 'threejs');
    const threeStatus = await page.evaluate(async () => {
      await nova64.voxel.probeVoxelNoaPrototype({ requested: true, source: 'playwright-threejs' });
      return nova64.voxel.getVoxelNoaPrototypeStatus();
    });

    expect(threeStatus.backend).toBe('threejs');
    expect(threeStatus.reason).toBe('unsupported-backend');
    expect(threeStatus.active).toBe(false);

    await openApiSandbox(page, 'babylon', '&noaVoxel=1');
    const babylonStatus = await page.evaluate(async () => {
      await nova64.voxel.probeVoxelNoaPrototype({ requested: true, source: 'playwright-babylon' });
      return nova64.voxel.getVoxelNoaPrototypeStatus();
    });

    expect(babylonStatus.backend).toBe('babylon');
    expect(babylonStatus.requested).toBe(true);
    expect(babylonStatus.mode).toBe('probe');
    expect(babylonStatus.active).toBe(false);
    expect(babylonStatus.specifier).toBe('noa-engine');
    expect(Array.isArray(babylonStatus.agentNotes)).toBe(true);
    expect(babylonStatus.agentNotes.length).toBeGreaterThan(0);
    expect(['dependency-missing', 'loaded-awaiting-adapter']).toContain(babylonStatus.reason);
  });

  test('setupScene and raycastFromCamera should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(async () => {
        clearScene();
        setupScene({
          camera: { x: 0, y: 0, z: 10, targetX: 0, targetY: 0, targetZ: 0, fov: 70 },
          light: { direction: [-1, -1, -1], color: 0xffffff, ambient: 0x666666 },
          fog: { color: 0x111122, near: 5, far: 40 },
        });

        const meshId = createCube(2, 0xff6600, [0, 0, 0]);
        await new Promise(resolve => setTimeout(resolve, 150));

        const canvas = document.getElementById('screen');
        const hit = raycastFromCamera(canvas.clientWidth / 2, canvas.clientHeight / 2);
        const camera = nova64.camera.getCamera();

        return {
          meshId,
          hit,
          cameraPosition: {
            x: Number(camera?.position?.x ?? 0),
            y: Number(camera?.position?.y ?? 0),
            z: Number(camera?.position?.z ?? 0),
          },
        };
      });

      expect(result.cameraPosition).toEqual({ x: 0, y: 0, z: 10 });
      expect(result.hit?.meshId, `raycast should hit created cube in ${backend}`).toBe(result.meshId);
    }
  });

  test('PBR property helpers and LOD helpers should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => {
        clearScene();
        const meshId = createSphere(1.5, 0xcccccc, [0, 0, -4], 16);
        const pbrUpdated = setPBRProperties(meshId, {
          metalness: 0.75,
          roughness: 0.2,
          envMapIntensity: 1.5,
        });

        const lodId = createLODMesh(
          [
            { shape: 'sphere', size: 1.5, color: 0xff8844, distance: 0, options: { segments: 8 } },
            { shape: 'cube', size: 1.5, color: 0xaa5533, distance: 10 },
          ],
          [0, 0, -8]
        );

        return {
          pbrUpdated,
          lodId,
          lodMoved: setLODPosition(lodId, 0, 0, -6),
          lodUpdated: (updateLODs(), true),
          lodRemoved: removeLODMesh(lodId),
        };
      });

      expect(result.pbrUpdated, `setPBRProperties should work in ${backend}`).toBe(true);
      expect(result.lodId, `createLODMesh should return an id in ${backend}`).toBeTruthy();
      expect(result.lodMoved, `setLODPosition should work in ${backend}`).toBe(true);
      expect(result.lodUpdated, `updateLODs should run in ${backend}`).toBe(true);
      expect(result.lodRemoved, `removeLODMesh should work in ${backend}`).toBe(true);
    }
  });

  test('skybox helpers should work in both backends', async ({ page }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(async () => {
        clearSkybox();

        const gradientSky = createGradientSkybox({ topColor: 0x112244, bottomColor: 0x334466 });
        const solidSky = createSolidSkybox(0x05070b);
        clearSkybox();

        const imageSky = await createImageSkybox([
          '/assets/sky/studio/px.png',
          '/assets/sky/studio/nx.png',
          '/assets/sky/studio/py.png',
          '/assets/sky/studio/ny.png',
          '/assets/sky/studio/pz.png',
          '/assets/sky/studio/nz.png',
        ]);

        const spaceSky = createSpaceSkybox({
          starCount: 96,
          starSize: 1.25,
          nebulae: true,
          nebulaColor: 0x220044,
        });

        enableSkyboxAutoAnimate(0.5);
        await new Promise(resolve => setTimeout(resolve, 120));
        disableSkyboxAutoAnimate();
        clearSkybox();

        return {
          gradientSky: !!gradientSky,
          solidSky: !!solidSky,
          imageSky: !!imageSky,
          spaceSky: !!spaceSky,
        };
      });

      expect(result.gradientSky, `createGradientSkybox should work in ${backend}`).toBe(true);
      expect(result.solidSky, `createSolidSkybox should work in ${backend}`).toBe(true);
      expect(result.imageSky, `createImageSkybox should work in ${backend}`).toBe(true);
      expect(result.spaceSky, `createSpaceSkybox should work in ${backend}`).toBe(true);
    }
  });

  test('Three-style scene, mesh, light, material, and texture shims should work in both backends', async ({
    page,
  }) => {
    for (const backend of BACKENDS) {
      await openApiSandbox(page, backend);

      const result = await page.evaluate(() => {
        clearScene();
        setDirectionalLight([5, 8, 3], 0xffccaa, 1);

        const engine = nova64.scene.engine;
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(0, 0, 4, 4);

        const texture = engine.createCanvasTexture(canvas, {
          filter: 'nearest',
          wrap: 'repeat',
        });
        texture.repeat.set(2, 3);
        texture.offset.set(0.25, 0.5);
        texture.needsUpdate = true;

        const clonedTexture = engine.cloneTexture(texture);
        clonedTexture.repeat.set(1.5, 2.5);
        clonedTexture.offset.set(0.1, 0.2);
        clonedTexture.needsUpdate = true;

        const material = engine.createMaterial('phong', {
          color: 0x224466,
          map: clonedTexture,
          transparent: true,
          opacity: 0.8,
          side: 'double',
        });
        material.color.set(0x336699);
        material.needsUpdate = true;

        const meshId = createCube(1, 0xffffff, [0, 0, -4]);
        engine.setMeshMaterial(meshId, material);
        const mesh = getMesh(meshId);
        mesh.visible = false;

        const scene = nova64.scene.getScene();
        let traversedMesh = false;
        let traversedLight = false;
        let lightHex = null;
        scene.traverse(obj => {
          if (obj === mesh && obj.isMesh) traversedMesh = true;
          if (!traversedLight && obj.isLight) {
            traversedLight = true;
            lightHex = obj.color?.getHexString?.() ?? null;
          }
        });

        return {
          childCount: Array.isArray(scene.children) ? scene.children.length : 0,
          traversedMesh,
          traversedLight,
          lightHex,
          isMesh: mesh.isMesh === true,
          visible: mesh.visible,
          materialColorHex: mesh.material?.color?.getHex?.() ?? null,
          materialDirtySignal:
            mesh.material?.needsUpdate === true || Number(mesh.material?.version ?? 0) > 0,
          transparent: mesh.material?.transparent === true,
          opacity: Number(mesh.material?.opacity ?? 0),
          textureRepeat: {
            x: Number(mesh.material?.map?.repeat?.x ?? 0),
            y: Number(mesh.material?.map?.repeat?.y ?? 0),
          },
          textureOffset: {
            x: Number(mesh.material?.map?.offset?.x ?? 0),
            y: Number(mesh.material?.map?.offset?.y ?? 0),
          },
          textureDirtySignal:
            mesh.material?.map?.needsUpdate === true || Number(mesh.material?.map?.version ?? 0) > 0,
        };
      });

      expect(result.childCount, `scene.children should be array-like in ${backend}`).toBeGreaterThan(0);
      expect(result.traversedMesh, `scene.traverse should visit meshes in ${backend}`).toBe(true);
      expect(result.traversedLight, `scene.traverse should visit lights in ${backend}`).toBe(true);
      expect(result.lightHex, `light.color.getHexString should work in ${backend}`).toMatch(/^[0-9a-f]{6}$/);
      expect(result.isMesh, `meshes should expose isMesh in ${backend}`).toBe(true);
      expect(result.visible, `mesh.visible should round-trip in ${backend}`).toBe(false);
      expect(result.materialColorHex, `material.color.getHex should work in ${backend}`).toBe(0x336699);
      expect(result.materialDirtySignal, `material.needsUpdate should work in ${backend}`).toBe(true);
      expect(result.transparent, `material.transparent should work in ${backend}`).toBe(true);
      expect(result.opacity, `material.opacity should work in ${backend}`).toBeCloseTo(0.8, 5);
      expect(result.textureRepeat.x, `texture.repeat.x should work in ${backend}`).toBeCloseTo(1.5, 5);
      expect(result.textureRepeat.y, `texture.repeat.y should work in ${backend}`).toBeCloseTo(2.5, 5);
      expect(result.textureOffset.x, `texture.offset.x should work in ${backend}`).toBeCloseTo(0.1, 5);
      expect(result.textureOffset.y, `texture.offset.y should work in ${backend}`).toBeCloseTo(0.2, 5);
      expect(result.textureDirtySignal, `texture.needsUpdate should work in ${backend}`).toBe(true);
    }
  });

  test('unsupported Babylon capabilities should fail safely instead of crashing carts', async ({
    page,
  }) => {
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await openApiSandbox(page, 'babylon');

    const result = await page.evaluate(() => {
      const caps = nova64.scene.getBackendCapabilities();
      const ditheringResult = enableDithering(true);
      const particleSystemId = createParticleSystem(32);
      const initialParticleStats = getParticleStats(particleSystemId);
      const particleEmitterResult = setParticleEmitter(particleSystemId, { emitterX: 1, emitterY: 2 });
      const particleBurstResult = burstParticles(particleSystemId, 8);
      const particleUpdateResult = updateParticles(1 / 60);
      const particleStats = getParticleStats(particleSystemId);
      const particleRemoved = removeParticleSystem(particleSystemId);

      return {
        backend: caps.backend,
        skybox: caps.skybox,
        dithering: caps.dithering,
        particles: caps.particles,
        ditheringResult,
        particleSystemId,
        initialParticleStats,
        particleStats,
        particleEmitterResult,
        particleBurstResult,
        particleUpdateResult,
        particleRemoved,
      };
    });

    const errorText = logs
      .filter(log => log.type === 'error')
      .map(log => log.text)
      .join('\n');

    expect(result.backend).toBe('babylon');
    expect(result.skybox).toBe(true);
    expect(result.dithering).toBe(false);
    expect(result.particles).toBe(true);
    expect(result.ditheringResult).toBe(false);
    expect(result.particleSystemId).toBeGreaterThan(0);
    expect(result.initialParticleStats).toEqual({ active: 0, max: 32, free: 32 });
    expect(result.particleStats).toEqual({ active: 8, max: 32, free: 24 });
    expect(result.particleEmitterResult).toBe(true);
    expect(result.particleBurstResult).toBe(8);
    expect(result.particleUpdateResult).toBeGreaterThanOrEqual(0);
    expect(result.particleRemoved).toBe(true);
    expect(errorText).not.toContain('gpu.endFrame() error:');
    expect(errorText).not.toContain('Cart update() error:');
    expect(errorText).not.toContain('Cart draw() error:');
  });
});
