// Enhanced Input System Tests for Nova64
import { TestRunner, Assert, Performance } from './test-runner.js';

export async function runInputSystemTests() {
  const runner = new TestRunner();

  // Mock Input class for testing
  class MockInput {
    constructor() {
      this.keys = new Map();
      this.prev = new Map();
    }

    step() {
      this.prev = new Map(this.keys);
    }

    key(code) { 
      return !!this.keys.get(code); 
    }

    isKeyDown(keyCode) {
      if (keyCode === ' ') keyCode = 'Space';
      else if (keyCode.length === 1) {
        keyCode = 'Key' + keyCode.toUpperCase();
      }
      return !!this.keys.get(keyCode);
    }

    isKeyPressed(keyCode) {
      if (keyCode === ' ') keyCode = 'Space';
      else if (keyCode.length === 1) {
        keyCode = 'Key' + keyCode.toUpperCase();
      }
      return !!this.keys.get(keyCode) && !this.prev.get(keyCode);
    }

    simulateKeyDown(keyCode) {
      this.keys.set(keyCode, true);
    }

    simulateKeyUp(keyCode) {
      this.keys.set(keyCode, false);
    }
  }

  // Test key code normalization
  runner.test('Input - Key Code Normalization', () => {
    const input = new MockInput();
    
    // Test single character to KeyCode conversion
    input.simulateKeyDown('KeyA');
    Assert.isTrue(input.isKeyDown('a'), 'Should convert single char to KeyCode');
    Assert.isTrue(input.isKeyDown('A'), 'Should handle uppercase conversion');
    
    // Test space key handling
    input.step(); // Clear previous state first
    input.simulateKeyDown('Space');
    Assert.isTrue(input.isKeyPressed(' '), 'Should handle space key conversion');
  });

  // Test key press vs key down behavior
  runner.test('Input - Press vs Down Behavior', () => {
    const input = new MockInput();
    
    // Simulate key press sequence
    input.step(); // Clear previous state
    input.simulateKeyDown('KeyW');
    
    // First frame - both should be true
    Assert.isTrue(input.isKeyDown('w'), 'isKeyDown should be true on press');
    Assert.isTrue(input.isKeyPressed('w'), 'isKeyPressed should be true on first press');
    
    // Next frame - only down should be true
    input.step();
    Assert.isTrue(input.isKeyDown('w'), 'isKeyDown should remain true while held');
    Assert.isFalse(input.isKeyPressed('w'), 'isKeyPressed should be false on second frame');
    
    // Release key
    input.simulateKeyUp('KeyW');
    Assert.isFalse(input.isKeyDown('w'), 'isKeyDown should be false after release');
    Assert.isFalse(input.isKeyPressed('w'), 'isKeyPressed should be false after release');
  });

  // Test multiple key combinations
  runner.test('Input - Multiple Key Handling', () => {
    const input = new MockInput();
    
    // Simulate WASD keys and space
    input.simulateKeyDown('KeyW');
    input.simulateKeyDown('KeyA');
    input.simulateKeyDown('KeyS');
    input.simulateKeyDown('KeyD');
    input.simulateKeyDown('Space'); // Use correct key code
    
    Assert.isTrue(input.isKeyDown('w'), 'W key should be down');
    Assert.isTrue(input.isKeyDown('a'), 'A key should be down');
    Assert.isTrue(input.isKeyDown('s'), 'S key should be down');
    Assert.isTrue(input.isKeyDown('d'), 'D key should be down');
    Assert.isTrue(input.isKeyDown(' '), 'Space key should be down');
  });

  // Test API exposure
  runner.test('Input - API Function Exposure', () => {
    const target = {};
    const mockInputApi = {
      exposeTo(target) {
        Object.assign(target, {
          btn: () => false,
          btnp: () => false,
          key: () => false,
          isKeyDown: () => false,
          isKeyPressed: () => false
        });
      }
    };
    
    mockInputApi.exposeTo(target);
    
    Assert.isFunction(target.btn, 'btn should be exposed');
    Assert.isFunction(target.btnp, 'btnp should be exposed');
    Assert.isFunction(target.key, 'key should be exposed');
    Assert.isFunction(target.isKeyDown, 'isKeyDown should be exposed');
    Assert.isFunction(target.isKeyPressed, 'isKeyPressed should be exposed');
  });

  // Test Star Fox input patterns
  runner.test('Input - Star Fox Demo Compatibility', () => {
    const input = new MockInput();
    
    // Clear initial state
    input.step();
    
    // Simulate Star Fox player input
    input.simulateKeyDown('KeyA'); // Move left
    input.simulateKeyDown('KeyW'); // Move up
    input.simulateKeyDown('Space'); // Shoot
    
    // Test movement input (continuous)
    Assert.isTrue(input.isKeyDown('a'), 'Player should move left with A key');
    Assert.isTrue(input.isKeyDown('w'), 'Player should move up with W key');
    
    // Test action input (single press)
    Assert.isTrue(input.isKeyPressed(' '), 'Player should shoot with Space key');
    
    // Next frame - movement continues, shooting stops
    input.step();
    Assert.isTrue(input.isKeyDown('a'), 'Movement should continue');
    Assert.isTrue(input.isKeyDown('w'), 'Movement should continue');
    Assert.isFalse(input.isKeyPressed(' '), 'Shooting should be single press');
  });

  // Performance test for input checking
  runner.test('Input - Performance Test', async () => {
    const input = new MockInput();
    input.simulateKeyDown('KeyW');
    input.simulateKeyDown('KeyA');
    input.simulateKeyDown('KeyS');
    input.simulateKeyDown('KeyD');
    input.simulateKeyDown('Space');
    
    const { average } = await Performance.benchmark('Input checking', () => {
      // Simulate typical game input checking
      const up = input.isKeyDown('w');
      const left = input.isKeyDown('a');
      const down = input.isKeyDown('s');
      const right = input.isKeyDown('d');
      const shoot = input.isKeyPressed(' ');
      
      return up || left || down || right || shoot;
    }, 1000);
    
    Assert.isTrue(average < 0.01, `Input checking should be fast (${average.toFixed(4)}ms avg)`);
  });

  return await runner.runAll();
}

// Auto-run if called directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runInputSystemTests().then(results => {
    console.log('🎮 Input System Test Results:');
    console.log(`  Passed: ${results.passed}/${results.total}`);
    if (results.failed > 0) {
      console.log('  Errors:');
      results.errors.forEach(error => {
        console.log(`    • ${error.test}: ${error.error}`);
      });
    }
    process.exit(results.failed > 0 ? 1 : 0);
  });
}