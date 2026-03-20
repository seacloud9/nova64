// tests/test-suite.js
// Nova64 Comprehensive Test Suite

import { TestRunner, Assert, Performance, MockGPU } from './test-runner.js';
import { run3DAPITests } from './test-3d-api.js';
import { runGPUTests } from './test-gpu-threejs.js';

export class Nova64TestSuite {
  constructor() {
    this.runner = new TestRunner();
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      performance: {},
    };
  }

  async runAllTests() {
    console.log('🚀 Nova64 Fantasy Console - Comprehensive Test Suite');
    console.log('==================================================');

    const startTime = Date.now();

    try {
      // Run 3D API tests
      console.log('\n📦 Testing 3D API...');
      const apiResults = await run3DAPITests();
      this.mergeResults('3D API', apiResults);

      // Run GPU backend tests
      console.log('\n🖥️  Testing GPU Backend...');
      const gpuResults = await runGPUTests();
      this.mergeResults('GPU Backend', gpuResults);

      // Run integration tests
      console.log('\n🔗 Running Integration Tests...');
      await this.runIntegrationTests();

      // Run performance benchmarks
      console.log('\n⚡ Running Performance Benchmarks...');
      await this.runPerformanceBenchmarks();

      // Run stress tests
      console.log('\n💪 Running Stress Tests...');
      await this.runStressTests();
    } catch (error) {
      console.error('❌ Test suite error:', error);
      this.results.errors.push(error.message);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Print final results
    this.printFinalResults(duration);

    return this.results;
  }

  async runIntegrationTests() {
    const runner = new TestRunner();

    // Test 3D API + GPU integration
    runner.test('Integration - 3D API with GPU Backend', async () => {
      const mockGPU = new MockGPU();

      Assert.doesNotThrow(() => {
        // Test that 3D API can work with GPU backend
        const scene = mockGPU.createScene();
        const camera = mockGPU.createCamera();
        const renderer = mockGPU.createRenderer();

        Assert.isObject(scene, 'Scene should be created');
        Assert.isObject(camera, 'Camera should be created');
        Assert.isObject(renderer, 'Renderer should be created');
      }, 'Should integrate 3D API with GPU backend');
    });

    runner.test('Integration - Multiple Mesh Creation', () => {
      const mockGPU = new MockGPU();
      const meshes = [];

      // Create multiple meshes
      for (let i = 0; i < 10; i++) {
        const mesh = mockGPU.createMesh({
          geometry: `geometry_${i}`,
          material: `material_${i}`,
        });
        meshes.push(mesh);
      }

      Assert.equals(meshes.length, 10, 'Should create 10 meshes');
      meshes.forEach((mesh, i) => {
        Assert.isObject(mesh, `Mesh ${i} should be object`);
      });
    });

    runner.test('Integration - Scene Management', () => {
      const mockGPU = new MockGPU();
      const scene = mockGPU.createScene();

      // Add objects to scene
      for (let i = 0; i < 5; i++) {
        const mesh = mockGPU.createMesh({
          geometry: `cube_${i}`,
          material: `material_${i}`,
        });
        mockGPU.addToScene(scene, mesh);
      }

      Assert.equals(mockGPU.getSceneChildren(scene).length, 5, 'Scene should have 5 children');
    });

    const results = await runner.runAll();
    this.mergeResults('Integration', results);
  }

  async runPerformanceBenchmarks() {
    console.log('  📊 Mesh Creation Performance...');
    const { average: meshAvg } = await Performance.benchmark(
      'Mesh Creation',
      () => {
        const mockGPU = new MockGPU();
        mockGPU.createMesh({ geometry: 'cube', material: 'basic' });
      },
      1000
    );

    console.log('  📊 Scene Operations Performance...');
    const { average: sceneAvg } = await Performance.benchmark(
      'Scene Operations',
      () => {
        const mockGPU = new MockGPU();
        const scene = mockGPU.createScene();
        const mesh = mockGPU.createMesh({ geometry: 'cube', material: 'basic' });
        mockGPU.addToScene(scene, mesh);
      },
      500
    );

    console.log('  📊 Transform Operations Performance...');
    const mockGPU = new MockGPU();
    const mesh = mockGPU.createMesh({ geometry: 'cube', material: 'basic' });
    const { average: transformAvg } = await Performance.benchmark(
      'Transform Operations',
      () => {
        mockGPU.setPosition(mesh, Math.random() * 10, Math.random() * 10, Math.random() * 10);
        mockGPU.setRotation(
          mesh,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        mockGPU.setScale(mesh, Math.random() + 0.5, Math.random() + 0.5, Math.random() + 0.5);
      },
      2000
    );

    this.results.performance = {
      meshCreation: meshAvg,
      sceneOperations: sceneAvg,
      transformOperations: transformAvg,
    };

    console.log(`    ✅ Mesh Creation: ${meshAvg.toFixed(3)}ms avg`);
    console.log(`    ✅ Scene Operations: ${sceneAvg.toFixed(3)}ms avg`);
    console.log(`    ✅ Transform Operations: ${transformAvg.toFixed(3)}ms avg`);
  }

  async runStressTests() {
    const runner = new TestRunner();

    runner.test('Stress - Create 1000 meshes', () => {
      const mockGPU = new MockGPU();
      const meshes = [];

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        meshes.push(
          mockGPU.createMesh({
            geometry: `cube_${i}`,
            material: 'basic',
          })
        );
      }
      const endTime = Date.now();

      Assert.equals(meshes.length, 1000, 'Should create 1000 meshes');
      Assert.isTrue(endTime - startTime < 1000, 'Should complete in under 1 second');
    });

    runner.test('Stress - 10000 transform operations', () => {
      const mockGPU = new MockGPU();
      const mesh = mockGPU.createMesh({ geometry: 'cube', material: 'basic' });

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        mockGPU.setPosition(mesh, i % 100, i % 50, i % 25);
      }
      const endTime = Date.now();

      Assert.isTrue(
        endTime - startTime < 1000,
        'Should complete 10000 transforms in under 1 second'
      );
    });

    runner.test('Stress - Memory pressure test', () => {
      const mockGPU = new MockGPU();
      const scenes = [];

      // Create and destroy many scenes
      for (let i = 0; i < 100; i++) {
        const scene = mockGPU.createScene();
        for (let j = 0; j < 10; j++) {
          const mesh = mockGPU.createMesh({ geometry: 'cube', material: 'basic' });
          mockGPU.addToScene(scene, mesh);
        }
        scenes.push(scene);
      }

      Assert.equals(scenes.length, 100, 'Should create 100 scenes with meshes');
    });

    const results = await runner.runAll();
    this.mergeResults('Stress Tests', results);
  }

  mergeResults(category, results) {
    console.log(`  ✅ ${category}: ${results.passed}/${results.total} tests passed`);

    this.results.total += results.total;
    this.results.passed += results.passed;
    this.results.failed += results.failed;

    if (results.errors.length > 0) {
      this.results.errors.push(`${category}: ${results.errors.join(', ')}`);
    }
  }

  printFinalResults(duration) {
    console.log('\n🏁 Final Test Results');
    console.log('=====================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${duration}ms`);

    if (this.results.performance.meshCreation) {
      console.log('\n📊 Performance Metrics:');
      console.log(`  Mesh Creation: ${this.results.performance.meshCreation.toFixed(3)}ms avg`);
      console.log(
        `  Scene Operations: ${this.results.performance.sceneOperations.toFixed(3)}ms avg`
      );
      console.log(
        `  Transform Operations: ${this.results.performance.transformOperations.toFixed(3)}ms avg`
      );
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }

    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    console.log(`\n📈 Pass Rate: ${passRate}%`);

    if (this.results.failed === 0) {
      console.log('🎉 All tests passed! Nova64 is ready for action!');
    } else {
      console.log('🔧 Some tests failed. Please review and fix issues.');
    }
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new Nova64TestSuite();
  await suite.runAllTests();
}
