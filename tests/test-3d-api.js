// tests/test-3d-api.js
// Comprehensive unit tests for Nova64 3D API

import { TestRunner, Assert, Performance, MockGPU } from './test-runner.js';
import { threeDApi } from '../runtime/api-3d.js';
import {
  createUnityBridgeAdapter,
  engine,
  installUnityBridge,
  resetEngineAdapter,
} from '../runtime/engine-adapter.js';
import { runScreenSystemTests } from './test-screen-system.js';

export async function run3DAPITests() {
  const runner = new TestRunner();
  const mockGPU = new MockGPU();
  const api = threeDApi(mockGPU);

  // Create test globals object
  const testGlobals = {};
  api.exposeTo(testGlobals);

  // Test primitive creation
  runner.test('createCube - valid parameters', () => {
    const cubeId = testGlobals.createCube(2, 0xff0000, [1, 2, 3]);
    Assert.isNotNull(cubeId, 'Cube ID should not be null');
    Assert.isNumber(cubeId, 'Cube ID should be a number');
  });

  runner.test('createCube - invalid parameters', () => {
    // Should handle invalid size gracefully
    const cubeId = testGlobals.createCube(-1, 0xff0000, [0, 0, 0]);
    Assert.isNotNull(cubeId, 'Should create cube even with invalid size');

    // Should handle invalid color gracefully
    const cubeId2 = testGlobals.createCube(1, 'invalid', [0, 0, 0]);
    Assert.isNotNull(cubeId2, 'Should create cube even with invalid color');
  });

  runner.test('createCube - invalid position arrays', () => {
    // Should handle non-array position
    const cubeId1 = testGlobals.createCube(1, 0xff0000, 'invalid');
    Assert.isNotNull(cubeId1, 'Should handle non-array position');

    // Should handle short array
    const cubeId2 = testGlobals.createCube(1, 0xff0000, [1, 2]);
    Assert.isNotNull(cubeId2, 'Should handle short position array');

    // Should handle object position
    const cubeId3 = testGlobals.createCube(1, 0xff0000, { x: 1, y: 2, z: 3 });
    Assert.isNotNull(cubeId3, 'Should handle object position');
  });

  runner.test('createSphere - valid parameters', () => {
    const sphereId = testGlobals.createSphere(1.5, 0x00ff00, [0, 0, 0], 16);
    Assert.isNotNull(sphereId, 'Sphere ID should not be null');
    Assert.isNumber(sphereId, 'Sphere ID should be a number');
  });

  runner.test('createSphere - invalid parameters', () => {
    // Should handle invalid radius
    const sphereId = testGlobals.createSphere(-1, 0x00ff00, [0, 0, 0], 8);
    Assert.isNotNull(sphereId, 'Should create sphere even with invalid radius');

    // Should handle invalid segments
    const sphereId2 = testGlobals.createSphere(1, 0x00ff00, [0, 0, 0], 2);
    Assert.isNotNull(sphereId2, 'Should create sphere even with invalid segments');
  });

  runner.test('createPlane - valid parameters', () => {
    const planeId = testGlobals.createPlane(5, 3, 0x0000ff, [0, 0, 0]);
    Assert.isNotNull(planeId, 'Plane ID should not be null');
    Assert.isNumber(planeId, 'Plane ID should be a number');
  });

  runner.test('createPlane - invalid parameters', () => {
    // Should handle invalid dimensions
    const planeId = testGlobals.createPlane(-1, -1, 0x0000ff, [0, 0, 0]);
    Assert.isNotNull(planeId, 'Should create plane even with invalid dimensions');
  });

  // Test transform functions
  runner.test('setPosition - valid mesh', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setPosition(cubeId, 5, 10, 15);
    Assert.isTrue(result, 'setPosition should return true for valid mesh');
  });

  runner.test('setPosition - invalid mesh', () => {
    const result = testGlobals.setPosition(99999, 5, 10, 15);
    Assert.isFalse(result, 'setPosition should return false for invalid mesh');
  });

  runner.test('setPosition - invalid coordinates', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setPosition(cubeId, 'invalid', null, undefined);
    Assert.isTrue(result, 'setPosition should handle invalid coordinates gracefully');
  });

  runner.test('setRotation - valid parameters', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setRotation(cubeId, Math.PI / 4, Math.PI / 2, Math.PI);
    Assert.isTrue(result, 'setRotation should return true for valid parameters');
  });

  runner.test('setRotation - invalid mesh', () => {
    const result = testGlobals.setRotation(99999, 0, 0, 0);
    Assert.isFalse(result, 'setRotation should return false for invalid mesh');
  });

  runner.test('setScale - uniform scaling', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setScale(cubeId, 2);
    Assert.isTrue(result, 'setScale should return true for uniform scaling');
  });

  runner.test('setScale - non-uniform scaling', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setScale(cubeId, 2, 3, 4);
    Assert.isTrue(result, 'setScale should return true for non-uniform scaling');
  });

  runner.test('setScale - invalid parameters', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    const result = testGlobals.setScale(cubeId, -1, 0, 'invalid');
    Assert.isTrue(result, 'setScale should handle invalid parameters gracefully');
  });

  // Test position/rotation getters
  runner.test('getPosition - valid mesh', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [5, 10, 15]);
    const position = testGlobals.getPosition(cubeId);
    Assert.isArray(position, 'getPosition should return an array');
    Assert.equals(position.length, 3, 'Position array should have 3 elements');
  });

  runner.test('getPosition - invalid mesh', () => {
    const position = testGlobals.getPosition(99999);
    Assert.isNull(position, 'getPosition should return null for invalid mesh');
  });

  runner.test('getRotation - valid mesh', () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
    testGlobals.setRotation(cubeId, 1, 2, 3);
    const rotation = testGlobals.getRotation(cubeId);
    Assert.isArray(rotation, 'getRotation should return an array');
    Assert.equals(rotation.length, 3, 'Rotation array should have 3 elements');
  });

  // Test scene management
  runner.test('clearScene - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.clearScene();
    }, 'clearScene should not throw');
  });

  // Test camera functions
  runner.test('setCameraPosition - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setCameraPosition(10, 20, 30);
    }, 'setCameraPosition should not throw');
  });

  runner.test('setCameraTarget - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setCameraTarget(0, 0, 0);
    }, 'setCameraTarget should not throw');
  });

  runner.test('setCameraFOV - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setCameraFOV(75);
    }, 'setCameraFOV should not throw');
  });

  // Test lighting functions
  runner.test('setLightDirection - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setLightDirection(1, -1, 0);
    }, 'setLightDirection should not throw');
  });

  runner.test('setLightColor - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setLightColor(0xffffff);
    }, 'setLightColor should not throw');
  });

  runner.test('setAmbientLight - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.setAmbientLight(0x404040);
    }, 'setAmbientLight should not throw');
  });

  // Test effects functions
  runner.test('enablePixelation - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.enablePixelation(2);
    }, 'enablePixelation should not throw');
  });

  runner.test('enableDithering - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.enableDithering(true);
    }, 'enableDithering should not throw');
  });

  runner.test('enableBloom - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.enableBloom(true);
    }, 'enableBloom should not throw');
  });

  runner.test('enableMotionBlur - should not throw', () => {
    Assert.doesNotThrow(() => {
      testGlobals.enableMotionBlur(0.5);
    }, 'enableMotionBlur should not throw');
  });

  // Test utility functions
  runner.test('get3DStats - should return object', () => {
    const stats = testGlobals.get3DStats();
    Assert.isObject(stats, 'get3DStats should return an object');
  });

  runner.test('getScene - should return scene object', () => {
    const scene = testGlobals.getScene();
    Assert.isObject(scene, 'getScene should return scene object');
  });

  runner.test('getCamera - should return camera object', () => {
    const camera = testGlobals.getCamera();
    Assert.isObject(camera, 'getCamera should return camera object');
  });

  runner.test('getRenderer - should return renderer object', () => {
    const renderer = testGlobals.getRenderer();
    Assert.isObject(renderer, 'getRenderer should return renderer object');
  });

  runner.test('engine adapter - unity bridge marshals material and camera commands', () => {
    const calls = [];
    const bridge = {
      call(method, payload = {}) {
        calls.push({ method, payload });
        if (method === 'texture.createData') return { id: 'tex-1' };
        if (method === 'material.create') return { id: 'mat-1' };
        if (method === 'geometry.createPlane') return { id: 'geo-1' };
        if (method === 'camera.getPosition') return { x: 7, y: 8, z: 9 };
        return undefined;
      },
    };

    const unityEngine = createUnityBridgeAdapter(bridge);
    const tex = unityEngine.createDataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1, {
      filter: 'nearest',
    });
    const color = unityEngine.createColor(1, 0.5, 0.25);
    const material = unityEngine.createMaterial('standard', {
      map: tex,
      color,
      roughness: 0.2,
    });
    const geometry = unityEngine.createPlaneGeometry(4, 2, 8, 4);
    unityEngine.setMeshMaterial(42, material);
    const cameraPos = unityEngine.getCameraPosition();

    Assert.equals(tex.id, 'tex-1', 'Bridge texture handle should preserve returned ID');
    Assert.equals(material.id, 'mat-1', 'Bridge material handle should preserve returned ID');
    Assert.equals(geometry.id, 'geo-1', 'Bridge geometry handle should preserve returned ID');
    Assert.equals(
      calls[1].payload.opts.map.id,
      'tex-1',
      'Material payload should serialize texture handles'
    );
    Assert.equals(
      calls[3].method,
      'mesh.setMaterial',
      'Mesh material assignment should be forwarded'
    );
    Assert.equals(
      calls[3].payload.material.id,
      'mat-1',
      'Mesh payload should serialize material handles'
    );
    Assert.equals(cameraPos.x, 7, 'Camera X should come from bridge');
    Assert.equals(cameraPos.y, 8, 'Camera Y should come from bridge');
    Assert.equals(cameraPos.z, 9, 'Camera Z should come from bridge');
  });

  runner.test('engine adapter - installUnityBridge swaps live engine backend', () => {
    const calls = [];
    const bridge = {
      call(method, payload = {}) {
        calls.push({ method, payload });
        if (method === 'geometry.createPlane') return { id: 'unity-geo' };
        if (method === 'camera.getPosition') return { x: 3, y: 4, z: 5 };
        return undefined;
      },
    };

    try {
      installUnityBridge(bridge);
      const geometry = engine.createPlaneGeometry(2, 3, 4, 5);
      const cameraPos = engine.getCameraPosition();

      Assert.equals(geometry.id, 'unity-geo', 'Live engine should delegate to Unity bridge');
      Assert.equals(cameraPos.x, 3, 'Live engine should read camera X from bridge');
      Assert.equals(calls[0].method, 'geometry.createPlane', 'Geometry creation should hit bridge');
      Assert.equals(calls[1].method, 'camera.getPosition', 'Camera read should hit bridge');
    } finally {
      resetEngineAdapter();
    }
  });

  // Performance tests
  runner.test('Performance - createCube batch', async () => {
    const { average } = await Performance.benchmark(
      'createCube',
      () => {
        testGlobals.createCube(1, 0xffffff, [0, 0, 0]);
      },
      100
    );

    Assert.isTrue(average < 1, `createCube should be fast (${average.toFixed(3)}ms avg)`);
  });

  runner.test('Performance - setPosition batch', async () => {
    const cubeId = testGlobals.createCube(1, 0xffffff, [0, 0, 0]);

    const { average } = await Performance.benchmark(
      'setPosition',
      () => {
        testGlobals.setPosition(cubeId, Math.random() * 10, Math.random() * 10, Math.random() * 10);
      },
      1000
    );

    Assert.isTrue(average < 0.1, `setPosition should be very fast (${average.toFixed(3)}ms avg)`);
  });

  return await runner.runAll();
}
