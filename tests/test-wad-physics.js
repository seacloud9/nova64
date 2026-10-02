#!/usr/bin/env node
// Nova64 WAD physics regression tests.
//
// These guard the two failures that made examples/wad-demo unplayable:
//
//   1. Collision was rasterized into a cloud of points and tested with an axis
//      distance check, which inflated every wall into a square ~3.6 units thick.
//      A standard 64-unit DOOM doorway is 3.2 units wide at this scale, so every
//      door was sealed: on E1M1 exactly 1 of 53 enemies could be reached, and the
//      level only clears once every enemy is dead.
//   2. The player floor height was read once from the spawn sector and never
//      updated, so stairs, ledges and pits were ignored and the camera walked
//      through raised geometry at the spawn height.
//
// The headline test walks the real FreeDoom WAD with the same collider and floor
// lookups the cart uses, and asserts the level is actually completable.

import { existsSync, readFileSync } from 'node:fs';
import { wadApi } from '../runtime/wad.js';

const SCALE = 1 / 20;
const WAD_PATH = new URL('../examples/wad-demo/freedoom1.wad', import.meta.url);
const CART_PATHS = [
  '../examples/wad-demo/code.js',
  '../dist/examples/wad-demo/code.js',
  '../nova64-godot/godot_project/carts/wad-demo/code.js',
  '../nova64-godot/tests/carts/wad-demo/code.js',
];

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

function assertClose(a, b, tol, msg) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg || 'Not close'}: expected ~${b}, got ${a}`);
}

function createWadRuntime() {
  const api = {};
  wadApi().exposeTo(api);
  return api;
}

function side(sector) {
  return { sector, middle: '-', upper: '-', lower: '-', xoff: 0, yoff: 0 };
}

// Two 256x256 rooms joined by a 64-unit doorway - the narrowest gap DOOM maps
// routinely use, and the exact geometry the old point-cloud collider sealed shut.
//
//   y=256  +---------------+---------------+
//          |               |               |
//          |    room A     D    room B     |     D = the 64-unit doorway
//          |               |               |
//   y=0    +---------------+---------------+
//          x=0           x=256           x=512
function createDoorwayMap() {
  return {
    vertexes: [
      { x: 0, y: 0 },
      { x: 256, y: 0 },
      { x: 256, y: 96 },
      { x: 256, y: 160 },
      { x: 256, y: 256 },
      { x: 0, y: 256 },
      { x: 512, y: 0 },
      { x: 512, y: 256 },
    ],
    sectors: [
      { floorH: 0, ceilH: 128, light: 200, floorFlat: 'FLOOR0', ceilFlat: 'CEIL0' },
      { floorH: 0, ceilH: 128, light: 200, floorFlat: 'FLOOR0', ceilFlat: 'CEIL0' },
    ],
    sidedefs: [
      side(0),
      side(0),
      side(0),
      side(0),
      side(0),
      side(0),
      side(1),
      side(1),
      side(1),
      side(1),
    ],
    linedefs: [
      // Room A outline. The shared x=256 wall is split so the doorway stays open.
      { v1: 0, v2: 1, right: 0, left: -1, flags: 0 },
      { v1: 1, v2: 2, right: 1, left: -1, flags: 0 },
      { v1: 3, v2: 4, right: 2, left: -1, flags: 0 },
      { v1: 4, v2: 5, right: 3, left: -1, flags: 0 },
      { v1: 5, v2: 0, right: 4, left: -1, flags: 0 },
      // The doorway itself: two-sided and passable.
      { v1: 2, v2: 3, right: 5, left: 6, flags: 4 },
      // Room B outline.
      { v1: 1, v2: 6, right: 7, left: -1, flags: 0 },
      { v1: 6, v2: 7, right: 8, left: -1, flags: 0 },
      { v1: 7, v2: 4, right: 9, left: -1, flags: 0 },
    ],
    things: [
      { type: 1, x: 128, y: 128, angle: 0 }, // player start, room A
      { type: 3004, x: 384, y: 128, angle: 0 }, // enemy, room B
    ],
  };
}

// Three 128-unit-deep bays in a row: floor 0, a 24-unit step the player can climb,
// then a 120-unit ledge they cannot.
function createStepMap() {
  return {
    vertexes: [
      { x: 0, y: 0 },
      { x: 128, y: 0 },
      { x: 128, y: 128 },
      { x: 0, y: 128 },
      { x: 256, y: 0 },
      { x: 256, y: 128 },
      { x: 384, y: 0 },
      { x: 384, y: 128 },
    ],
    sectors: [
      { floorH: 0, ceilH: 256, light: 200, floorFlat: 'F0', ceilFlat: 'C0' },
      { floorH: 24, ceilH: 256, light: 200, floorFlat: 'F1', ceilFlat: 'C1' },
      { floorH: 120, ceilH: 256, light: 200, floorFlat: 'F2', ceilFlat: 'C2' },
    ],
    sidedefs: [
      side(0),
      side(0),
      side(0),
      side(0),
      side(1),
      side(1),
      side(1),
      side(1),
      side(2),
      side(2),
      side(2),
      side(2),
    ],
    linedefs: [
      { v1: 0, v2: 1, right: 0, left: -1, flags: 0 },
      { v1: 2, v2: 3, right: 1, left: -1, flags: 0 },
      { v1: 3, v2: 0, right: 2, left: -1, flags: 0 },
      { v1: 1, v2: 2, right: 3, left: 4, flags: 4 }, // floor 0 -> the +24 step
      { v1: 1, v2: 4, right: 5, left: -1, flags: 0 },
      { v1: 5, v2: 2, right: 6, left: -1, flags: 0 },
      { v1: 4, v2: 5, right: 7, left: 8, flags: 4 }, // +24 -> the +120 ledge
      { v1: 4, v2: 6, right: 9, left: -1, flags: 0 },
      { v1: 6, v2: 7, right: 10, left: -1, flags: 0 },
      { v1: 7, v2: 5, right: 11, left: -1, flags: 0 },
    ],
    things: [{ type: 1, x: 64, y: 64, angle: 0 }],
  };
}

let cachedWad = null;
function loadFreeDoom(api) {
  if (cachedWad !== null) return cachedWad;
  if (!existsSync(WAD_PATH)) {
    cachedWad = false;
    return false;
  }
  const buf = readFileSync(WAD_PATH);
  const loader = new api.WADLoader();
  loader.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  cachedWad = loader;
  return loader;
}

// Walks a map the way the cart does: the explorer collider for movement, the
// sector lookup for floor height.
function walkMap(api, converted, cell = 0.6) {
  const reach = api.buildReachability(converted.explorerCollider, converted.playerStart, {
    cell,
    floorAt: converted.getFloorHeight,
  });
  const enemiesReached = converted.enemies.filter(e => reach.isReachable(e.x, e.z)).length;
  return { reach, enemiesReached, enemyTotal: converted.enemies.length };
}

export async function runWadPhysicsTests() {
  const runner = new TestRunner();
  const api = createWadRuntime();

  // ── Collision geometry ──

  runner.test('physics - a 64-unit doorway is passable', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const col = converted.explorerCollider;
    // The doorway spans y=96..160 in map units, so walking along the doorway
    // midline in x must never be blocked.
    const doorZ = converted.playerStart.z;
    let blocked = 0;
    for (let x = -5; x <= 5; x += 0.1) {
      if (col.blocked(x, doorZ)) blocked++;
    }
    assert(blocked === 0, `doorway midline should be clear, ${blocked} samples blocked`);
  });

  runner.test('physics - solid walls still block', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const col = converted.explorerCollider;
    // The shared x=256 wall runs z=1.6..6.4 and z=-6.4..-1.6 around the doorway.
    assert(col.blocked(0, 4), 'wall north of the doorway should block');
    assert(col.blocked(0, -4), 'wall south of the doorway should block');
    // So must the outer edge of the map.
    assert(col.blocked(-12.6, 0), 'west outer wall should block');
  });

  runner.test('physics - an enemy past a doorway is reachable', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const { enemiesReached, enemyTotal } = walkMap(api, converted);
    assert(enemyTotal === 1, `expected 1 enemy, got ${enemyTotal}`);
    assert(enemiesReached === 1, 'the enemy in the far room must be reachable');
  });

  runner.test('physics - sliding along a wall does not stick', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const col = converted.explorerCollider;
    // Push diagonally into the south wall: the blocked axis is dropped and the
    // free axis still moves. A collider that rejects the whole move leaves the
    // player glued to the wall.
    // Mid-room A, just clear of the south wall at z = -6.4. Keep away from x = 0,
    // which is the wall dividing the two rooms.
    const x = -5;
    const z = -5.5;
    const out = col.move(x, z, 0.3, -0.3, { floorY: 0 });
    assertClose(out.x, x + 0.3, 1e-6, 'should slide along the wall in x');
    assertClose(out.z, z, 1e-6, 'should not pass through the wall in z');
  });

  runner.test('physics - a wedged position is pushed back out', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const col = converted.explorerCollider;
    const inside = { x: -5, z: -6.2 }; // inside the south wall's 0.8-unit skin
    assert(col.blocked(inside.x, inside.z), 'test point should start inside a wall');
    const out = col.resolve(inside.x, inside.z);
    assert(out.pushed, 'resolve should report a push');
    assert(!col.blocked(out.x, out.z), 'resolve should land somewhere clear');
    // A corner wedges the actor against two walls at once, so resolve has to make
    // more than one pass to free it.
    const corner = col.resolve(-12.2, -6.2);
    assert(!col.blocked(corner.x, corner.z), 'resolve should free a corner too');
  });

  // ── Floor heights ──

  runner.test('physics - floor height tracks the sector under a point', () => {
    const converted = api.convertWADMap(createStepMap(), SCALE);
    const f = converted.getFloorHeight;
    // Heights are relative to the spawn sector, and 24/120 map units are 1.2/6.0
    // world units at 1/20 scale. The map spans x=0..384, centred on x=192.
    assertClose(f(-9.6 + 3.2, 0, null), 0, 1e-6, 'low sector');
    assertClose(f(-9.6 + 9.6, 0, null), 1.2, 1e-6, 'the +24 step');
    assertClose(f(-9.6 + 16, 0, null), 6.0, 1e-6, 'the +120 ledge');
  });

  runner.test('physics - a real map exposes many walkable floor heights', () => {
    // The original bug read one height at spawn and reused it forever, so this is
    // the property that must never silently collapse back to a single value.
    const loader = loadFreeDoom(api);
    if (!loader) {
      console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
      return;
    }
    const converted = api.convertWADMap(loader.getMap('E1M1'), SCALE);
    const { reach } = walkMap(api, converted, 1.0);
    const heights = new Set();
    const { minX, maxX, minZ, maxZ } = reach.bounds;
    for (let x = minX; x <= maxX; x += 2) {
      for (let z = minZ; z <= maxZ; z += 2) {
        if (!reach.isReachable(x, z, 1.0)) continue;
        const h = converted.getFloorHeight(x, z, null);
        if (h != null) heights.add(Math.round(h * 100) / 100);
      }
    }
    assert(heights.size >= 5, `E1M1 should expose many floor heights, saw ${heights.size}`);
  });

  runner.test('physics - ceiling lookup reports the sector above a point', () => {
    const converted = api.convertWADMap(createStepMap(), SCALE);
    // All three bays are 256 units tall, measured from the spawn sector floor.
    assertClose(converted.getCeilingHeight(-9.6 + 3.2, 0, null), 12.8, 1e-6, 'ceiling height');
  });

  // ── Step limits ──

  runner.test('physics - a 24-unit step can be climbed', () => {
    const converted = api.convertWADMap(createStepMap(), SCALE);
    // DOOM's own limit is exactly 24 units, so the accurate collider must allow it.
    const out = converted.collider.move(-9.6 + 6.2, 0, 0.3, 0, { floorY: 0 });
    assertClose(out.x, -9.6 + 6.5, 1e-6, 'a 24-unit step must be climbable');
  });

  runner.test('physics - a 120-unit ledge cannot be climbed', () => {
    const converted = api.convertWADMap(createStepMap(), SCALE);
    const startX = -9.6 + 12.6;
    const out = converted.collider.move(startX, 0, 0.3, 0, { floorY: 1.2 });
    assertClose(out.x, startX, 1e-6, 'a 120-unit ledge must not be walked up');
  });

  runner.test('physics - the explorer collider relaxes the step limit', () => {
    // The cart has no switches, doors or lifts, so a strict step limit would seal
    // off lift shafts and raised ledges for good.
    const converted = api.convertWADMap(createStepMap(), SCALE);
    assert(
      converted.explorerMaxStepHeight > converted.maxStepHeight,
      'explorer step height should exceed the DOOM-accurate one'
    );
    const startX = -9.6 + 12.6;
    const out = converted.explorerCollider.move(startX, 0, 0.3, 0, { floorY: 1.2 });
    assertClose(out.x, startX + 0.3, 1e-6, 'the explorer collider should allow the ledge');
  });

  // ── Reachability bookkeeping ──

  runner.test('physics - reachability never reports a blocked cell as reachable', () => {
    const converted = api.convertWADMap(createDoorwayMap(), SCALE);
    const { reach } = walkMap(api, converted);
    // A cell is only reachable if the collider actually stepped into it; marking
    // cells on sight made the result depend on traversal order.
    assert(!reach.isReachable(60, 60), 'a point outside the map must not be reachable');
    assert(
      reach.isReachable(converted.playerStart.x, converted.playerStart.z),
      'the spawn point must be reachable'
    );
  });

  // ── The headline regression: the demo has to be completable ──

  runner.test('physics - E1M1 is completable (every enemy reachable)', () => {
    const loader = loadFreeDoom(api);
    if (!loader) {
      console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
      return;
    }
    const converted = api.convertWADMap(loader.getMap('E1M1'), SCALE);
    const { enemiesReached, enemyTotal } = walkMap(api, converted);
    // Before the fix this was 1 of 53.
    assert(
      enemiesReached === enemyTotal,
      `E1M1 must be fully walkable: reached ${enemiesReached}/${enemyTotal} enemies`
    );
  });

  runner.test('physics - every FreeDoom map opens up from its spawn point', () => {
    const loader = loadFreeDoom(api);
    if (!loader) {
      console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
      return;
    }
    // A few FreeDoom maps start the player in a sealed teleporter closet, which
    // this cart cannot work; those are allowed to stay small. Everything else has
    // to open out into a real level.
    const tiny = [];
    for (const name of loader.getMapNames()) {
      const converted = api.convertWADMap(loader.getMap(name), SCALE);
      const { reach } = walkMap(api, converted);
      assert(reach.cells > 50, `${name}: only ${reach.cells} walkable cells from the spawn`);
      if (reach.cells < 10000) tiny.push(`${name}(${reach.cells})`);
    }
    // The old collider left 7 maps with a single walkable cell.
    assert(tiny.length <= 4, `too many near-sealed maps: ${tiny.join(', ')}`);
  });

  runner.test('physics - most FreeDoom enemies are reachable', () => {
    const loader = loadFreeDoom(api);
    if (!loader) {
      console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
      return;
    }
    let reached = 0;
    let total = 0;
    for (const name of loader.getMapNames()) {
      const converted = api.convertWADMap(loader.getMap(name), SCALE);
      const r = walkMap(api, converted);
      reached += r.enemiesReached;
      total += r.enemyTotal;
    }
    const pct = (100 * reached) / total;
    // The old collider reached 11% across the WAD. The remainder sits behind the
    // doors, switches and teleporters this cart does not simulate.
    assert(pct >= 70, `only ${pct.toFixed(1)}% of enemies reachable (${reached}/${total})`);
  });

  runner.test('physics - no map spawns the player inside a wall', () => {
    const loader = loadFreeDoom(api);
    if (!loader) {
      console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
      return;
    }
    for (const name of loader.getMapNames()) {
      const converted = api.convertWADMap(loader.getMap(name), SCALE);
      const { x, z } = converted.playerStart;
      const resolved = converted.explorerCollider.resolve(x, z);
      assert(
        !converted.explorerCollider.blocked(resolved.x, resolved.z),
        `${name}: player spawn is wedged in geometry`
      );
    }
  });

  // ── Cart wiring: the runtime fix only helps if the cart actually uses it ──

  runner.test('physics - wad-demo uses the segment collider, not a point cloud', () => {
    for (const rel of CART_PATHS) {
      const url = new URL(rel, import.meta.url);
      if (!existsSync(url)) continue;
      const src = readFileSync(url, 'utf8');
      assert(
        src.includes('levelGeom.collider.blocked('),
        `${rel}: collision must go through the WAD collider`
      );
      assert(
        !/for \(const seg of converted\.colSegs\)/.test(src),
        `${rel}: must not rebuild the rasterized colSegs point cloud`
      );
      assert(
        !/Math\.abs\(nx - w\.x\) < w\.r \+ radius/.test(src),
        `${rel}: the axis-distance point test must be gone`
      );
    }
  });

  runner.test('physics - wad-demo re-reads the floor height every frame', () => {
    for (const rel of CART_PATHS) {
      const url = new URL(rel, import.meta.url);
      if (!existsSync(url)) continue;
      const src = readFileSync(url, 'utf8');
      assert(
        src.includes('playerFloorTarget = floorAt(player.x, player.z, playerFloorTarget)'),
        `${rel}: the player floor must be resolved from their current position`
      );
      assert(
        src.includes('buildReachability('),
        `${rel}: unreachable actors must be filtered out so a level can be cleared`
      );
    }
  });

  return await runner.runAll();
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('test-wad-physics.js');

if (isDirectRun) {
  runWadPhysicsTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
