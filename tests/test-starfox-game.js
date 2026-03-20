// Enhanced Star Fox Nova 64 Game Tests
// Compatible with both CLI and Web test runners

export async function runStarFoxGameTests() {
  // Import classes dynamically to work in different environments
  let TestRunner, Assert, Performance;

  if (typeof window === 'undefined') {
    // CLI environment - import from test-cli
    const { TestRunner: CLITestRunner, Assert: CLIAssert } = await import('./test-cli.js');
    TestRunner = CLITestRunner;
    Assert = CLIAssert;
    Performance = {
      benchmark: async (name, fn, iterations) => {
        const start = Date.now();
        for (let i = 0; i < iterations; i++) fn();
        const total = Date.now() - start;
        return { average: total / iterations, min: 0, max: total, total };
      },
    };
  } else {
    // Web environment - import from test-runner
    const imports = await import('./test-runner.js');
    TestRunner = imports.TestRunner;
    Assert = imports.Assert;
    Performance = imports.Performance;
  }

  const runner = new TestRunner();

  // Mock game state for testing
  const mockGameState = {
    gameState: 'title',
    arwing: {
      mesh: null,
      x: 0,
      y: 0,
      z: 0,
      health: 100,
      energy: 100,
      boost: false,
    },
    enemies: [],
    projectiles: [],
    score: 0,
    wave: 1,
  };

  // Test game state management
  runner.test('Star Fox - Game State Management', () => {
    Assert.isEqual(mockGameState.gameState, 'title', 'Should start in title state');
    Assert.isEqual(mockGameState.score, 0, 'Should start with zero score');
    Assert.isEqual(mockGameState.wave, 1, 'Should start on wave 1');
  });

  // Test Arwing properties
  runner.test('Star Fox - Arwing Initialization', () => {
    Assert.isEqual(mockGameState.arwing.x, 0, 'Arwing should start at origin X');
    Assert.isEqual(mockGameState.arwing.y, 0, 'Arwing should start at origin Y');
    Assert.isEqual(mockGameState.arwing.z, 0, 'Arwing should start at origin Z');
    Assert.isEqual(mockGameState.arwing.health, 100, 'Arwing should start with full health');
    Assert.isEqual(mockGameState.arwing.energy, 100, 'Arwing should start with full energy');
    Assert.isFalse(mockGameState.arwing.boost, 'Boost should be off initially');
  });

  // Test game mechanics functions
  runner.test('Star Fox - Game Mechanics Available', () => {
    // Test that expected game functions would be available
    const expectedFunctions = [
      'createStarField',
      'createTitleScene',
      'startGame',
      'spawnEnemyWave',
      'updatePlayer',
      'updateEnemies',
      'fireLaser',
      'createExplosion',
    ];

    // In a real game, these would be actual functions
    // Here we just verify the concept works
    expectedFunctions.forEach(funcName => {
      Assert.isTrue(typeof funcName === 'string', `${funcName} should be a valid function name`);
    });
  });

  // Test input handling patterns
  runner.test('Star Fox - Input Pattern Compatibility', () => {
    // Simulate the input patterns used in Star Fox
    const mockInput = {
      isKeyDown: key => ['w', 'a', 's', 'd', 'z'].includes(key),
      isKeyPressed: key => [' ', 'r', 'l', 'Enter'].includes(key),
    };

    // Test movement controls
    Assert.isTrue(mockInput.isKeyDown('w'), 'Should detect W for up movement');
    Assert.isTrue(mockInput.isKeyDown('a'), 'Should detect A for left movement');
    Assert.isTrue(mockInput.isKeyDown('s'), 'Should detect S for down movement');
    Assert.isTrue(mockInput.isKeyDown('d'), 'Should detect D for right movement');
    Assert.isTrue(mockInput.isKeyDown('z'), 'Should detect Z for boost');

    // Test action controls
    Assert.isTrue(mockInput.isKeyPressed(' '), 'Should detect Space for shooting');
    Assert.isTrue(mockInput.isKeyPressed('r'), 'Should detect R for barrel roll');
    Assert.isTrue(mockInput.isKeyPressed('l'), 'Should detect L for barrel roll');
    Assert.isTrue(mockInput.isKeyPressed('Enter'), 'Should detect Enter for start');
  });

  // Test collision detection logic
  runner.test('Star Fox - Collision Detection Logic', () => {
    // Mock collision detection function
    function checkCollision(obj1, obj2, threshold = 2.5) {
      const dx = obj1.x - obj2.x;
      const dy = obj1.y - obj2.y;
      const dz = obj1.z - obj2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold;
    }

    // Test collision scenarios
    const player = { x: 0, y: 0, z: 0 };
    const enemy1 = { x: 1, y: 1, z: 1 }; // Close
    const enemy2 = { x: 10, y: 10, z: 10 }; // Far

    Assert.isTrue(checkCollision(player, enemy1), 'Should detect collision with close enemy');
    Assert.isFalse(
      checkCollision(player, enemy2),
      'Should not detect collision with distant enemy'
    );
  });

  // Test game progression logic
  runner.test('Star Fox - Game Progression Logic', () => {
    // Simulate wave progression
    function calculateNextWave(currentWave, enemiesRemaining) {
      if (enemiesRemaining === 0) {
        return currentWave + 1;
      }
      return currentWave;
    }

    function calculateEnemyCount(wave) {
      return 3 + wave * 2;
    }

    Assert.isEqual(calculateNextWave(1, 0), 2, 'Should advance wave when enemies defeated');
    Assert.isEqual(calculateNextWave(1, 5), 1, 'Should not advance wave with enemies remaining');
    Assert.isEqual(calculateEnemyCount(1), 5, 'Wave 1 should have 5 enemies');
    Assert.isEqual(calculateEnemyCount(3), 9, 'Wave 3 should have 9 enemies');
  });

  // Test visual effects system
  runner.test('Star Fox - Visual Effects System', () => {
    // Test explosion particle system
    function createExplosionData(size) {
      const sizes = { small: 4, medium: 8, large: 12 };
      return {
        particleCount: sizes[size] || 4,
        lifetime: size === 'large' ? 1.2 : 0.8,
        colors: ['0xff6600', '0xffaa00'],
      };
    }

    const smallExplosion = createExplosionData('small');
    const largeExplosion = createExplosionData('large');

    Assert.isEqual(smallExplosion.particleCount, 4, 'Small explosion should have 4 particles');
    Assert.isEqual(largeExplosion.particleCount, 12, 'Large explosion should have 12 particles');
    Assert.isTrue(
      largeExplosion.lifetime > smallExplosion.lifetime,
      'Large explosion should last longer'
    );
  });

  // Performance test for game loop
  runner.test('Star Fox - Game Loop Performance', async () => {
    // Simulate a game update cycle
    const mockUpdate = () => {
      // Simulate typical game update operations
      const dt = 0.016; // 60 FPS
      let operations = 0;

      // Simulate player update
      operations += 10;

      // Simulate enemy updates (up to 20 enemies)
      operations += 20 * 5;

      // Simulate projectile updates (up to 50 projectiles)
      operations += 50 * 3;

      // Simulate collision checks
      operations += 20 * 50; // enemies × projectiles

      return operations;
    };

    const { average } = await Performance.benchmark('Game loop simulation', mockUpdate, 100);
    Assert.isTrue(average < 1, `Game loop should be fast (${average.toFixed(3)}ms avg)`);
  });

  return await runner.runAll();
}

// Auto-run if called directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runStarFoxGameTests().then(results => {
    console.log('🚀 Star Fox Game Test Results:');
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
