#!/usr/bin/env node
// Nova64 Voxel Engine Tests
// Tests block registry, chunk storage, fluid simulation, world config, noise, terrain gen

import { voxelApi } from '../runtime/api-voxel.js';

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  async runAll() {
    console.log(`Running ${this.tests.length} tests...\n`);
    for (const t of this.tests) {
      try {
        await t.fn();
        console.log(`✅ ${t.name}`);
        this.results.push({ name: t.name, passed: true });
      } catch (e) {
        console.log(`❌ ${t.name}: ${e.message}`);
        this.results.push({ name: t.name, passed: false, error: e.message });
      }
    }
    const passed = this.results.filter(r => r.passed).length;
    console.log(`\n📊 Results: ${passed}/${this.results.length} passed`);
    return {
      total: this.results.length,
      passed,
      failed: this.results.length - passed,
      tests: this.results,
      errors: this.results.filter(r => !r.passed).map(r => ({ test: r.name, error: r.error })),
    };
  }
}

function assert(cond, msg = 'Assertion failed') {
  if (!cond) throw new Error(msg);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'Not equal'}: expected ${b}, got ${a}`);
}
function assertThrows(fn, msg) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error(msg || 'Expected to throw');
}

// Minimal GPU mock — the voxel API only uses gpu.scene.add/remove
function createMockGPU() {
  const meshes = new Set();
  return {
    scene: {
      add(mesh) { meshes.add(mesh); },
      remove(mesh) { meshes.delete(mesh); },
    },
    _meshes: meshes,
  };
}

export async function runVoxelTests() {
  const runner = new TestRunner();

  // ──────────────────────────────────────────────────────────────────────
  // Block Registry Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - BLOCK_TYPES has expected constants', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    const BT = api.BLOCK_TYPES;
    assertEqual(BT.AIR, 0, 'AIR');
    assertEqual(BT.GRASS, 1, 'GRASS');
    assertEqual(BT.DIRT, 2, 'DIRT');
    assertEqual(BT.STONE, 3, 'STONE');
    assertEqual(BT.WATER, 5, 'WATER');
    assertEqual(BT.LAVA, 23, 'LAVA');
    assertEqual(BT.OBSIDIAN, 24, 'OBSIDIAN');
    assertEqual(BT.BEDROCK, 14, 'BEDROCK');
    assert(Object.keys(BT).length >= 25, 'Should have at least 25 block types');
  });

  runner.test('Voxel - Block registry isSolid/isFluid/isTransparent', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    // WATER and LAVA should be fluid in the registry
    assert(api.registry.isFluid(api.BLOCK_TYPES.WATER), 'WATER should be fluid');
    assert(api.registry.isFluid(api.BLOCK_TYPES.LAVA), 'LAVA should be fluid');
    assert(!api.registry.isFluid(api.BLOCK_TYPES.STONE), 'STONE should not be fluid');
    assert(api.registry.isSolid(api.BLOCK_TYPES.STONE), 'STONE should be solid');
    assert(!api.registry.isSolid(api.BLOCK_TYPES.AIR), 'AIR should not be solid');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Block Get/Set Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - setBlock/getBlock round-trip', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    api.configureWorld({ enableCaves: false, enableOres: false, enableTrees: false });

    api.setBlock(5, 80, 5, api.BLOCK_TYPES.STONE);
    assertEqual(api.getBlock(5, 80, 5), api.BLOCK_TYPES.STONE, 'Should read back STONE');

    api.setBlock(5, 80, 5, api.BLOCK_TYPES.DIRT);
    assertEqual(api.getBlock(5, 80, 5), api.BLOCK_TYPES.DIRT, 'Should read back DIRT');
  });

  runner.test('Voxel - getBlock returns AIR for out-of-bounds Y', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    assertEqual(api.getBlock(0, -1, 0), api.BLOCK_TYPES.AIR, 'Y < 0 should be AIR');
    assertEqual(api.getBlock(0, 128, 0), api.BLOCK_TYPES.AIR, 'Y >= 128 should be AIR');
    assertEqual(api.getBlock(0, 200, 0), api.BLOCK_TYPES.AIR, 'Y far above should be AIR');
  });

  runner.test('Voxel - setBlock on out-of-bounds Y does nothing', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    // Should not throw
    api.setBlock(0, -1, 0, api.BLOCK_TYPES.STONE);
    api.setBlock(0, 128, 0, api.BLOCK_TYPES.STONE);
    assertEqual(api.getBlock(0, -1, 0), api.BLOCK_TYPES.AIR, 'Out of bounds write ignored');
  });

  runner.test('Voxel - Blocks span across chunk boundaries', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // Place blocks in different chunks (chunkSize = 16)
    api.setBlock(0, 60, 0, api.BLOCK_TYPES.STONE);   // chunk (0,0)
    api.setBlock(16, 60, 0, api.BLOCK_TYPES.DIRT);    // chunk (1,0)
    api.setBlock(-1, 60, 0, api.BLOCK_TYPES.SAND);    // chunk (-1,0)
    api.setBlock(0, 60, 16, api.BLOCK_TYPES.BRICK);   // chunk (0,1)

    assertEqual(api.getBlock(0, 60, 0), api.BLOCK_TYPES.STONE, 'Chunk (0,0)');
    assertEqual(api.getBlock(16, 60, 0), api.BLOCK_TYPES.DIRT, 'Chunk (1,0)');
    assertEqual(api.getBlock(-1, 60, 0), api.BLOCK_TYPES.SAND, 'Chunk (-1,0)');
    assertEqual(api.getBlock(0, 60, 16), api.BLOCK_TYPES.BRICK, 'Chunk (0,1)');
  });

  // ──────────────────────────────────────────────────────────────────────
  // World Configuration Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - configureWorld sets options', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.configureWorld({
      renderDistance: 2,
      enableAO: false,
      enableLighting: false,
      enableCaves: false,
      enableFluids: false,
    });

    const config = api.getWorldConfig();
    assertEqual(config.renderDistance, 2, 'renderDistance');
    assertEqual(config.enableAO, false, 'enableAO');
    assertEqual(config.enableLighting, false, 'enableLighting');
    assertEqual(config.enableCaves, false, 'enableCaves');
    assertEqual(config.enableFluids, false, 'enableFluids');
  });

  runner.test('Voxel - getWorldConfig returns chunk stats', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const config = api.getWorldConfig();
    assert(typeof config.chunkSize === 'number', 'chunkSize present');
    assert(typeof config.chunkHeight === 'number', 'chunkHeight present');
    assert(typeof config.chunkCount === 'number', 'chunkCount present');
    assert(typeof config.meshCount === 'number', 'meshCount present');
    assert(typeof config.seaLevel === 'number', 'seaLevel present');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Terrain Generation Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - Terrain generates bedrock at Y=0', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // Force terrain generation by reading a block
    const block = api.getBlock(0, 0, 0);
    assertEqual(block, api.BLOCK_TYPES.BEDROCK, 'Y=0 should always be bedrock');
  });

  runner.test('Voxel - Terrain has solid ground and air above', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // Stone is always at low Y levels
    const stone = api.getBlock(0, 5, 0);
    assert(stone !== api.BLOCK_TYPES.AIR, 'Y=5 should have solid block');

    // High up should be air
    const air = api.getBlock(0, 127, 0);
    assertEqual(air, api.BLOCK_TYPES.AIR, 'Y=127 should be air');
  });

  runner.test('Voxel - getHighestBlock returns valid height', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const h = api.getHighestBlock(0, 0);
    assert(h >= 1 && h < 128, `Highest block should be in range, got ${h}`);
  });

  runner.test('Voxel - Custom terrain generator is used', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    let called = false;

    api.configureWorld({
      generateTerrain: (chunk, ctx) => {
        called = true;
        // Fill with stone at Y=0 only
        for (let x = 0; x < ctx.CHUNK_SIZE; x++) {
          for (let z = 0; z < ctx.CHUNK_SIZE; z++) {
            chunk.setBlock(x, 0, z, ctx.BLOCK_TYPES.STONE);
          }
        }
      },
    });

    api.resetWorld();
    // Trigger generation by reading a block in a new chunk
    api.getBlock(100, 0, 100);
    assert(called, 'Custom terrain generator should be called');
    assertEqual(api.getBlock(100, 0, 100), api.BLOCK_TYPES.STONE, 'Custom gen should produce stone');
    assertEqual(api.getBlock(100, 1, 100), api.BLOCK_TYPES.AIR, 'Custom gen only fills Y=0');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Noise Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - simplexNoise2D returns values in range', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    for (let i = 0; i < 100; i++) {
      const val = api.noise.fbm2D(i * 0.1, i * 0.2);
      assert(typeof val === 'number' && !isNaN(val), `Noise value should be a number at ${i}`);
      assert(val >= -2 && val <= 2, `Noise value ${val} should be in reasonable range`);
    }
  });

  runner.test('Voxel - simplexNoise3D returns values in range', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    for (let i = 0; i < 50; i++) {
      const val = api.noise.fbm3D(i * 0.1, i * 0.2, i * 0.3);
      assert(typeof val === 'number' && !isNaN(val), `3D noise should be a number at ${i}`);
    }
  });

  runner.test('Voxel - Noise is deterministic with same seed', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    api.configureWorld({ seed: 12345 });
    const v1 = api.noise.fbm2D(10, 20);

    api.configureWorld({ seed: 12345 });
    const v2 = api.noise.fbm2D(10, 20);
    assertEqual(v1, v2, 'Same seed should produce same noise');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Raycast Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - raycastBlock hits placed block', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    api.configureWorld({ enableCaves: false, enableOres: false, enableTrees: false });

    api.setBlock(5, 80, 5, api.BLOCK_TYPES.STONE);
    const result = api.raycastBlock([5.5, 85, 5.5], [0, -1, 0], 10);
    assert(result.hit, 'Should hit the stone block');
    assertEqual(result.blockType, api.BLOCK_TYPES.STONE, 'Should identify as stone');
  });

  runner.test('Voxel - raycastBlock misses when no block', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const result = api.raycastBlock([0.5, 127, 0.5], [0, 1, 0], 5);
    assert(!result.hit, 'Should miss when aiming up from high altitude');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Collision Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - checkCollision detects solid blocks', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // Place a stone block and check collision at that position
    api.setBlock(50, 80, 50, api.BLOCK_TYPES.STONE);
    // checkCollision(pos, size) — size is a radius number
    const collision = api.checkCollision([50, 80, 50], 0.3);
    assert(collision, 'Should detect collision with stone block');
  });

  runner.test('Voxel - checkCollision does not detect in open air', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const collision = api.checkCollision([0, 120, 0], 0.3);
    assert(!collision, 'Should not collide in open air at Y=120');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Physics / Entity Movement Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - moveEntity resolves collisions', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // Place a stone platform
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        api.setBlock(x, 60, z, api.BLOCK_TYPES.STONE);
      }
    }

    // Drop entity from above
    const result = api.moveEntity([0, 65, 0], [0, -10, 0], [0.6, 1.8, 0.6], 1.0);
    assert(result.position[1] > 60, 'Entity should land above platform');
    assert(result.grounded || result.velocity[1] > -10, 'Entity velocity should be resolved');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Fluid Simulation Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - setFluidSource places water with level 7', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.setFluidSource(10, 80, 10, 'water');
    assertEqual(api.getBlock(10, 80, 10), api.BLOCK_TYPES.WATER, 'Should place water block');
    assertEqual(api.getFluidLevel(10, 80, 10), 7, 'Source should have level 7');
  });

  runner.test('Voxel - setFluidSource places lava with level 7', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.setFluidSource(10, 80, 10, 'lava');
    assertEqual(api.getBlock(10, 80, 10), api.BLOCK_TYPES.LAVA, 'Should place lava block');
    assertEqual(api.getFluidLevel(10, 80, 10), 7, 'Source should have level 7');
  });

  runner.test('Voxel - removeFluidSource clears block and level', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.setFluidSource(10, 80, 10);
    api.removeFluidSource(10, 80, 10);
    assertEqual(api.getBlock(10, 80, 10), api.BLOCK_TYPES.AIR, 'Block should be air');
    assertEqual(api.getFluidLevel(10, 80, 10), 0, 'Fluid level should be 0');
  });

  runner.test('Voxel - removeFluidSource no-ops on non-fluid blocks', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.setBlock(10, 80, 10, api.BLOCK_TYPES.STONE);
    api.removeFluidSource(10, 80, 10);
    assertEqual(api.getBlock(10, 80, 10), api.BLOCK_TYPES.STONE, 'Stone should remain');
  });

  runner.test('Voxel - getFluidLevel returns 0 for non-fluid positions', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    assertEqual(api.getFluidLevel(200, 80, 200), 0, 'Empty position should have level 0');
  });

  runner.test('Voxel - enableFluids toggle via configureWorld', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.configureWorld({ enableFluids: false });
    assertEqual(api.getWorldConfig().enableFluids, false, 'Should disable fluids');

    api.configureWorld({ enableFluids: true });
    assertEqual(api.getWorldConfig().enableFluids, true, 'Should enable fluids');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Entity System Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - spawnEntity returns entity with id', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    // spawnEntity(type, pos, opts)
    const ent = api.spawnEntity('test', [0, 64, 0]);
    assert(ent !== null && ent !== undefined, 'Should return entity');
    assert(typeof ent.id === 'number', 'Entity should have numeric id');
    assertEqual(ent.type, 'test', 'Entity type');
  });

  runner.test('Voxel - getEntity retrieves by id', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const ent = api.spawnEntity('npc', [5, 64, 5]);
    const found = api.getEntity(ent.id);
    assert(found !== null, 'Should find entity by id');
    assertEqual(found.type, 'npc', 'Type should match');
  });

  runner.test('Voxel - removeEntity cleans up', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const ent = api.spawnEntity('mob', [0, 64, 0]);
    api.removeEntity(ent.id);
    const found = api.getEntity(ent.id);
    assert(!found, 'Entity should be removed');
  });

  runner.test('Voxel - getEntityCount tracks entities', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const initial = api.getEntityCount();
    api.spawnEntity('a', [0, 64, 0]);
    api.spawnEntity('b', [5, 64, 5]);
    assertEqual(api.getEntityCount(), initial + 2, 'Should count 2 new entities');
  });

  runner.test('Voxel - damageEntity reduces health', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const ent = api.spawnEntity('mob', [0, 64, 0], { health: 100 });
    api.damageEntity(ent.id, 30);
    const updated = api.getEntity(ent.id);
    assertEqual(updated.health, 70, 'Health should be reduced');
  });

  runner.test('Voxel - healEntity increases health', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const ent = api.spawnEntity('mob', [0, 64, 0], { health: 100 });
    api.damageEntity(ent.id, 40);
    assertEqual(api.getEntity(ent.id).health, 60, 'Pre-heal check');
    api.healEntity(ent.id, 25);
    const updated = api.getEntity(ent.id);
    assertEqual(updated.health, 85, 'Health should increase');
  });

  runner.test('Voxel - getEntitiesInRadius finds nearby', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.spawnEntity('near', [1, 64, 1]);
    api.spawnEntity('far', [100, 64, 100]);
    const nearby = api.getEntitiesInRadius(0, 64, 0, 10);
    assert(nearby.length >= 1, 'Should find at least 1 nearby entity');
    assert(nearby.some(e => e.type === 'near'), 'Should include nearby entity');
    assert(!nearby.some(e => e.type === 'far'), 'Should not include far entity');
  });

  runner.test('Voxel - getEntitiesByType filters correctly', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.spawnEntity('sheep', [0, 64, 0]);
    api.spawnEntity('cow', [5, 64, 5]);
    api.spawnEntity('sheep', [10, 64, 10]);
    const sheep = api.getEntitiesByType('sheep');
    assertEqual(sheep.length, 2, 'Should find 2 sheep');
  });

  // ──────────────────────────────────────────────────────────────────────
  // World Reset Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - resetWorld clears all state', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.setBlock(5, 80, 5, api.BLOCK_TYPES.STONE);
    api.spawnEntity('test', [0, 64, 0]);
    api.resetWorld();

    assertEqual(api.getEntityCount(), 0, 'Entities should be cleared');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Biome Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - getBiome returns a string', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    const biome = api.getBiome(0, 0);
    assert(typeof biome === 'string', 'Biome should be a string');
    assert(biome.length > 0, 'Biome should not be empty');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Block Registration Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - registerBlock adds custom block type', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);

    api.registry.register(100, {
      name: 'custom_block',
      solid: true,
      transparent: false,
      color: 0xff00ff,
    });

    api.setBlock(0, 80, 0, 100);
    assertEqual(api.getBlock(0, 80, 0), 100, 'Should store custom block');
  });

  // ──────────────────────────────────────────────────────────────────────
  // API Exposure Tests
  // ──────────────────────────────────────────────────────────────────────

  runner.test('Voxel - exposeTo sets all global functions', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    const globals = {};
    api.exposeTo(globals);

    const expectedGlobals = [
      'BLOCK_TYPES',
      'updateVoxelWorld',
      'forceLoadVoxelChunks',
      'getVoxelBlock',
      'setVoxelBlock',
      'raycastVoxelBlock',
      'checkVoxelCollision',
      'checkVoxelFluid',
      'moveVoxelEntity',
      'placeVoxelTree',
      'resetVoxelWorld',
      'configureVoxelWorld',
      'getVoxelConfig',
      'getVoxelHighestBlock',
      'getVoxelBiome',
      'getVoxelLightLevel',
      'setVoxelDayTime',
      'saveVoxelWorld',
      'loadVoxelWorld',
      'listVoxelWorlds',
      'deleteVoxelWorld',
      'registerVoxelBlock',
      'enableVoxelTextures',
      'loadVoxelTextureAtlas',
      'spawnVoxelEntity',
      'removeVoxelEntity',
      'getVoxelEntity',
      'damageVoxelEntity',
      'healVoxelEntity',
      'updateVoxelEntities',
      'getVoxelEntitiesInRadius',
      'getVoxelEntitiesByType',
      'getVoxelEntityCount',
      'cleanupVoxelEntities',
      'simplexNoise2D',
      'simplexNoise3D',
      'setVoxelFluidSource',
      'removeVoxelFluidSource',
      'getVoxelFluidLevel',
    ];

    for (const name of expectedGlobals) {
      assert(name in globals, `Global ${name} should be exposed`);
    }
  });

  runner.test('Voxel - exposed globals are functions (except BLOCK_TYPES)', () => {
    const gpu = createMockGPU();
    const api = voxelApi(gpu);
    const globals = {};
    api.exposeTo(globals);

    assert(typeof globals.BLOCK_TYPES === 'object', 'BLOCK_TYPES should be an object');
    assert(typeof globals.updateVoxelWorld === 'function', 'updateVoxelWorld should be a function');
    assert(typeof globals.setVoxelBlock === 'function', 'setVoxelBlock should be a function');
    assert(typeof globals.setVoxelFluidSource === 'function', 'setVoxelFluidSource should be a function');
    assert(typeof globals.getVoxelFluidLevel === 'function', 'getVoxelFluidLevel should be a function');
  });

  return await runner.runAll();
}

// Run if called directly
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('test-voxel.js');

if (isDirectRun) {
  runVoxelTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
