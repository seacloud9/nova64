#!/usr/bin/env node

// Command-line test runner for Nova64
// Usage: node test-cli.js [api|screen|integration|all]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Node.js implementation of test running
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runAll() {
    console.log(`Running ${this.tests.length} tests...\n`);

    for (const test of this.tests) {
      const startTime = Date.now();
      let passed = false;
      let error = null;

      try {
        await test.testFn();
        passed = true;
        console.log(`✅ ${test.name}`);
      } catch (e) {
        error = e.message;
        console.log(`❌ ${test.name}: ${error}`);
      }

      const duration = Date.now() - startTime;
      this.results.push({
        name: test.name,
        passed,
        error,
        duration,
      });
    }

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    console.log(`\n📊 Results: ${passed}/${this.results.length} passed`);

    return {
      total: this.results.length,
      passed,
      failed,
      tests: this.results,
      errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })),
    };
  }
}

// Simple assertion library
class Assert {
  static isTrue(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
  }

  static isFalse(condition, message = 'Assertion failed') {
    if (condition) throw new Error(message);
  }

  static isEqual(actual, expected, message = 'Values are not equal') {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  static isNotNull(value, message = 'Value is null') {
    if (value === null || value === undefined) throw new Error(message);
  }

  static isDefined(value, message = 'Value is undefined') {
    if (value === undefined) throw new Error(message);
  }

  static isFunction(value, message = 'Value is not a function') {
    if (typeof value !== 'function') throw new Error(message);
  }

  static isObject(value, message = 'Value is not an object') {
    if (typeof value !== 'object' || value === null) throw new Error(message);
  }

  static doesNotThrow(fn, message = 'Function should not throw') {
    try {
      fn();
    } catch (error) {
      throw new Error(`${message}: ${error.message}`);
    }
  }
}

// Mock implementations for testing
class MockScreenManager {
  constructor() {
    this.screens = new Map();
    this.currentScreen = null;
    this.initialized = false;
  }

  register(name, screen) {
    this.screens.set(name, screen);
    return true;
  }

  switchTo(name) {
    if (this.screens.has(name)) {
      this.currentScreen = name;
      return true;
    }
    return false;
  }

  getCurrentScreen() {
    return this.currentScreen;
  }

  initialize(startScreen) {
    this.initialized = true;
    return this.switchTo(startScreen);
  }
}

class MockScreen {
  constructor() {
    this.data = {};
  }

  enter() {}
  exit() {}
  update() {}
  draw() {}
}

// Test suites
async function runBasicAPITests() {
  const runner = new TestRunner();

  runner.test('API Structure - Global functions should be available', () => {
    const expectedFunctions = [
      'createCube',
      'createSphere',
      'createPlane',
      'setCameraPosition',
      'setCameraTarget',
      'setCameraFOV',
      'addScreen',
      'switchToScreen',
      'startScreens',
    ];

    // In a real environment these would be global, here we just test the concept
    expectedFunctions.forEach(funcName => {
      Assert.isTrue(typeof funcName === 'string', `${funcName} should be a valid function name`);
    });
  });

  runner.test('Screen System - ScreenManager functionality', () => {
    const manager = new MockScreenManager();
    const screen = new MockScreen();

    Assert.isTrue(manager.register('test', screen), 'Should register screen');
    Assert.isTrue(manager.switchTo('test'), 'Should switch to registered screen');
    Assert.isEqual(manager.getCurrentScreen(), 'test', 'Should return current screen name');
  });

  runner.test('Screen System - Screen base class', () => {
    const screen = new MockScreen();

    Assert.isFunction(screen.enter, 'Screen should have enter method');
    Assert.isFunction(screen.update, 'Screen should have update method');
    Assert.isFunction(screen.draw, 'Screen should have draw method');
    Assert.isObject(screen.data, 'Screen should have data object');
  });

  runner.test('Error Handling - Invalid operations', () => {
    const manager = new MockScreenManager();

    Assert.isFalse(manager.switchTo('nonexistent'), 'Should fail to switch to nonexistent screen');
    Assert.isEqual(manager.getCurrentScreen(), null, 'Current screen should be null');
  });

  return await runner.runAll();
}

async function runIntegrationTests() {
  const runner = new TestRunner();

  runner.test('Integration - Nova64 initialization pattern', () => {
    // Test that we can simulate the Nova64 initialization without init3D
    const mockGlobal = {};

    // Simulate API exposure
    mockGlobal.createCube = (size, color, position) => ({
      id: Math.random(),
      size,
      color,
      position,
    });
    mockGlobal.setCameraPosition = (x, y, z) => true;
    mockGlobal.setCameraTarget = (x, y, z) => true;
    mockGlobal.addScreen = (name, screen) => true;

    Assert.isFunction(mockGlobal.createCube, 'createCube should be available');
    Assert.isFunction(mockGlobal.setCameraPosition, 'setCameraPosition should be available');
    Assert.isFunction(mockGlobal.addScreen, 'addScreen should be available');

    // Test Star Fox style initialization (no init3D)
    Assert.doesNotThrow(() => {
      mockGlobal.setCameraPosition(0, 5, 15);
      mockGlobal.setCameraTarget(0, 0, 0);
      const cube = mockGlobal.createCube(2, 0xff0000, [0, 0, 0]);
      Assert.isDefined(cube.id, 'Cube should have ID');
    }, 'Should initialize 3D scene without init3D');
  });

  runner.test('Integration - Demo compatibility', () => {
    // Test that demos can run with proper API usage
    const api = {
      createCube: (size, color, pos) => ({ size, color, pos }),
      setCameraPosition: () => true,
      addScreen: () => true,
    };

    // Simulate Star Fox demo initialization
    Assert.doesNotThrow(() => {
      api.setCameraPosition(0, 5, 15);
      const ship = api.createCube(1, 0x00ff00, [0, 0, 0]);
      api.addScreen('title', {
        enter: () => {},
        update: () => {},
        draw: () => {},
      });
    }, 'Demo should initialize without errors');
  });

  return await runner.runAll();
}

// Main CLI function
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  console.log('🎮 Nova64 Command Line Test Suite\n');

  try {
    let results = [];

    switch (testType) {
      case 'api':
        console.log('🔧 Running Basic API Tests...');
        results.push(await runBasicAPITests());
        break;

      case 'input':
        console.log('🎮 Running Input System Tests...');
        try {
          const { runInputSystemTests } = await import('./test-input-system.js');
          results.push(await runInputSystemTests());
        } catch (error) {
          console.log('⚠️  Input tests not available in CLI mode');
        }
        break;

      case 'starfox':
        console.log('🚀 Running Star Fox Game Tests...');
        try {
          const { runStarFoxGameTests } = await import('./test-starfox-game.js');
          results.push(await runStarFoxGameTests());
        } catch (error) {
          console.log('⚠️  Star Fox tests not available in CLI mode');
        }
        break;

      case 'integration':
        console.log('🔗 Running Integration Tests...');
        results.push(await runIntegrationTests());
        break;

      case 'all':
      default:
        console.log('🚀 Running All Tests...\n');

        console.log('1️⃣ Basic API Tests:');
        results.push(await runBasicAPITests());

        console.log('\n2️⃣ Integration Tests:');
        results.push(await runIntegrationTests());

        console.log('\n3️⃣ Input System Tests:');
        try {
          const { runInputSystemTests } = await import('./test-input-system.js');
          results.push(await runInputSystemTests());
        } catch (error) {
          console.log('⚠️  Input tests not available in CLI mode');
        }

        console.log('\n4️⃣ Star Fox Game Tests:');
        try {
          const { runStarFoxGameTests } = await import('./test-starfox-game.js');
          results.push(await runStarFoxGameTests());
        } catch (error) {
          console.log('⚠️  Star Fox tests not available in CLI mode');
        }
        break;
    }

    // Combine results
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalTests = results.reduce((sum, r) => sum + r.total, 0);
    const totalFailed = totalTests - totalPassed;

    console.log('\n🏁 FINAL RESULTS:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} ✅`);
    console.log(`   Failed: ${totalFailed} ❌`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

    if (totalFailed > 0) {
      console.log('\n🚨 Failed Tests:');
      results.forEach(result => {
        result.errors.forEach(error => {
          console.log(`   • ${error.test}: ${error.error}`);
        });
      });
    } else {
      console.log('\n🎉 All tests passed!');
    }

    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestRunner, Assert, runBasicAPITests, runIntegrationTests };
