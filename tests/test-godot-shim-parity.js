#!/usr/bin/env node
// Nova64 Godot-shim parity tests.
//
// nova64-godot/godot_project/shim/nova64-compat.js is a hand-maintained
// re-implementation of the cart-facing API for the Godot/QuickJS host. It has
// its own copy of the WAD geometry code, so it can silently drift away from
// runtime/wad.js — and when it does, the same cart renders a different level on
// the two hosts.
//
// That is exactly what happened: the shim still returned only the legacy
// `colSegs` point cloud long after runtime/wad.js grew a segment collider, so
// examples/wad-demo threw `cannot read property 'move' of undefined` every frame
// under Godot and the player could not move at all.
//
// These tests convert real FreeDoom maps through BOTH implementations and
// require identical results — the rendered walls, the collider, the sector floor
// heights and the reachability flood. If you change runtime/wad.js, re-port the
// shim until this passes again.

import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { wadApi } from '../runtime/wad.js';

const SCALE = 1 / 20;
const WAD_PATH = fileURLToPath(new URL('../examples/wad-demo/freedoom1.wad', import.meta.url));
const SHIM_PATH = fileURLToPath(
  new URL('../nova64-godot/godot_project/shim/nova64-compat.js', import.meta.url)
);
// Three maps rather than one: E1M1 is small and fully connected, E1M2/E1M3 have
// sealed-off areas, so they also pin down the reachability flood.
const MAPS = ['E1M1', 'E1M2', 'E1M3'];

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: Godot shim says ${actual}, expected ${expected}`);
  }
}

// ── Load the Godot shim ──
// The shim is an IIFE that expects the Godot host's globals. Only its pure WAD
// geometry and its host-call payloads are under test here, so the host surface
// is stubbed. When `calls` is supplied every engine.call is recorded, which is
// how the lighting tests inspect what the shim actually sends to Godot.
function loadShim(calls) {
  let nextHandle = 100;
  const sandbox = {
    print: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    engine: {
      call: (method, payload) => {
        if (calls) calls.push({ method, payload });
        // Hand back a fresh handle so the shim believes the object was created.
        return { handle: ++nextHandle };
      },
      getCapabilities: () => ({ backend: 'godot', features: [] }),
    },
  };
  // Give the sandbox the standard intrinsics the shim uses.
  for (const key of [
    'Math',
    'Object',
    'Array',
    'JSON',
    'Map',
    'Set',
    'Number',
    'String',
    'Boolean',
    'Infinity',
    'isNaN',
    'parseInt',
    'parseFloat',
    'Error',
    'TypeError',
    'Date',
    'Promise',
    'Symbol',
    'Proxy',
    'Reflect',
    'setTimeout',
    'Uint8Array',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'DataView',
    'ArrayBuffer',
  ]) {
    sandbox[key] = globalThis[key];
  }
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(SHIM_PATH, 'utf8'), sandbox, { filename: 'nova64-compat.js' });
  const data = sandbox.nova64 && sandbox.nova64.data;
  if (!data) throw new Error('the Godot shim did not install nova64.data');
  // Recording mode hands back the whole sandbox so tests can reach both
  // nova64.* and the engine object the shim augments.
  return calls ? sandbox : data;
}

// ── Lighting ──
// The web backend stores the vector passed to setDirectionalLight/
// setLightDirection as a THREE.DirectionalLight *position* and aims the light at
// the origin, so the light travels along -v. Godot orients a DirectionalLight3D
// by that travel direction. The shim used to pass the vector straight through as
// a direction, which flipped every directional light: exteriors got brighter and
// interiors — examples/wad-demo's DOOM levels — went black.
//
// Recover the direction Godot will actually light along from the Euler angles
// the shim sends, so the test pins the observable behaviour rather than the
// formula used to compute it.
function travelDirectionFrom(rotation) {
  const [pitch, yaw] = rotation;
  // Godot lights shine down their local -Z.
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}

function normalize(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

// The rotation the shim last sent for the directional light it created at init.
function lastLightRotation(calls) {
  const dirLight = calls.find(c => c.method === 'light.createDirectional');
  assert(dirLight, 'the shim never created a directional light');
  const transforms = calls.filter(
    c => c.method === 'transform.set' && c.payload && Array.isArray(c.payload.rotation)
  );
  assert(transforms.length > 0, 'the shim never oriented the directional light');
  return transforms[transforms.length - 1].payload.rotation;
}

function createRuntime() {
  const api = {};
  wadApi().exposeTo(api);
  return api;
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

// Walks a map the way examples/wad-demo does.
//
// The shim answers unknown namespace members with a no-op stub that returns a
// generic truthy object, so a *missing* buildReachability silently "succeeds"
// and reports every enemy as reachable. Insist on a real flood result.
function walkMap(api, converted, cell = 0.6) {
  const reach = api.buildReachability(converted.explorerCollider, converted.playerStart, {
    cell,
    floorAt: converted.getFloorHeight,
  });
  assert(
    reach && Number.isFinite(reach.cells) && typeof reach.isReachable === 'function',
    'buildReachability() returned a stub, not a real reachability flood'
  );
  return {
    cells: reach.cells,
    reached: converted.enemies.filter(e => reach.isReachable(e.x, e.z) === true).length,
  };
}

// A wall's full render signature: anything that differs here makes the level
// LOOK different on the two hosts, which is the thing we actually care about.
const wallSignature = w =>
  [
    w.x.toFixed(4),
    w.y.toFixed(4),
    w.z.toFixed(4),
    w.len.toFixed(4),
    w.h.toFixed(4),
    w.ang.toFixed(4),
    w.texName || '-',
    w.xoff || 0,
    w.yoff || 0,
    w.step ? 'step' : w.upper ? 'upper' : 'solid',
  ].join(',');

async function main() {
  const runner = new TestRunner();
  const runtime = createRuntime();

  let shim = null;
  runner.test('godot shim - installs nova64.data with the WAD physics API', () => {
    shim = loadShim();
    for (const fn of ['convertWADMap', 'buildReachability', 'createWallCollider', 'WADLoader']) {
      assert(typeof shim[fn] === 'function', `nova64.data.${fn} is missing from the Godot shim`);
    }
    // `typeof === 'function'` is not enough: the shim hands out named no-op
    // stubs for anything it does not implement. A real collider over a single
    // solid segment has to actually report that segment.
    const probe = shim.createWallCollider(
      [{ x1: -1, z1: 0, x2: 1, z2: 0, solid: true, oneSided: true, headroom: 8, step: 0 }],
      { scale: 1 / 20 }
    );
    assert(
      probe && Array.isArray(probe.lines) && probe.lines.length === 1,
      'createWallCollider() returned a stub, not a real collider'
    );
    assert(
      typeof probe.move === 'function' && typeof probe.blocked === 'function',
      'the collider is missing move()/blocked(), which examples/wad-demo calls every frame'
    );
  });

  runner.test('godot shim - convertWADMap returns a segment collider, not a point cloud', () => {
    const loader = loadFreeDoom(runtime);
    if (!loader) return console.log('   (skipped: examples/wad-demo/freedoom1.wad not present)');
    const converted = shim.convertWADMap(loader.getMap('E1M1'), SCALE);
    // The exact failure that made the cart unplayable under Godot.
    assert(converted.collider, 'convertWADMap() returned no `collider`');
    assert(converted.explorerCollider, 'convertWADMap() returned no `explorerCollider`');
    assert(
      typeof converted.collider.move === 'function',
      'collider.move() is missing — examples/wad-demo calls it every frame'
    );
    assert(
      typeof converted.getFloorHeight === 'function',
      'convertWADMap() returned no getFloorHeight()'
    );
    assert(
      converted.collider.lines.length > 100,
      'the collider has too few lines to be a real map'
    );
  });

  for (const name of MAPS) {
    runner.test(`godot shim - ${name} renders the same walls as the web runtime`, () => {
      const loader = loadFreeDoom(runtime);
      if (!loader) return console.log('   (skipped: freedoom1.wad not present)');
      const map = loader.getMap(name);
      const a = runtime.convertWADMap(map, SCALE);
      const b = shim.convertWADMap(map, SCALE);

      assertEqual(b.walls.length, a.walls.length, `${name} wall count`);
      assertEqual(b.sectors.length, a.sectors.length, `${name} sector count`);
      assertEqual(
        b.walls.filter(w => w.texName).length,
        a.walls.filter(w => w.texName).length,
        `${name} textured wall count`
      );

      // Same walls, same places, same textures — compared as sorted signatures
      // so wall ordering is not part of the contract.
      const sigA = a.walls.map(wallSignature).sort();
      const sigB = b.walls.map(wallSignature).sort();
      const firstDiff = sigA.findIndex((s, i) => s !== sigB[i]);
      assert(
        firstDiff === -1,
        `${name} wall geometry differs; first mismatch:\n` +
          `      runtime: ${sigA[firstDiff]}\n      shim:    ${sigB[firstDiff]}`
      );
    });

    runner.test(`godot shim - ${name} has the same collision and floor heights`, () => {
      const loader = loadFreeDoom(runtime);
      if (!loader) return console.log('   (skipped: freedoom1.wad not present)');
      const map = loader.getMap(name);
      const a = runtime.convertWADMap(map, SCALE);
      const b = shim.convertWADMap(map, SCALE);

      assertEqual(b.collider.lines.length, a.collider.lines.length, `${name} collider lines`);
      assertEqual(
        b.explorerCollider.lines.length,
        a.explorerCollider.lines.length,
        `${name} explorer collider lines`
      );
      assertEqual(
        +b.playerStart.x.toFixed(4),
        +a.playerStart.x.toFixed(4),
        `${name} player start x`
      );
      assertEqual(
        +b.playerStart.z.toFixed(4),
        +a.playerStart.z.toFixed(4),
        `${name} player start z`
      );
      assertEqual(
        +b.playerStart.floorH.toFixed(4),
        +a.playerStart.floorH.toFixed(4),
        `${name} player start floor height`
      );

      // Sample the floor across the map rather than trusting a single lookup.
      let sampled = 0;
      for (const e of a.enemies) {
        const fa = a.getFloorHeight(e.x, e.z, 0);
        const fb = b.getFloorHeight(e.x, e.z, 0);
        assertEqual(+fb.toFixed(4), +fa.toFixed(4), `${name} floor height at (${e.x}, ${e.z})`);
        sampled++;
      }
      assert(sampled > 0, `${name} has no enemies to sample floor heights at`);
    });

    runner.test(`godot shim - ${name} is walkable to exactly the same extent`, () => {
      const loader = loadFreeDoom(runtime);
      if (!loader) return console.log('   (skipped: freedoom1.wad not present)');
      const map = loader.getMap(name);
      const ra = walkMap(runtime, runtime.convertWADMap(map, SCALE));
      const rb = walkMap(shim, shim.convertWADMap(map, SCALE));
      assertEqual(rb.cells, ra.cells, `${name} reachable cells`);
      assertEqual(rb.reached, ra.reached, `${name} reachable enemies`);
      assert(ra.cells > 5000, `${name} reachability flood found a sealed room (${ra.cells} cells)`);
    });
  }

  // ── Lighting parity ──
  runner.test('godot shim - a directional light points the same way as three.js', () => {
    const calls = [];
    const ns = loadShim(calls).nova64;
    // Exactly what examples/wad-demo asks for in init().
    ns.light.setDirectionalLight([-1, -2, -1], 0xaabbdd, 0.8);

    const dir = travelDirectionFrom(lastLightRotation(calls));
    // three.js puts the light AT (-1,-2,-1) aiming at the origin, so the light
    // travels along +(1, 2, 1).
    const want = normalize(1, 2, 1);
    for (const axis of ['x', 'y', 'z']) {
      assert(
        Math.abs(dir[axis] - want[axis]) < 0.01,
        `directional light travels ${axis}=${dir[axis].toFixed(3)}, three.js lights ` +
          `${axis}=${want[axis].toFixed(3)} — the vector is a light position, not a direction`
      );
    }
    // The failure this guards: a light aimed straight down instead of up.
    assert(
      dir.y > 0,
      'the light is aimed downward; a DOOM interior lit from above leaves every wall black'
    );
  });

  runner.test('godot shim - setLightDirection uses three.js position semantics', () => {
    const calls = [];
    const ns = loadShim(calls).nova64;
    // A light sitting high above should shine DOWN (-y).
    ns.light.setLightDirection(0, 10, 0);
    const down = travelDirectionFrom(lastLightRotation(calls));
    assert(
      down.y < -0.99,
      `a light positioned above should shine downward, got y=${down.y.toFixed(3)}`
    );

    // ...and one below should shine UP.
    const calls2 = [];
    const ns2 = loadShim(calls2).nova64;
    ns2.light.setLightDirection(0, -10, 0);
    const up = travelDirectionFrom(lastLightRotation(calls2));
    assert(up.y > 0.99, `a light positioned below should shine upward, got y=${up.y.toFixed(3)}`);
  });

  runner.test('godot shim - the directional light keeps the cart colour and energy', () => {
    const calls = [];
    const ns = loadShim(calls).nova64;
    ns.light.setDirectionalLight([-1, -2, -1], 0xaabbdd, 0.8);

    const energy = calls.filter(c => c.method === 'light.setEnergy').pop();
    assert(energy, 'the shim never set the directional light energy');
    assert(
      Math.abs(energy.payload.energy - 0.8) < 1e-6,
      `light energy ${energy.payload.energy} should pass through as 0.8`
    );

    const color = calls.filter(c => c.method === 'light.setColor').pop();
    assert(color, 'the shim never set the directional light colour');
    const [r, g, b] = color.payload.color;
    assert(
      Math.abs(r - 0xaa / 255) < 0.01 &&
        Math.abs(g - 0xbb / 255) < 0.01 &&
        Math.abs(b - 0xdd / 255) < 0.01,
      `light colour ${[r, g, b].map(v => v.toFixed(2))} should match 0xaabbdd`
    );
  });

  // ── Material parity ──
  // Three.js's non-PBR material classes are not metallic/rough surfaces.
  // MeshBasicMaterial is unshaded; MeshLambert/MeshPhongMaterial are plain
  // diffuse. The shim used to drop createMaterial's first argument entirely and
  // run everything through StandardMaterial3D's PBR defaults, which rendered
  // examples/wad-demo's DOOM interiors at about a quarter of the web's
  // brightness.
  const lastMaterial = calls => {
    const m = calls.filter(c => c.method === 'material.create').pop();
    assert(m, 'the shim never created a material');
    return m.payload;
  };

  runner.test("godot shim - createMaterial('phong') is diffuse, not PBR", () => {
    const calls = [];
    const sb = loadShim(calls);
    // Exactly what examples/wad-demo builds each wall with.
    sb.engine.createMaterial('phong', {
      map: { handle: 7 },
      color: sb.engine.createColor(0.5, 0.5, 0.5),
      side: 'double',
    });
    const mat = lastMaterial(calls);
    assertEqual(mat.metallic, 0, "a 'phong' material's metallic");
    assertEqual(mat.roughness, 1, "a 'phong' material's roughness");
    assert(!mat.unshaded, "a 'phong' material is lit, so it must not be unshaded");
    assert(mat.doubleSided === true, "side:'double' should survive as doubleSided");
    assert(mat.albedoTexture === 7, 'the wall texture should reach the host as albedoTexture');
  });

  runner.test("godot shim - createMaterial('basic') is unshaded like MeshBasicMaterial", () => {
    const calls = [];
    const sb = loadShim(calls);
    sb.engine.createMaterial('basic', { color: 0x804020 });
    assert(
      lastMaterial(calls).unshaded === true,
      "'basic' maps to MeshBasicMaterial, which ignores lights"
    );
  });

  runner.test("godot shim - createMaterial('standard') keeps the PBR defaults", () => {
    // The regression guard for every other cart: 'standard'/'emissive' are the
    // overwhelmingly common kinds and must not move.
    const calls = [];
    const sb = loadShim(calls);
    sb.engine.createMaterial('standard', { color: 0x804020 });
    const mat = lastMaterial(calls);
    assertEqual(mat.metallic, 0.05, "a 'standard' material's metallic");
    assertEqual(mat.roughness, 0.6, "a 'standard' material's roughness");
    assert(!mat.unshaded, "a 'standard' material must stay lit");
  });

  runner.test('godot shim - an explicit metallic/roughness still wins', () => {
    const calls = [];
    const sb = loadShim(calls);
    sb.engine.createMaterial('phong', { color: 0xffffff, metallic: 0.9, roughness: 0.2 });
    const mat = lastMaterial(calls);
    assertEqual(mat.metallic, 0.9, 'explicit metallic');
    assertEqual(mat.roughness, 0.2, 'explicit roughness');
  });

  runner.test('godot shim - E1M1 is completable under the Godot host too', () => {
    const loader = loadFreeDoom(runtime);
    if (!loader) return console.log('   (skipped: freedoom1.wad not present)');
    const converted = shim.convertWADMap(loader.getMap('E1M1'), SCALE);
    const { reached } = walkMap(shim, converted);
    assertEqual(reached, converted.enemies.length, 'E1M1 reachable enemies under the Godot shim');
  });

  const results = await runner.runAll();
  if (results.failed > 0) {
    console.log(
      '\n⚠️  The Godot shim has drifted from runtime/wad.js. Re-port the WAD geometry\n' +
        '   into nova64-godot/godot_project/shim/nova64-compat.js until this passes.'
    );
  }
  return results;
}

const results = await main();
process.exit(results.failed > 0 ? 1 : 0);
