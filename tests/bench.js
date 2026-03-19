#!/usr/bin/env node
// tests/bench.js
// Nova64 Performance Benchmark Suite
// Usage: node tests/bench.js [--iterations=N] [--suite=material|instancing|mesh|all]
//
// Measures:
//   - Material cache hit vs miss cost
//   - Mesh creation throughput
//   - Instanced mesh setup vs individual mesh setup
//   - Destroy/cleanup overhead
//   - LOD object creation cost

import { performance } from 'perf_hooks';
import { threeDApi } from '../runtime/api-3d.js';
import { MockGPU } from './test-runner.js';

// --- CLI args ---
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    })
);
const ITERATIONS = parseInt(args.iterations ?? '1000', 10);
const SUITE = args.suite ?? 'all';

// --- Colour helpers ---
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// --- Core benchmark runner ---
function bench(label, fn, iterations = ITERATIONS) {
  // Warmup (10% of iterations, min 10)
  const warmup = Math.max(10, Math.floor(iterations * 0.1));
  for (let i = 0; i < warmup; i++) fn();

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }

  const total = times.reduce((a, b) => a + b, 0);
  const avg = total / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
  const opsPerSec = Math.round(1000 / avg);

  console.log(`  ${CYAN}${label}${RESET}`);
  console.log(
    `    avg ${YELLOW}${avg.toFixed(4)}ms${RESET}  min ${min.toFixed(4)}ms  max ${max.toFixed(4)}ms  p95 ${p95.toFixed(4)}ms  ${GREEN}${opsPerSec.toLocaleString()} ops/s${RESET}`
  );
  return { label, avg, min, max, p95, opsPerSec, total };
}

function header(title) {
  console.log(`\n${BOLD}=== ${title} ===${RESET}`);
}

function ratio(a, b) {
  const r = b.avg / a.avg;
  return r >= 1 ? `${YELLOW}${r.toFixed(1)}x slower${RESET}` : `${GREEN}${(1 / r).toFixed(1)}x faster${RESET}`;
}

// --- Build a fresh API instance ---
function buildApi() {
  const gpu = new MockGPU();
  const api = threeDApi(gpu);
  const g = {};
  api.exposeTo(g);
  return { g, gpu };
}

// =============================================================================
// Suite: Material caching
// =============================================================================
function suiteMaterial() {
  header('Material Caching');

  const { g } = buildApi();

  // Pre-create a cube so getCachedMaterial is already populated for the colour
  g.createCube(1, 0xff0000, [0, 0, 0]);

  const cached = bench('cache HIT  — same color/opts', () => {
    // Same colour → should retrieve from materialCache
    g.createCube(1, 0xff0000, [0, 0, 0]);
  });

  const miss = bench('cache MISS — unique color each time', () => {
    // Unique colour per call forces a new material allocation
    const c = Math.floor(Math.random() * 0xffffff);
    g.createCube(1, c, [0, 0, 0]);
  });

  console.log(`\n  Cache hit is ${ratio(miss, cached)} compared to cache miss`);
}

// =============================================================================
// Suite: Mesh creation throughput
// =============================================================================
function suiteMesh() {
  header('Mesh Creation Throughput');

  {
    const { g } = buildApi();
    bench('createCube', () => g.createCube(1, 0x0088ff, [0, 0, 0]));
  }
  {
    const { g } = buildApi();
    bench('createSphere', () => g.createSphere(1, 0x00ff88, [0, 0, 0]));
  }
  {
    const { g } = buildApi();
    bench('createPlane', () => g.createPlane(4, 4, 0x888888, [0, 0, 0]));
  }
  {
    const { g } = buildApi();
    bench('createCylinder', () => g.createCylinder(0.5, 2, 0x8800ff, [0, 0, 0]));
  }
}

// =============================================================================
// Suite: Instancing vs individual meshes
// =============================================================================
function suiteInstancing() {
  header('Instancing — Setup Cost Comparison');

  const COUNT = 1000;

  // Individual cubes
  const individual = bench(
    `${COUNT} individual createCube calls`,
    () => {
      const { g } = buildApi();
      for (let i = 0; i < COUNT; i++) {
        g.createCube(1, 0x0088ff, [i * 2, 0, 0]);
      }
    },
    Math.max(10, Math.floor(ITERATIONS / 20))
  );

  // InstancedMesh: create once + set transforms
  const instanced = bench(
    `1 createInstancedMesh(${COUNT}) + ${COUNT} setInstanceTransform`,
    () => {
      const { g } = buildApi();
      const id = g.createInstancedMesh('cube', COUNT, 0x0088ff);
      for (let i = 0; i < COUNT; i++) {
        g.setInstanceTransform(id, i, i * 2, 0, 0);
      }
      g.finalizeInstances(id);
    },
    Math.max(10, Math.floor(ITERATIONS / 20))
  );

  console.log(`\n  Instanced setup is ${ratio(individual, instanced)} vs ${COUNT} individual cubes`);

  header('Instancing — Per-Instance Transform Update');

  const UPDATE_COUNT = 500;
  let updateApi;
  let updateId;

  // Setup once outside the timed loop
  updateApi = buildApi();
  updateId = updateApi.g.createInstancedMesh('cube', UPDATE_COUNT, 0xffffff);
  for (let i = 0; i < UPDATE_COUNT; i++) {
    updateApi.g.setInstanceTransform(updateId, i, i, 0, 0);
  }
  updateApi.g.finalizeInstances(updateId);

  bench(`Update ${UPDATE_COUNT} instance transforms + finalizeInstances`, () => {
    for (let i = 0; i < UPDATE_COUNT; i++) {
      updateApi.g.setInstanceTransform(updateId, i, i, Math.sin(i * 0.1), 0);
    }
    updateApi.g.finalizeInstances(updateId);
  });
}

// =============================================================================
// Suite: Destruction / cleanup
// =============================================================================
function suiteCleanup() {
  header('Mesh Cleanup (destroyMesh)');

  let ids = [];
  const { g } = buildApi();

  // Pre-create a batch of meshes to destroy
  for (let i = 0; i < ITERATIONS; i++) {
    ids.push(g.createCube(1, 0xffffff, [i, 0, 0]));
  }

  let idx = 0;
  bench('destroyMesh', () => {
    if (idx < ids.length) {
      g.destroyMesh(ids[idx++]);
    }
  });
}

// =============================================================================
// Main
// =============================================================================
const suites = { material: suiteMaterial, mesh: suiteMesh, instancing: suiteInstancing, cleanup: suiteCleanup };

// Note: LOD benchmarking requires a real WebGL context (THREE.LOD builds real
// Mesh objects that need BufferGeometry). Run examples/instancing-demo in the
// browser and check DevTools Performance panel for LOD overhead.

console.log(`\n${BOLD}Nova64 Performance Benchmark Suite${RESET}`);
console.log(`Iterations: ${ITERATIONS} | Suite: ${SUITE}`);

const start = performance.now();

if (SUITE === 'all') {
  for (const fn of Object.values(suites)) fn();
} else if (suites[SUITE]) {
  suites[SUITE]();
} else {
  console.error(`Unknown suite "${SUITE}". Available: ${Object.keys(suites).join(', ')}`);
  process.exit(1);
}

const elapsed = ((performance.now() - start) / 1000).toFixed(2);
console.log(`\n${GREEN}Done in ${elapsed}s${RESET}\n`);
