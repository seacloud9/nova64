#!/usr/bin/env node
// Nova64 WAD runtime tests

import { wadApi } from '../runtime/wad.js';

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

function side(sector) {
  return { sector, middle: '-', upper: '-', lower: '-', xoff: 0, yoff: 0 };
}

function createSteppedSectorMap(playerThing = { type: 1, x: 50, y: 50, angle: 90 }) {
  const things = [
    { type: 3004, x: 150, y: 50, angle: 0 },
    { type: 2011, x: 150, y: 50, angle: 0 },
  ];
  if (playerThing) things.unshift(playerThing);

  return {
    vertexes: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 100, y: 100 },
    ],
    sectors: [
      { floorH: 0, ceilH: 128, light: 255, floorFlat: 'F1', ceilFlat: 'C1' },
      { floorH: 40, ceilH: 128, light: 255, floorFlat: 'F2', ceilFlat: 'C2' },
    ],
    sidedefs: [side(0), side(0), side(0), side(0), side(1), side(1), side(1), side(1)],
    linedefs: [
      { v1: 0, v2: 1, right: 0, left: -1, flags: 0 },
      { v1: 1, v2: 2, right: 1, left: -1, flags: 0 },
      { v1: 2, v2: 3, right: 2, left: -1, flags: 0 },
      { v1: 3, v2: 0, right: 3, left: -1, flags: 0 },
      { v1: 4, v2: 5, right: 4, left: -1, flags: 0 },
      { v1: 5, v2: 6, right: 5, left: -1, flags: 0 },
      { v1: 6, v2: 7, right: 6, left: -1, flags: 0 },
      { v1: 7, v2: 4, right: 7, left: -1, flags: 0 },
    ],
    things,
  };
}

function createWadRuntime() {
  const api = {};
  wadApi().exposeTo(api);
  return api;
}

export async function runWadTests() {
  const runner = new TestRunner();

  runner.test('WAD - convertWADMap exposes getFloorHeight', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assert(typeof converted.getFloorHeight === 'function', 'getFloorHeight should be exposed');
  });

  runner.test('WAD - floor lookup follows stepped sector height', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assertEqual(converted.getFloorHeight(-2.5, 0, -99), 0, 'low sector floor');
    assertEqual(converted.getFloorHeight(2.5, 0, -99), 2, 'high sector floor');
  });

  runner.test('WAD - floor lookup returns fallback outside sectors', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assertEqual(converted.getFloorHeight(99, 99, -7), -7, 'outside sector fallback');
  });

  runner.test('WAD - player start floor resolves from containing sector', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assertEqual(converted.playerStart.floorH, 0, 'player start should use its containing floor');
  });

  runner.test('WAD - enemies and items inherit their containing sector floor', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assertEqual(converted.enemies[0].floorH, 2, 'enemy floor');
    assertEqual(converted.items[0].floorH, 2, 'item floor');
  });

  runner.test('WAD - sectors expose bounds for visual floor planes', () => {
    const api = createWadRuntime();
    const converted = api.convertWADMap(createSteppedSectorMap(), 1 / 20);

    assert(converted.sectors[0].bounds, 'low sector bounds should exist');
    assert(converted.sectors[1].bounds, 'high sector bounds should exist');
    assertEqual(converted.sectors[0].bounds.minX, -5, 'low sector minX');
    assertEqual(converted.sectors[1].bounds.maxX, 5, 'high sector maxX');
  });

  return await runner.runAll();
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-wad.js');

if (isDirectRun) {
  runWadTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
