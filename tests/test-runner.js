// tests/test-runner.js
// Comprehensive unit testing system for Nova64 3D Fantasy Console

export class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: [],
    };
  }

  // Add a test case
  test(name, testFunction) {
    this.tests.push({ name, testFunction });
    return this;
  }

  // Run all tests
  async runAll() {
    console.log('🧪 Starting Nova64 Test Suite...\n');

    this.results = { passed: 0, failed: 0, total: 0, errors: [] };

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printResults();
    return this.results;
  }

  // Run a single test
  async runTest(test) {
    this.results.total++;

    try {
      console.log(`🔍 Testing: ${test.name}`);
      await test.testFunction();
      console.log(`✅ PASS: ${test.name}\n`);
      this.results.passed++;
    } catch (error) {
      console.error(`❌ FAIL: ${test.name}`);
      console.error(`   Error: ${error.message}\n`);
      this.results.failed++;
      this.results.errors.push({
        test: test.name,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Print final results
  printResults() {
    console.log('📊 Test Results:');
    console.log(`   Total: ${this.results.total}`);
    console.log(`   Passed: ${this.results.passed} ✅`);
    console.log(`   Failed: ${this.results.failed} ❌`);
    console.log(
      `   Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`
    );

    if (this.results.failed > 0) {
      console.log('\n🚨 Failed Tests:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }
  }
}

// Assertion helpers
export class Assert {
  static equals(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
    }
  }

  static notEquals(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message} Expected not to equal: ${expected}`);
    }
  }

  static isTrue(value, message = '') {
    if (value !== true) {
      throw new Error(`${message} Expected true, got: ${value}`);
    }
  }

  static isFalse(value, message = '') {
    if (value !== false) {
      throw new Error(`${message} Expected false, got: ${value}`);
    }
  }

  static isNull(value, message = '') {
    if (value !== null) {
      throw new Error(`${message} Expected null, got: ${value}`);
    }
  }

  static isNotNull(value, message = '') {
    if (value === null) {
      throw new Error(`${message} Expected not null`);
    }
  }

  static isUndefined(value, message = '') {
    if (value !== undefined) {
      throw new Error(`${message} Expected undefined, got: ${value}`);
    }
  }

  static isDefined(value, message = '') {
    if (value === undefined) {
      throw new Error(`${message} Expected defined value`);
    }
  }

  static isArray(value, message = '') {
    if (!Array.isArray(value)) {
      throw new Error(`${message} Expected array, got: ${typeof value}`);
    }
  }

  static isObject(value, message = '') {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`${message} Expected object, got: ${typeof value}`);
    }
  }

  static isNumber(value, message = '') {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${message} Expected number, got: ${typeof value}`);
    }
  }

  static isString(value, message = '') {
    if (typeof value !== 'string') {
      throw new Error(`${message} Expected string, got: ${typeof value}`);
    }
  }

  static isFunction(value, message = '') {
    if (typeof value !== 'function') {
      throw new Error(`${message} Expected function, got: ${typeof value}`);
    }
  }

  static throws(fn, message = '') {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(`${message} Expected function to throw`);
    }
  }

  static doesNotThrow(fn, message = '') {
    try {
      fn();
    } catch (e) {
      throw new Error(`${message} Expected function not to throw: ${e.message}`);
    }
  }

  static approximately(actual, expected, tolerance = 0.001, message = '') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error(
        `${message} Expected ${actual} to be approximately ${expected} (tolerance: ${tolerance})`
      );
    }
  }

  static arrayEquals(actual, expected, message = '') {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      throw new Error(`${message} Both values must be arrays`);
    }
    if (actual.length !== expected.length) {
      throw new Error(`${message} Array lengths differ: ${actual.length} vs ${expected.length}`);
    }
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new Error(`${message} Arrays differ at index ${i}: ${actual[i]} vs ${expected[i]}`);
      }
    }
  }
}

// Performance testing utilities
export class Performance {
  static async time(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    console.log(`⏱️  ${name}: ${duration.toFixed(3)}ms`);
    return { result, duration };
  }

  static async benchmark(name, fn, iterations = 1000) {
    const times = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const total = times.reduce((a, b) => a + b, 0);
    const average = total / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`🏃 Benchmark: ${name}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Average: ${average.toFixed(3)}ms`);
    console.log(`   Min: ${min.toFixed(3)}ms`);
    console.log(`   Max: ${max.toFixed(3)}ms`);
    console.log(`   Total: ${total.toFixed(3)}ms`);

    return { average, min, max, total, times };
  }
}

// Mock GPU for testing
export class MockGPU {
  constructor() {
    this.scene = {
      children: [],
      add: mesh => {
        this.scene.children.push(mesh);
        this.meshes.set(mesh.id || this.meshes.size, mesh);
      },
      remove: mesh => {
        const index = this.scene.children.indexOf(mesh);
        if (index > -1) this.scene.children.splice(index, 1);
      },
    };
    this.camera = { position: { set: () => {} }, lookAt: () => {} };
    this.renderer = { render: () => {}, setSize: () => {} };
    this.meshes = new Map();
  }

  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }
  getRenderer() {
    return this.renderer;
  }

  createBoxGeometry(w, h, d) {
    return {
      type: 'BoxGeometry',
      width: w,
      height: h,
      depth: d,
      dispose: () => {},
    };
  }

  createSphereGeometry(radius, segments) {
    return {
      type: 'SphereGeometry',
      radius,
      segments,
      dispose: () => {},
    };
  }

  createPlaneGeometry(w, h) {
    return {
      type: 'PlaneGeometry',
      width: w,
      height: h,
      dispose: () => {},
    };
  }

  createN64Material(options) {
    return {
      type: 'N64Material',
      ...options,
      dispose: () => {},
    };
  }

  setCameraPosition() {}
  setCameraTarget() {}
  setCameraFOV() {}
  setFog() {}
  setLightDirection() {}
  setLightColor() {}
  setAmbientLight() {}
  enablePixelation() {}
  enableDithering() {}
  enableBloom() {}
  enableMotionBlur() {}

  getStats() {
    return {
      meshes: this.meshes.size,
      renderer: 'MockGPU',
      render: { triangles: 0, calls: 0 },
    };
  }
}
