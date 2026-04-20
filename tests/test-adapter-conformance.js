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
 *
 * @param {object} adapter   — adapter to validate
 * @param {TestRunner} runner — test runner to register tests on
 * @param {{ name: string }} opts
 */
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
}
