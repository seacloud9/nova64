// tests/test-adapter-conformance.js
// Phase 1 Adapter Contract conformance suite.
//
// Any adapter (Three.js, Unity bridge, Babylon, Godot, …) MUST pass every
// test in runAdapterConformanceTests(). Tests are backend-agnostic: they work
// only via the published adapter surface so no backend-private detail leaks in.
//
// Usage:
//   import { runAdapterConformanceTests } from './test-adapter-conformance.js';
//   const adapter = createThreeEngineAdapter(); // or any other
//   await runAdapterConformanceTests(adapter, runner, { name: 'Three.js' });

import { TestRunner, Assert } from './test-runner.js';
import {
  createThreeEngineAdapter,
  createUnityBridgeAdapter,
  createCommandBufferAdapter,
  ADAPTER_CONTRACT_VERSION,
} from '../runtime/engine-adapter.js';

// ---------------------------------------------------------------------------
// Shared conformance test runner — adapter-agnostic
// ---------------------------------------------------------------------------

/**
 * Run the full adapter conformance suite against a given adapter instance.
import { createBabylonEngineAdapter } from '../runtime/engine-adapter-babylon.js';
 * @param {{ name: string }} opts
// ---------------------------------------------------------------------------
// Mock Babylon namespace — used by Node.js tests (no real DOM/WebGL needed)
// ---------------------------------------------------------------------------
 */
import { createBabylonEngineAdapter } from '../runtime/engine-adapter-babylon.js';

// ---------------------------------------------------------------------------
// Mock Babylon namespace — used by Node.js tests (no real DOM/WebGL needed)
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock BABYLON namespace that satisfies createBabylonEngineAdapter.
 * All constructors track calls so tests can verify dispatch.
 */
function createMockBABYLON() {
  let matCount = 0;
  let texCount = 0;

  class MockMaterial {
    constructor(name) {
      this.name = name;
      this._id = ++matCount;
      this.backFaceCulling = true;
      this.alpha = 1;
      this.alphaCutOff = 0;
      this.alphaMode = 0;
      this.emissiveColor = null;
    }
  }

  class StandardMaterial extends MockMaterial {
    constructor(name) {
      super(name);
      this.diffuseColor = null;
      this.emissiveColor = null;
      this.diffuseTexture = null;
      this.disableLighting = false;
    }
  }

  class PBRMaterial extends MockMaterial {
    constructor(name) {
      super(name);
      this.albedoColor = null;
      this.albedoTexture = null;
      this.roughness = 1;
      this.metallic = 0;
      this.emissiveColor = null;
    }
  }

  class MockTexture {
    constructor(name) {
      this.name = name;
      this._id = ++texCount;
      this.uScale = 1;
      this.vScale = 1;
      this.wrapU = 0;
      this.wrapV = 0;
    }
    clone() {
      const c = new MockTexture(this.name + '_clone');
      c.uScale = this.uScale;
      c.vScale = this.vScale;
      return c;
    }
    update() {}
  }

  class DynamicTexture extends MockTexture {
    constructor(name) {
      super(name);
      this._ctx = { drawImage() {} };
    }
    getContext() {
      return this._ctx;
    }
    update() {}
  }

  class Color3 {
    constructor(r = 0, g = 0, b = 0) {
      this.r = r;
      this.g = g;
      this.b = b;
    }
    clone() {
      return new Color3(this.r, this.g, this.b);
    }
  }

  const Texture = {
    NEAREST_SAMPLINGMODE: 1,
    BILINEAR_SAMPLINGMODE: 2,
    TRILINEAR_SAMPLINGMODE: 3,
    WRAP_ADDRESSMODE: 1,
    CLAMP_ADDRESSMODE: 0,
    MIRROR_ADDRESSMODE: 2,
  };

  const Material = {
    MATERIAL_OPAQUE: 0,
    MATERIAL_ALPHATEST: 1,
    MATERIAL_ALPHABLEND: 2,
    MATERIAL_ALPHATESTANDBLEND: 3,
  };

  const RawTexture = {
    CreateRGBATexture(data, width, height) {
      const t = new MockTexture(`rawTex_${++texCount}`);
      t.width = width;
      t.height = height;
      return t;
    },
  };

  return { StandardMaterial, PBRMaterial, Color3, Texture, Material, RawTexture, DynamicTexture };
}

function createMockScene(cameraPos = { x: 3, y: 7, z: 2 }) {
  return {
    activeCamera: { position: cameraPos },
  };
}

// ---------------------------------------------------------------------------
// Shared conformance test runner — adapter-agnostic
export function runAdapterConformanceTests(adapter, runner, opts = {}) {
  const label = opts.name ? `[${opts.name}] ` : '';

  // --- Required method surface ---

  runner.test(`${label}adapter surface - createMaterial exists`, () => {
    Assert.isFunction(adapter.createMaterial, 'createMaterial must be a function');
  });

  runner.test(`${label}adapter surface - createDataTexture exists`, () => {
    Assert.isFunction(adapter.createDataTexture, 'createDataTexture must be a function');
  });

  runner.test(`${label}adapter surface - createCanvasTexture exists`, () => {
    Assert.isFunction(adapter.createCanvasTexture, 'createCanvasTexture must be a function');
  });

  runner.test(`${label}adapter surface - cloneTexture exists`, () => {
    Assert.isFunction(adapter.cloneTexture, 'cloneTexture must be a function');
  });

  runner.test(`${label}adapter surface - setTextureRepeat exists`, () => {
    Assert.isFunction(adapter.setTextureRepeat, 'setTextureRepeat must be a function');
  });

  runner.test(`${label}adapter surface - invalidateTexture exists`, () => {
    Assert.isFunction(adapter.invalidateTexture, 'invalidateTexture must be a function');
  });

  runner.test(`${label}adapter surface - createColor exists`, () => {
    Assert.isFunction(adapter.createColor, 'createColor must be a function');
  });

  runner.test(`${label}adapter surface - createPlaneGeometry exists`, () => {
    Assert.isFunction(adapter.createPlaneGeometry, 'createPlaneGeometry must be a function');
  });

  runner.test(`${label}adapter surface - setMeshMaterial exists`, () => {
    Assert.isFunction(adapter.setMeshMaterial, 'setMeshMaterial must be a function');
  });

  runner.test(`${label}adapter surface - getCameraPosition exists`, () => {
    Assert.isFunction(adapter.getCameraPosition, 'getCameraPosition must be a function');
  });

  runner.test(`${label}adapter surface - getCapabilities exists`, () => {
    Assert.isFunction(adapter.getCapabilities, 'getCapabilities must be a function');
  });

  // --- Capabilities contract ---

  runner.test(`${label}capabilities - returns valid capabilities object`, () => {
    const caps = adapter.getCapabilities();
    Assert.isObject(caps, 'capabilities must be an object');
  });

  runner.test(`${label}capabilities - contractVersion matches ADAPTER_CONTRACT_VERSION`, () => {
    const caps = adapter.getCapabilities();
    Assert.equals(
      caps.contractVersion,
      ADAPTER_CONTRACT_VERSION,
      'contractVersion must equal ADAPTER_CONTRACT_VERSION'
    );
  });

  runner.test(`${label}capabilities - backend is a non-empty string`, () => {
    const caps = adapter.getCapabilities();
    Assert.isString(caps.backend, 'backend must be a string');
    Assert.isTrue(caps.backend.length > 0, 'backend must be non-empty');
  });

  runner.test(`${label}capabilities - adapterVersion is a string`, () => {
    const caps = adapter.getCapabilities();
    Assert.isString(caps.adapterVersion, 'adapterVersion must be a string');
  });

  runner.test(`${label}capabilities - features is an array`, () => {
    const caps = adapter.getCapabilities();
    Assert.isArray(caps.features, 'features must be an array');
  });

  runner.test(`${label}capabilities - supports() function exists`, () => {
    const caps = adapter.getCapabilities();
    Assert.isFunction(caps.supports, 'supports must be a function');
  });

  runner.test(`${label}capabilities - supports() returns false for unknown feature`, () => {
    const caps = adapter.getCapabilities();
    Assert.isFalse(
      caps.supports('__nonexistent_feature_xyz__'),
      'supports() must return false for an unknown feature'
    );
  });

  runner.test(`${label}capabilities - at least one feature declared`, () => {
    const caps = adapter.getCapabilities();
    Assert.isTrue(caps.features.length > 0, 'adapter must declare at least one feature');
  });

  // --- Camera read contract ---

  runner.test(`${label}getCameraPosition - returns vec3-shaped object`, () => {
    const pos = adapter.getCameraPosition();
    Assert.isObject(pos, 'getCameraPosition must return an object');
    Assert.isDefined(pos.x, 'position must have x');
    Assert.isDefined(pos.y, 'position must have y');
    Assert.isDefined(pos.z, 'position must have z');
  });

  runner.test(`${label}getCameraPosition - coordinates are finite numbers`, () => {
    const pos = adapter.getCameraPosition();
    Assert.isTrue(Number.isFinite(pos.x), 'x must be finite');
    Assert.isTrue(Number.isFinite(pos.y), 'y must be finite');
    Assert.isTrue(Number.isFinite(pos.z), 'z must be finite');
  });

  // --- Material creation ---

  runner.test(`${label}createMaterial('basic') - does not throw`, () => {
    Assert.doesNotThrow(() => {
      adapter.createMaterial('basic', { color: 0xff0000 });
    }, 'createMaterial(basic) must not throw');
  });

  runner.test(`${label}createMaterial('phong') - does not throw`, () => {
    Assert.doesNotThrow(() => {
      adapter.createMaterial('phong', { color: 0x00ff00 });
    }, 'createMaterial(phong) must not throw');
  });

  runner.test(`${label}createMaterial('standard') - does not throw`, () => {
    Assert.doesNotThrow(() => {
      adapter.createMaterial('standard', { roughness: 0.5, metalness: 0.5 });
    }, 'createMaterial(standard) must not throw');
  });

  runner.test(`${label}createMaterial - returns a non-null value`, () => {
    const mat = adapter.createMaterial('basic', {});
    Assert.isNotNull(mat, 'createMaterial must return a non-null handle');
    Assert.isDefined(mat, 'createMaterial must return a defined value');
  });

  // --- Geometry creation ---

  runner.test(`${label}createPlaneGeometry - does not throw`, () => {
    Assert.doesNotThrow(() => {
      adapter.createPlaneGeometry(2, 2, 1, 1);
    }, 'createPlaneGeometry must not throw');
  });

  runner.test(`${label}createPlaneGeometry - returns a non-null value`, () => {
    const geo = adapter.createPlaneGeometry(2, 2, 1, 1);
    Assert.isNotNull(geo, 'createPlaneGeometry must return a non-null value');
  });

  // --- Color creation ---

  runner.test(`${label}createColor - returns a non-null value`, () => {
    const color = adapter.createColor(1.0, 0.5, 0.0);
    Assert.isNotNull(color, 'createColor must return a non-null value');
    Assert.isDefined(color, 'createColor must return a defined value');
  });
}

// ---------------------------------------------------------------------------
// Top-level entry point — runs conformance against all known adapters
// ---------------------------------------------------------------------------

export async function runAdapterConformanceSuite() {
  const runner = new TestRunner();

  // --- Three.js adapter ---
  // Minimal mock gpu that satisfies getCameraPosition lookups
  const mockGpu = {
    camera: { position: { x: 0, y: 0, z: 0 } },
  };
  const threeAdapter = createThreeEngineAdapter({ getGpu: () => mockGpu });
  runAdapterConformanceTests(threeAdapter, runner, { name: 'Three.js' });

  // --- Unity bridge adapter ---
  const calls = [];
  const mockBridge = {
    call(method, payload) {
      calls.push({ method, payload });
      // Return an id for handle-producing calls
      return { id: `mock:${method}:${calls.length}` };
    },
    getCameraPosition() {
      return { x: 1, y: 2, z: 3 };
    },
    getCapabilities() {
      return [
        'material:basic',
        'material:phong',
        'material:standard',
        'texture:data',
        'texture:canvas',
        'geometry:plane',
        'camera:read',
      ];
    },
  };
  const unityAdapter = createUnityBridgeAdapter(mockBridge, {
    features: [
      'material:basic',
      'material:phong',
      'material:standard',
      'texture:data',
      'texture:canvas',
      'geometry:plane',
      'camera:read',
    ],
  });
  runAdapterConformanceTests(unityAdapter, runner, { name: 'Unity bridge' });

  // --- Command-buffer adapter wrapping the Unity adapter ---
  const cmdAdapter = createCommandBufferAdapter(unityAdapter);
  runAdapterConformanceTests(cmdAdapter, runner, { name: 'Command-buffer (Unity inner)' });

  // --- Babylon adapter (mock BABYLON namespace — no DOM/WebGL needed) ---
  const mockBABYLON = createMockBABYLON();
  const mockScene = createMockScene({ x: 3, y: 7, z: 2 });
  const babylonAdapter = createBabylonEngineAdapter(mockBABYLON, mockScene, {
    resolveMesh: () => null, // no mesh registry in unit tests
  });
  runAdapterConformanceTests(babylonAdapter, runner, { name: 'Babylon' });
  addBabylonSpecificTests(runner, babylonAdapter, mockBABYLON);

  // --- Command-buffer wrapping the Babylon adapter ---
  const babylonCmdAdapter = createCommandBufferAdapter(babylonAdapter);
  runAdapterConformanceTests(babylonCmdAdapter, runner, { name: 'Command-buffer (Babylon inner)' });

  // --- Command-buffer adapter behaviour tests ---

  runner.test('command-buffer - pendingCount starts at zero', () => {
    const fresh = createCommandBufferAdapter(threeAdapter);
    Assert.equals(fresh.pendingCount(), 0, 'pendingCount must be 0 before any calls');
  });

  runner.test('command-buffer - createMaterial queues one command', () => {
    const buf = createCommandBufferAdapter(threeAdapter);
    buf.createMaterial('basic', {});
    Assert.equals(buf.pendingCount(), 1, 'pendingCount must be 1 after one buffered call');
  });

  runner.test('command-buffer - flush() drains the queue', () => {
    const buf = createCommandBufferAdapter(threeAdapter);
    buf.createMaterial('basic', {});
    buf.createColor(1, 0, 0);
    Assert.equals(buf.pendingCount(), 2, 'pendingCount must be 2 before flush');
    buf.flush();
    Assert.equals(buf.pendingCount(), 0, 'pendingCount must be 0 after flush');
  });

  runner.test('command-buffer - discardPending() drops queue without executing', () => {
    const executedMethods = [];
    const trackingAdapter = {
      ...threeAdapter,
      createMaterial(...args) {
        executedMethods.push('createMaterial');
        return threeAdapter.createMaterial(...args);
      },
    };
    const buf = createCommandBufferAdapter(trackingAdapter);
    buf.createMaterial('basic', {});
    buf.discardPending();
    Assert.equals(buf.pendingCount(), 0, 'queue must be empty after discardPending');
    Assert.equals(executedMethods.length, 0, 'createMaterial must not have been called');
  });

  runner.test('command-buffer - autoFlush:true executes immediately', () => {
    const executed = [];
    const trackingAdapter = {
      ...threeAdapter,
      createMaterial(...args) {
        executed.push('createMaterial');
        return threeAdapter.createMaterial(...args);
      },
    };
    const buf = createCommandBufferAdapter(trackingAdapter, { autoFlush: true });
    buf.createMaterial('basic', {});
    Assert.equals(executed.length, 1, 'autoFlush must execute the call immediately');
    Assert.equals(buf.pendingCount(), 0, 'queue must be empty with autoFlush');
  });

  runner.test('command-buffer - getCameraPosition is read-through (not buffered)', () => {
    const buf = createCommandBufferAdapter(threeAdapter);
    buf.getCameraPosition();
    Assert.equals(buf.pendingCount(), 0, 'getCameraPosition must not enqueue a command');
  });

  runner.test('command-buffer - getCapabilities is read-through (not buffered)', () => {
    const buf = createCommandBufferAdapter(threeAdapter);
    buf.getCapabilities();
    Assert.equals(buf.pendingCount(), 0, 'getCapabilities must not enqueue a command');
  });

  runner.test('command-buffer - multiple calls accumulate in order', () => {
    const flushed = [];
    const trackingAdapter = {
      ...threeAdapter,
      createMaterial(...args) { flushed.push('createMaterial'); return {}; },
      createColor(...args) { flushed.push('createColor'); return {}; },
      createPlaneGeometry(...args) { flushed.push('createPlaneGeometry'); return {}; },
    };
    const buf = createCommandBufferAdapter(trackingAdapter);
    buf.createMaterial('basic', {});
    buf.createColor(1, 0, 0);
    buf.createPlaneGeometry(2, 2);
    buf.flush();
    Assert.equals(flushed[0], 'createMaterial', 'first flushed must be createMaterial');
    Assert.equals(flushed[1], 'createColor', 'second flushed must be createColor');
    Assert.equals(flushed[2], 'createPlaneGeometry', 'third flushed must be createPlaneGeometry');
  });

  runner.test('createCommandBufferAdapter - throws for invalid inner adapter', () => {
    Assert.throws(
      () => createCommandBufferAdapter(null),
      'must throw for null inner adapter'
    );
    Assert.throws(
      () => createCommandBufferAdapter('string'),
      'must throw for string inner adapter'
    );
  });

  return runner.runAll();

// ---------------------------------------------------------------------------
// Babylon-specific tests (run after conformance in the same suite)
// ---------------------------------------------------------------------------

function addBabylonSpecificTests(runner, babylonAdapter, mockBABYLON) {
  // Material type routing
  runner.test('[Babylon] createMaterial(standard) creates PBRMaterial', () => {
    const mat = babylonAdapter.createMaterial('standard', { roughness: 0.3, metalness: 0.8 });
    Assert.isTrue(mat instanceof mockBABYLON.PBRMaterial, 'standard must produce PBRMaterial');
    Assert.approximately(mat.roughness, 0.3, 0.001, 'roughness must be forwarded');
    Assert.approximately(mat.metallic, 0.8, 0.001, 'metalness must map to .metallic');
  });

  runner.test('[Babylon] createMaterial(phong) creates StandardMaterial', () => {
    const mat = babylonAdapter.createMaterial('phong', { color: 0xff0000 });
    Assert.isTrue(mat instanceof mockBABYLON.StandardMaterial, 'phong must produce StandardMaterial');
    Assert.isNotNull(mat.diffuseColor, 'diffuseColor must be set for phong');
    Assert.isFalse(mat.disableLighting, 'phong must have lighting enabled');
  });

  runner.test('[Babylon] createMaterial(basic) disables lighting', () => {
    const mat = babylonAdapter.createMaterial('basic', { color: 0x00ff00 });
    Assert.isTrue(mat instanceof mockBABYLON.StandardMaterial, 'basic must produce StandardMaterial');
    Assert.isTrue(mat.disableLighting, 'basic must disable lighting');
  });

  runner.test('[Babylon] createMaterial - double-sided sets backFaceCulling=false', () => {
    const mat = babylonAdapter.createMaterial('basic', { side: 'double' });
    Assert.isFalse(mat.backFaceCulling, 'double side must set backFaceCulling=false');
  });

  runner.test('[Babylon] createMaterial - transparent sets alpha', () => {
    const mat = babylonAdapter.createMaterial('phong', { transparent: true, opacity: 0.3 });
    Assert.approximately(mat.alpha, 0.3, 0.001, 'transparent+opacity must set material.alpha');
  });

  runner.test('[Babylon] createColor returns Color3 with correct values', () => {
    const c = babylonAdapter.createColor(0.5, 0.25, 0.75);
    Assert.isTrue(c instanceof mockBABYLON.Color3, 'createColor must return a Color3');
    Assert.approximately(c.r, 0.5, 0.001, 'r must match');
    Assert.approximately(c.g, 0.25, 0.001, 'g must match');
    Assert.approximately(c.b, 0.75, 0.001, 'b must match');
  });

  runner.test('[Babylon] createPlaneGeometry returns geometry descriptor', () => {
    const geo = babylonAdapter.createPlaneGeometry(4, 2, 2, 3);
    Assert.isTrue(geo.__babylonGeometry === true, 'must have __babylonGeometry flag');
    Assert.equals(geo.geometryType, 'plane', 'geometryType must be plane');
    Assert.equals(geo.width, 4, 'width must be forwarded');
    Assert.equals(geo.height, 2, 'height must be forwarded');
    Assert.equals(geo.subdivisionsX, 2, 'subdivisionsX must equal segX');
    Assert.equals(geo.subdivisionsY, 3, 'subdivisionsY must equal segY');
  });

  runner.test('[Babylon] createPlaneGeometry is frozen (opaque)', () => {
    const geo = babylonAdapter.createPlaneGeometry(1, 1);
    Assert.isTrue(Object.isFrozen(geo), 'geometry descriptor must be frozen');
  });

  runner.test('[Babylon] setTextureRepeat sets uScale, vScale, and wrap mode', () => {
    // Create a mock texture that has the Babylon-style properties
    const mockTex = new mockBABYLON.DynamicTexture('t');
    babylonAdapter.setTextureRepeat(mockTex, 3, 2);
    Assert.equals(mockTex.uScale, 3, 'uScale must be set');
    Assert.equals(mockTex.vScale, 2, 'vScale must be set');
    Assert.equals(mockTex.wrapU, mockBABYLON.Texture.WRAP_ADDRESSMODE, 'wrapU must be WRAP');
    Assert.equals(mockTex.wrapV, mockBABYLON.Texture.WRAP_ADDRESSMODE, 'wrapV must be WRAP');
  });

  runner.test('[Babylon] cloneTexture returns a cloned texture', () => {
    const original = new mockBABYLON.DynamicTexture('original');
    original.uScale = 5;
    const cloned = babylonAdapter.cloneTexture(original);
    Assert.isNotNull(cloned, 'cloned texture must not be null');
    Assert.notEquals(cloned, original, 'clone must be a different object');
    Assert.equals(cloned.uScale, 5, 'clone must copy uScale');
  });

  runner.test('[Babylon] getCameraPosition reads scene.activeCamera.position', () => {
    const pos = babylonAdapter.getCameraPosition();
    Assert.equals(pos.x, 3, 'x must read from activeCamera');
    Assert.equals(pos.y, 7, 'y must read from activeCamera');
    Assert.equals(pos.z, 2, 'z must read from activeCamera');
  });

  runner.test('[Babylon] getCapabilities declares babylon: features', () => {
    const caps = babylonAdapter.getCapabilities();
    Assert.isTrue(caps.supports('babylon:pbr'), 'must declare babylon:pbr');
    Assert.isTrue(caps.supports('babylon:dynamic-texture'), 'must declare babylon:dynamic-texture');
  });

  runner.test('[Babylon] createBabylonEngineAdapter throws for missing BABYLON', () => {
    Assert.throws(
      () => createBabylonEngineAdapter(null, createMockScene()),
      'must throw when BABYLON namespace is null'
    );
  });

  runner.test('[Babylon] createBabylonEngineAdapter throws for missing scene', () => {
    Assert.throws(
      () => createBabylonEngineAdapter(mockBABYLON, null),
      'must throw when scene is null'
    );
  });
}
}
