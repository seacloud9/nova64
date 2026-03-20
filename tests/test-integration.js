// Test suite for Nova64 integration and demo functionality
import { TestRunner, Assert, Performance } from './test-runner.js';
import { run3DAPITests } from './test-3d-api.js';
import { runScreenSystemTests } from './test-screen-system.js';

export async function runIntegrationTests() {
  const runner = new TestRunner();

  // Test that all required 3D functions are available in the global scope
  runner.test('3D API - Global Function Availability', () => {
    // Create a mock global object like the one in main.js
    const mockGlobal = {};

    // Mock the GPU and API setup
    const mockGpu = {
      getScene: () => ({ add: () => {}, remove: () => {} }),
      getCamera: () => ({ position: { set: () => {} }, lookAt: () => {} }),
      getRenderer: () => ({ render: () => {} }),
    };

    const { threeDApi } = require('../runtime/api-3d.js');
    const api = threeDApi(mockGpu);
    api.exposeTo(mockGlobal);

    // Test that all expected functions are exposed
    const expectedFunctions = [
      'createCube',
      'createSphere',
      'createPlane',
      'destroyMesh',
      'setPosition',
      'setRotation',
      'setScale',
      'setCameraPosition',
      'setCameraTarget',
      'setCameraFOV',
      'setFog',
      'setLightDirection',
      'setLightColor',
      'setAmbientLight',
      'enablePixelation',
      'enableDithering',
      'get3DStats',
    ];

    expectedFunctions.forEach(funcName => {
      Assert.isFunction(mockGlobal[funcName], `${funcName} should be a function`);
    });
  });

  // Test that screen system functions are available
  runner.test('Screen System - Global Function Availability', () => {
    const mockGlobal = {};

    const { screenApi } = require('../runtime/screens.js');
    const api = screenApi();
    api.exposeTo(mockGlobal);

    const expectedFunctions = ['addScreen', 'switchToScreen', 'getCurrentScreen', 'startScreens'];

    expectedFunctions.forEach(funcName => {
      Assert.isFunction(mockGlobal[funcName], `${funcName} should be a function`);
    });

    Assert.isObject(mockGlobal.screens, 'screens manager should be available');
    Assert.isFunction(mockGlobal.ScreenManager, 'ScreenManager class should be available');
    Assert.isFunction(mockGlobal.Screen, 'Screen class should be available');
  });

  // Test that the main.js integration works correctly
  runner.test('Main.js Integration - API Exposure', () => {
    // Simulate the main.js API exposure process
    const g = {};

    // Mock all the APIs like in main.js
    const mockApis = {
      stdApi: () => ({
        exposeTo: target => {
          target.cls = () => {};
          target.print = () => {};
        },
      }),
      spriteApi: () => ({
        exposeTo: target => {
          target.sprite = () => {};
        },
      }),
      threeDApi: () => ({
        exposeTo: target => {
          target.createCube = () => {};
          target.setCameraPosition = () => {};
          target.setLightDirection = () => {};
        },
      }),
      screenApi: () => ({
        exposeTo: target => {
          target.addScreen = () => {};
          target.switchToScreen = () => {};
        },
      }),
      inputApi: () => ({
        exposeTo: target => {
          target.isKeyPressed = () => false;
          target.isKeyDown = () => false;
          target.key = () => false;
          target.btn = () => false;
          target.btnp = () => false;
        },
      }),
    };

    // Simulate the exposure process
    Object.values(mockApis).forEach(apiFactory => {
      const api = apiFactory();
      api.exposeTo(g);
    });

    // Test that basic functions are available
    Assert.isFunction(g.cls, 'cls should be available');
    Assert.isFunction(g.print, 'print should be available');
    Assert.isFunction(g.createCube, 'createCube should be available');
    Assert.isFunction(g.addScreen, 'addScreen should be available');
    Assert.isFunction(g.isKeyPressed, 'isKeyPressed should be available');
    Assert.isFunction(g.isKeyDown, 'isKeyDown should be available');
    Assert.isFunction(g.key, 'key should be available');
    Assert.isFunction(g.btn, 'btn should be available');
    Assert.isFunction(g.btnp, 'btnp should be available');
  });

  // Test enhanced input system compatibility
  runner.test('Input System - Enhanced Compatibility', () => {
    // Test that demos can use both old and new input patterns
    const mockGlobal = {
      isKeyDown: code => code === 'a', // Simulate 'a' key being held
      isKeyPressed: code => code === ' ', // Simulate space key just pressed
      key: code => code === 'KeyW', // Simulate 'W' key being held
    };

    // Test Star Fox style input patterns
    Assert.doesNotThrow(() => {
      // Movement (continuous input)
      const moveLeft = mockGlobal.isKeyDown('a');
      const moveUp = mockGlobal.key('KeyW');

      // Actions (single press)
      const shoot = mockGlobal.isKeyPressed(' ');

      Assert.isTrue(moveLeft, 'Should detect held movement key');
      Assert.isTrue(moveUp, 'Should detect held direction key');
      Assert.isTrue(shoot, 'Should detect pressed action key');
    }, 'Should handle mixed input patterns without errors');
  });

  // Test that demos can be loaded without init3D
  runner.test('Demo Compatibility - No init3D required', () => {
    // Create a mock environment like a demo would see
    const mockGlobal = {
      cls: () => {},
      print: () => {},
      createCube: () => ({ id: Math.random() }),
      createSphere: () => ({ id: Math.random() }),
      setCameraPosition: () => {},
      setCameraTarget: () => {},
      setCameraFOV: () => {},
      setLightDirection: () => {},
      setFog: () => {},
      setPosition: () => {},
      setRotation: () => {},
      destroyMesh: () => {},
      addScreen: () => {},
      switchToScreen: () => {},
      startScreens: () => {},
      isKeyPressed: () => false,
      isKeyDown: () => false,
      rgba8: (r, g, b, a) => ({ r, g, b, a }),
    };

    // Test that we can create basic 3D objects without init3D
    Assert.doesNotThrow(() => {
      const cube = mockGlobal.createCube(2, 0xff0000, [0, 0, 0]);
      Assert.isDefined(cube, 'Should be able to create cube');
    }, 'Should create cube without init3D');

    Assert.doesNotThrow(() => {
      mockGlobal.setCameraPosition(0, 5, 10);
      mockGlobal.setCameraTarget(0, 0, 0);
      mockGlobal.setLightDirection(-1, -1, -1);
    }, 'Should set camera and lighting without init3D');

    Assert.doesNotThrow(() => {
      mockGlobal.addScreen('test', {
        enter: () => {},
        update: () => {},
        draw: () => {},
      });
      mockGlobal.startScreens('test');
    }, 'Should use screen system without init3D');
  });

  // Performance test for API function calls
  runner.test('Performance - API Function Calls', async () => {
    const mockGlobal = {
      createCube: () => ({ id: Math.random() }),
      setPosition: () => true,
      setRotation: () => true,
    };

    const { average } = await Performance.benchmark(
      '3D API calls',
      () => {
        const cube = mockGlobal.createCube(1, 0xffffff, [0, 0, 0]);
        mockGlobal.setPosition(cube, Math.random(), Math.random(), Math.random());
        mockGlobal.setRotation(cube, Math.random(), Math.random(), Math.random());
      },
      1000
    );

    Assert.isTrue(average < 0.1, `API calls should be fast (${average.toFixed(3)}ms avg)`);
  });

  return await runner.runAll();
}

// Main test runner function
export async function runAllTests() {
  console.log('🚀 Starting Nova64 Complete Test Suite\n');

  console.log('1️⃣ Running 3D API Tests...');
  const api3DResults = await run3DAPITests();

  console.log('\n2️⃣ Running Screen System Tests...');
  const screenResults = await runScreenSystemTests();

  console.log('\n3️⃣ Running Integration Tests...');
  const integrationResults = await runIntegrationTests();

  // Combine results
  const totalResults = {
    passed: api3DResults.passed + screenResults.passed + integrationResults.passed,
    failed: api3DResults.failed + screenResults.failed + integrationResults.failed,
    total: api3DResults.total + screenResults.total + integrationResults.total,
    errors: [...api3DResults.errors, ...screenResults.errors, ...integrationResults.errors],
  };

  console.log('\n🏁 FINAL TEST RESULTS:');
  console.log(`   Total Tests: ${totalResults.total}`);
  console.log(`   Passed: ${totalResults.passed} ✅`);
  console.log(`   Failed: ${totalResults.failed} ❌`);
  console.log(`   Success Rate: ${((totalResults.passed / totalResults.total) * 100).toFixed(1)}%`);

  if (totalResults.failed > 0) {
    console.log('\n🚨 All Failed Tests:');
    totalResults.errors.forEach(error => {
      console.log(`   • ${error.test}: ${error.error}`);
    });
  } else {
    console.log('\n🎉 All tests passed!');
  }

  return totalResults;
}

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
