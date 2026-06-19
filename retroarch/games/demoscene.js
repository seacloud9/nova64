// Nova64 Game Cart: TRON ODYSSEY (RetroArch Edition)
// 5-scene demoscene — automatic. Z skips to next scene.
// Designed as visual regression candidate vs the web version.
// Showcases: instanced meshes, torus, post-processing, bloom, camera choreography.

const SCENES = [
   { name: 'GRID AWAKENING', dur: 8  },
   { name: 'DATA TUNNEL',    dur: 10 },
   { name: 'DIGITAL CITY',   dur: 12 },
   { name: 'ENERGY CORE',    dur: 10 },
   { name: 'THE VOID',       dur: 8  },
];

// Seeded LCG — reproducible geometry every run
let _rng = 0x64d00d;
function rng() {
   _rng = (Math.imul(_rng, 1664525) + 1013904223) >>> 0;
   return _rng / 0x100000000;
}

let t = 0, sceneT = 0;
let scene = 0;
let state = 'start', startT = 0;

let gridMesh, cityMesh, groundMesh, centralSphere;
let skyPanel, horizonGlow;
let gridMeshes = [], gridCells = [], terrainCells = [];
let rings = [], towers = [], voidSpheres = [], pulseRings = [], dataStreams = [], energyOrbs = [];
let lightCycles = [];
let coreBurst = [], burstTimer = 0;

function mat4(sx, sy, sz, tx, ty, tz) {
   return [sx,0,0,0, 0,sy,0,0, 0,0,sz,0, tx,ty,tz,1];
}

function writeMat4(out, off, sx, sy, sz, tx, ty, tz) {
   out[off + 0] = sx; out[off + 1] = 0;  out[off + 2] = 0;  out[off + 3] = 0;
   out[off + 4] = 0;  out[off + 5] = sy; out[off + 6] = 0;  out[off + 7] = 0;
   out[off + 8] = 0;  out[off + 9] = 0;  out[off + 10] = sz; out[off + 11] = 0;
   out[off + 12] = tx; out[off + 13] = ty; out[off + 14] = tz; out[off + 15] = 1;
}

function batchInstanceTransforms(cells, writeCell) {
   const batches = new Map();
   for (const cell of cells) {
      let data = batches.get(cell.mesh);
      if (!data) {
         data = new Array(getInstanceCount(cell.mesh) * 16);
         batches.set(cell.mesh, data);
      }
      writeCell(cell, data, cell.idx * 16);
   }
   for (const [mesh, data] of batches) setInstanceTransforms(mesh, 0, data);
}

function clearScene3D() {
   if (gridMesh)      { destroyMesh(gridMesh);      gridMesh      = null; }
   for (const gm of gridMeshes) destroyMesh(gm.mesh);
   if (skyPanel)      { destroyMesh(skyPanel);       skyPanel      = null; }
   if (horizonGlow)   { destroyMesh(horizonGlow);    horizonGlow   = null; }
   if (cityMesh)      { destroyMesh(cityMesh);       cityMesh      = null; }
   if (groundMesh)    { destroyMesh(groundMesh);     groundMesh    = null; }
   if (centralSphere) { destroyMesh(centralSphere);  centralSphere = null; }
   for (const r of rings)       destroyMesh(r.mesh);
   for (const tw of towers)     destroyMesh(tw.mesh);
   for (const v of voidSpheres) destroyMesh(v.mesh);
   for (const p of pulseRings)  destroyMesh(p.mesh);
   for (const s of dataStreams) destroyMesh(s.mesh);
   for (const e of energyOrbs)  destroyMesh(e.mesh);
   for (const c of lightCycles) { destroyMesh(c.body); destroyMesh(c.trail); }
   for (const b of coreBurst)   destroyBurst(b);
   rings = []; towers = []; voidSpheres = []; pulseRings = []; dataStreams = []; energyOrbs = []; lightCycles = []; coreBurst = [];
   gridMeshes = []; gridCells = []; terrainCells = [];
   nova64.post.clear();
   clearSkyColor();
}

// ── Scene 0: GRID AWAKENING ───────────────────────────────────────────────────
function buildScene0() {
   /* Browser Three.js now preserves vivid fantasy-console colours instead of
      washing the scene through ACES/PBR defaults. Keep this scene darker and
      cyan-forward so the terrain/grid geometry remains readable. */
   nova64.post.setBloom(0.9);
   nova64.post.setChromatic(0.003);
   nova64.post.setCRT(true);
   nova64.post.setVignette(0.24, 0.78);
   setSkyColor(rgba8(78, 82, 94, 255), rgba8(48, 66, 72, 255));
   setAmbientLight(rgba8(62, 76, 84, 255), 1.05);
   setLightDirection(0, -1, -0.2);
   setFog(rgba8(54, 74, 78, 255), 60, 170);
   setCameraFOV(70);

   // skyPanel cube removed — setSkyColor() above now renders a real fullscreen
   // gradient quad behind the 3D pass.

   horizonGlow = createSphere(12, rgba8(0, 220, 255, 255));
   setMeshEmissive(horizonGlow, rgba8(0, 220, 255, 255), 0.8);
   setMeshOpacity(horizonGlow, 0.25);
   setScale(horizonGlow, 42, 10, 16);
   setPosition(horizonGlow, 20, -1, -16);

   const terrainCols = [
      rgba8(255, 20, 210, 255),
      rgba8(0, 210, 255, 255),
      rgba8(80, 50, 255, 255),
   ];
   const terrainGroups = [[], [], []];
   const TERRAIN_COLS = 21, TERRAIN_ROWS = 21;
   for (let r = 0; r < TERRAIN_ROWS; r++) {
      for (let c = 0; c < TERRAIN_COLS; c++) {
         terrainGroups[(c + r) % terrainGroups.length].push({ c, r });
      }
   }
   for (let g = 0; g < terrainGroups.length; g++) {
      const mesh = createInstancedMesh('cube', terrainGroups[g].length);
      const col = terrainCols[g];
      setMeshColor(mesh, col);
      setMeshEmissive(mesh, col, g === 1 ? 0.34 : 0.24);
      setMeshOpacity(mesh, 0.42);
      gridMeshes.push({ mesh, color: col });
      for (let i = 0; i < terrainGroups[g].length; i++) {
         const { c, r } = terrainGroups[g][i];
         const x = (c - TERRAIN_COLS/2 + 0.5) * 5.8;
         const z = (r - TERRAIN_ROWS/2 + 0.5) * 5.8 - 26;
         const n = Math.sin(x * 0.12) * Math.cos(z * 0.13);
         const h = 0.8 + (n * 0.5 + 0.5) * 6.2 + rng() * 1.2;
         setInstanceTransform(mesh, i, mat4(2.35, h, 2.35, x, h/2 - 2.8, z));
         setInstanceColor(mesh, i, col);
         terrainCells.push({ mesh, idx: i, x, z, baseH: h });
      }
   }
   for (let i = 0; i < 18; i++) {
      const col = terrainCols[i % terrainCols.length];
      const m = createCube(3.5 + rng() * 6.0, 0.14, 2.4 + rng() * 5.4, col);
      setMeshEmissive(m, col, i % 3 === 1 ? 0.42 : 0.30);
      setPosition(m, (rng() - 0.5) * 62, -4.0 + rng() * 0.7, 4 + rng() * 24);
      setRotation(m, 0, rng() * Math.PI * 2, 0);
      energyOrbs.push({ mesh: m });
   }
   const COLS = 18, ROWS = 18;
   const PALETTE = [
      rgba8(0, 240, 255, 255),
      rgba8(255, 40, 220, 255),
      rgba8(60, 120, 255, 255),
   ];
   const groups = [[], [], []];
   for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
         groups[(c + r) % 3].push({ c, r });
      }
   }

   for (let g = 0; g < groups.length; g++) {
      const mesh = createInstancedMesh('cube', groups[g].length);
      const col = PALETTE[g];
      setMeshColor(mesh, col);
      setMeshEmissive(mesh, col, g === 1 ? 0.24 : 0.18);
      setMeshOpacity(mesh, 0.42);
      gridMeshes.push({ mesh, color: col });

      for (let i = 0; i < groups[g].length; i++) {
         const { c, r } = groups[g][i];
         const x = (c - COLS/2 + 0.5) * 3.2;
         const z = (r - ROWS/2 + 0.5) * 3.2;
         const h = 0.1 + rng() * 0.2;
         setInstanceTransform(mesh, i, mat4(1.85, h, 1.85, x, -3 + h/2, z));
         setInstanceColor(mesh, i, col);
         gridCells.push({ mesh, idx: i, x, z });
      }
   }

   // Central landmark: tall glowing pillar
   groundMesh = createCube(0.8, 6, 0.8, rgba8(0, 240, 255, 255));
   setMeshEmissive(groundMesh, rgba8(0, 240, 255, 255), 0.9);
   setPosition(groundMesh, 0, 0, 0);

   const crystalColors = [
      rgba8(255, 236, 40, 255),
      rgba8(0, 240, 255, 255),
      rgba8(255, 40, 220, 255),
   ];
   for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const m = createCube(1.2, 3.6 + rng() * 1.6, 1.2, crystalColors[i % crystalColors.length]);
      setMeshEmissive(m, crystalColors[i % crystalColors.length], 0.72);
      setPosition(m, Math.cos(a) * 22, 1.2 + rng() * 3.8, Math.sin(a) * 22);
      setRotation(m, Math.PI / 4, a, Math.PI / 6);
      towers.push({ mesh: m, type: 'crystal', angle: a, radius: 22, phase: rng() * 6.28, speed: 0.35 + rng() * 0.5 });
   }
}

// ── Scene 1: DATA TUNNEL ──────────────────────────────────────────────────────
function buildScene1() {
   /* Corrected browser reference is a darker teal tunnel with compact neon
      rings/streams, not the old flat cyan wash. */
   nova64.post.setBloom(0.75);
   nova64.post.setChromatic(0.005);
   nova64.post.setCRT(true);
   nova64.post.setVignette(0.28, 0.78);
   setSkyColor(rgba8(8, 70, 74, 255), rgba8(2, 44, 50, 255));
   setAmbientLight(rgba8(22, 70, 78, 255), 1.15);
   setLightDirection(0, -1, -0.2);
   setFog(rgba8(7, 56, 70, 255), 75, 190);
   setCameraFOV(78);

   rings = [];
   for (let i = 0; i < 28; i++) {
      const z = -12 - i * 5.5;
      const outer = (i % 3 === 0) ? 4.2 : 3.45;
      const tube  = 0.58;
      const hue   = i / 28;
      const col = hue < 0.5
         ? rgba8(255, Math.floor(40 + hue*180), 220, 255)
         : rgba8(Math.floor(255 - (hue-0.5)*360), 40, 255, 255);
      const m = createTorus(outer, tube, col);
      setMeshEmissive(m, col, 0.9);
      setMeshOpacity(m, 0.62);
      setPosition(m, 0, 0, z);
      rings.push({ mesh: m, z, rot: (i % 2 === 0) ? 1 : -0.7, phase: rng() * 6.28 });
   }

   const streamColors = [
      rgba8(0, 240, 255, 255),
      rgba8(255, 40, 220, 255),
      rgba8(255, 236, 40, 255),
      rgba8(0, 255, 150, 255),
   ];
   for (let i = 0; i < 24; i++) {
      const a = rng() * Math.PI * 2;
      const r = 5.5 + rng() * 6.5;
      const col = streamColors[i % streamColors.length];
      const m = createCube(0.5, 0.5, 8.0 + rng() * 4.0, col);
      setMeshEmissive(m, col, 1.2);
      dataStreams.push({
         mesh: m,
         x: Math.cos(a) * r,
         y: Math.sin(a) * r,
         z: -12 - rng() * 85,
         speed: 34 + rng() * 30,
         roll: a,
      });
      setPosition(m, dataStreams[i].x, dataStreams[i].y, dataStreams[i].z);
      setRotation(m, 0, 0, a);
   }
}

// ── Scene 2: DIGITAL CITY ─────────────────────────────────────────────────────
function buildScene2() {
   /* Match the corrected browser reference: deep magenta-black sky
      (clearColor 0x120010), purple fog (0x351033), taller variable-width
      towers, brighter per-tower emissive. The pre-fix retune over-warmed
      the sky to brown which dominated the parity diff. */
   nova64.post.setBloom(1.05);
   nova64.post.setChromatic(0.003);
   nova64.post.setCRT(true);
   nova64.post.setVignette(0.28, 0.78);
   setSkyColor(rgba8(24, 4, 32, 255), rgba8(10, 0, 16, 255));
   setAmbientLight(rgba8(40, 24, 40, 255), 0.95);
   setLightDirection(-0.6, -1, -0.4);
   setFog(rgba8(53, 16, 51, 255), 75, 210);
   setCameraFOV(62);

   groundMesh = createCube(58, 0.2, 58, rgba8(10, 10, 26, 255));
   setMeshEmissive(groundMesh, rgba8(40, 60, 150, 255), 0.18);
   setPosition(groundMesh, 0, -0.1, 0);

   const COLS = 7, ROWS = 7;
   cityMesh = createInstancedMesh('cube', COLS * ROWS);
   /* Bias the shared emissive toward the browser's purple-pink wash; per-
      instance colours still differentiate cyan/yellow/magenta towers. */
   setMeshEmissive(cityMesh, rgba8(180, 60, 200, 255), 0.85);
   towers = [];
   let idx = 0;
   for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
         const x = (c - COLS/2 + 0.5) * 7;
         const z = (r - ROWS/2 + 0.5) * 7;
         // Browser uses height 5..23 and width 1.8..4.0 — match it so the
         // skyline silhouette + tower densities line up. Skip the centre
         // 4-unit square so the beacon (added below) stands alone.
         if (Math.abs(x) < 4 && Math.abs(z) < 4) {
            setInstanceTransform(cityMesh, idx, mat4(0.001, 0.001, 0.001, 1000, -1000, 1000));
            idx++;
            continue;
         }
         const w = 1.8 + rng() * 2.2;
         const h = 5 + rng() * 18;
         setInstanceTransform(cityMesh, idx, mat4(w, h, w, x, h/2, z));
         const hue3 = rng();
         const col = hue3 < 0.33
            ? rgba8(0,  210, 255, 255)
            : hue3 < 0.66 ? rgba8(255, 230, 0, 255)
            : rgba8(180,  0, 255, 255);
         setInstanceColor(cityMesh, idx, col);
         towers.push({ mesh: cityMesh, x, z, baseH: h, phase: rng()*6.28, idx });
         idx++;
      }
   }

   horizonGlow = createSphere(7, rgba8(255, 236, 40, 255));
   setMeshEmissive(horizonGlow, rgba8(255, 236, 40, 255), 2.0);
   setScale(horizonGlow, 0.6, 4.4, 0.6);
   setPosition(horizonGlow, 0, 6, 0);

   const lanes = [
      rgba8(0, 240, 255, 255),
      rgba8(255, 236, 40, 255),
      rgba8(255, 40, 220, 255),
   ];
   for (let i = 0; i < 12; i++) {
      const col = lanes[i % lanes.length];
      const m = createCube(0.28, 0.22, 8 + rng() * 8, col);
      setMeshEmissive(m, col, 1.7);
      setPosition(m, (rng() - 0.5) * 40, 0.22, (rng() - 0.5) * 42);
      setRotation(m, 0, rng() * Math.PI * 2, 0);
      energyOrbs.push({ mesh: m });
   }

   for (let i = 0; i < 6; i++) {
      const col = lanes[i % lanes.length];
      const body = createCube(2.2, 0.55, 1.0, col);
      const trail = createCube(0.45, 0.35, 8.5, col);
      const angle = (i / 6) * Math.PI * 2 + rng() * 0.3;
      setMeshEmissive(body, col, 1.45);
      setMeshEmissive(trail, col, 1.05);
      lightCycles.push({
         body,
         trail,
         angle,
         radius: 24 + rng() * 7,
         speed: 0.55 + rng() * 0.38,
         phase: rng() * Math.PI * 2,
      });
   }
}

// ── Scene 3: ENERGY CORE ──────────────────────────────────────────────────────
function buildScene3() {
   /* Match the corrected browser reference: deep purple sky (0x130013),
      purple fog (0x3a1238), one large neonPink core, four orbit rings,
      and a halo of orbs. The pre-fix retune had a warm-green sky/fog
      that fought the magenta core and inflated an extra yellow vertical
      glow column that isn't in the browser version at all. */
   nova64.post.setBloom(1.05);
   nova64.post.setChromatic(0.005);
   nova64.post.setVignette(0.32, 0.76);
   nova64.post.setCRT(true);
   setSkyColor(rgba8(28, 4, 32, 255), rgba8(12, 0, 14, 255));
   setAmbientLight(rgba8(42, 24, 44, 255), 1.0);
   setLightDirection(0, -0.5, -1);
   setFog(rgba8(58, 18, 56, 255), 60, 170);
   setCameraFOV(75);

   // Browser scene 3 has no vertical horizonGlow column — the central core
   // is the sole bright object. Set horizonGlow = null so the per-frame
   // update path skips it cleanly.
   horizonGlow = null;

   centralSphere = createSphere(2.6, rgba8(255, 60, 200, 255));
   setMeshEmissive(centralSphere, rgba8(255, 60, 200, 255), 1.7);
   setPosition(centralSphere, 0, 0, 0);

   rings = [];
   const RING_COLS = [
      rgba8(255,  60, 200, 255),
      rgba8(255, 160,  40, 255),
      rgba8( 40, 220, 255, 255),
      rgba8(160,  40, 255, 255),
   ];
   for (let i = 0; i < 4; i++) {
      const m = createTorus(3.5 + i * 1.4, 0.42, RING_COLS[i]);
      setMeshEmissive(m, RING_COLS[i], 1.15);
      rings.push({ mesh: m, phase: i * Math.PI / 4, speed: 0.8 + i * 0.2 });
   }

   for (let i = 0; i < 24; i++) {
      const col = RING_COLS[i % RING_COLS.length];
      const m = (i % 3 === 0)
         ? createCube(0.42, 1.6 + rng() * 1.2, 0.42, col)
         : createSphere(0.28 + rng() * 0.22, col);
      setMeshEmissive(m, col, 2.4);
      energyOrbs.push({
         mesh: m,
         r: 3.2 + rng() * 7.8,
         a: rng() * Math.PI * 2,
         y: (rng() - 0.5) * 5.8,
         speed: 0.55 + rng() * 1.25,
         phase: rng() * Math.PI * 2,
         scale: 0.75 + rng() * 0.75,
      });
   }

   burstTimer = 0.5;
}

// ── Scene 4: THE VOID ─────────────────────────────────────────────────────────
function buildScene4() {
   /* Match the corrected browser reference: near-black sky (clearColor
      0x05000a), darker fog (0x020006), discrete neon orbs. The prior
      retune's sky was too bright (38,20,48) which left a visible purple
      backdrop where the browser shows near-black. */
   nova64.post.setBloom(0.85);
   nova64.post.setChromatic(0.007);
   nova64.post.setVignette(0.28, 0.76);
   nova64.post.setCRT(true);
   setSkyColor(rgba8(10, 0, 18, 255), rgba8(2, 0, 8, 255));
   setAmbientLight(rgba8(24, 16, 32, 255), 0.95);
   setLightDirection(0.2, -1, 0.4);
   setFog(rgba8(4, 0, 8, 255), 35, 120);
   setCameraFOV(58);

   horizonGlow = createSphere(3.2, rgba8(0, 210, 255, 255));
   setMeshEmissive(horizonGlow, rgba8(0, 210, 255, 255), 2.1);
   setScale(horizonGlow, 1.1, 1.1, 1.1);
   setPosition(horizonGlow, 0, 0, -2);

   const VCOLS = [
      rgba8(40,100,255,255), rgba8(100,40,255,255),
      rgba8(40,200,255,255), rgba8(180,40,255,255),
      rgba8(60,140,255,255), rgba8(220,80,255,255),
      rgba8(255,236,80,255), rgba8(0,255,210,255),
   ];
   for (let i = 0; i < 34; i++) {
      const a = (i/34) * Math.PI * 2;
      const r = 3 + rng() * 10;
      const col = VCOLS[i % VCOLS.length];
      const m = (i % 4 === 0)
         ? createCube(0.55 + rng() * 0.7, 0.55 + rng() * 0.7, 0.55 + rng() * 0.7, col)
         : createSphere(0.28 + rng() * 0.65, col);
      setMeshEmissive(m, col, 1.35);
      voidSpheres.push({
         mesh: m, r, a,
         y: (rng()-0.5) * 10,
         speed: 0.12 + rng() * 0.55,
         phase: rng() * 6.28,
         scale: 0.65 + rng() * 1.1,
      });
   }

   for (let i = 0; i < 3; i++) {
      const col = VCOLS[(i * 2 + 1) % VCOLS.length];
      const m = createTorus(4.2 + i * 2.4, 0.25, col);
      setMeshEmissive(m, col, 1.1);
      rings.push({ mesh: m, phase: i * 0.7, speed: 0.22 + i * 0.1 });
   }
}

const BUILD = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4];

const SCENE_DESCRIPTIONS = [
   'Grid awakening - The digital realm comes to life with pulsing energy',
   'Data tunnel - Racing through streams of information at lightspeed',
   'Digital city - Towering structures of pure light and geometry',
   'Energy core - Spiraling into the heart of the system',
   "The void - Journey's end, returning to infinite darkness",
];

function mixByte(a, b, t) {
   return Math.floor(a + (b - a) * t);
}

function gradientX(x, y, w, h, steps, a, b) {
   for (let i = 0; i < steps; i++) {
      const t = steps <= 1 ? 1 : i / (steps - 1);
      const sx = x + Math.floor((i * w) / steps);
      const ex = x + Math.floor(((i + 1) * w) / steps);
      rectfill(sx, y, Math.max(1, ex - sx), h, rgba8(
         mixByte(a[0], b[0], t),
         mixByte(a[1], b[1], t),
         mixByte(a[2], b[2], t),
         255
      ));
   }
}

function drawWebBloomWash() {
   // Native GLES bloom now owns the glow. The previous opaque parity wash hid
   // the actual 3D scene behind solid color fields and made motion/detail look
   // nothing like the browser demo.
}

// ── Init ───────────────────────────────────────────────────────────────────────
export function init() {
   t = 0; sceneT = 0; scene = 0;
   state = 'start'; startT = 0;
   _rng = 0x64d00d;

   clearScene3D();
   setCameraPosition(0, 14, 28);
   setCameraTarget(0, 0, 0);
   BUILD[0]();
}

// ── Camera choreography ────────────────────────────────────────────────────────
function cam0(dt) {   // GRID AWAKENING — web-style rising terrain flyover
   const prog = Math.min(1, sceneT / SCENES[0].dur);
   const py = 15 + prog * 8;
   const pz = 35 - prog * 15;
   setCameraPosition(Math.sin(sceneT * 0.15) * 4, py, pz);
   setCameraTarget(0, 0, 0);
}
function cam1(dt) {   // DATA TUNNEL — fly through rings
   const pz = 20 - sceneT * 1.25;
   const sx = Math.sin(sceneT * 0.35) * 1.2;
   const sy = Math.cos(sceneT * 0.22) * 0.6;
   setCameraPosition(sx, sy, pz);
   setCameraTarget(sx * 0.3, 0, 0);
}
function cam2(dt) {   // DIGITAL CITY — orbit at two heights
   const angle = sceneT * 0.24;
   const h = 10 + Math.sin(sceneT * 0.4) * 4;
   setCameraPosition(Math.cos(angle) * 20, h, Math.sin(angle) * 20);
   setCameraTarget(0, 2, 0);
}
function cam3(dt) {   // ENERGY CORE — spiral inward
   const r = Math.max(5, 12 - sceneT * 0.5);
   const angle = sceneT * 0.65;
   setCameraPosition(Math.cos(angle)*r, 3+Math.sin(sceneT*0.4)*1.8, Math.sin(angle)*r);
   setCameraTarget(0, 0, 0);
}
function cam4(dt) {   // THE VOID — gentle drift
   setCameraPosition(Math.sin(sceneT*0.16)*7, Math.cos(sceneT*0.11)*3, 14);
   setCameraTarget(0, 0, 0);
}
const CAM = [cam0, cam1, cam2, cam3, cam4];

// ── Scene advance ──────────────────────────────────────────────────────────────
function nextScene() {
   clearScene3D();
   _rng = 0x64d00d;
   scene = (scene + 1) % SCENES.length;
   sceneT = 0;
   BUILD[scene]();
}

// ── Update ─────────────────────────────────────────────────────────────────────
export function update(dt) {
   if (state === 'start') {
      startT += dt;
      if (btnp("z") || btnp("x")) state = 'running';
      cam0(dt);
      return;
   }

   t += dt; sceneT += dt;

   if (btnp("z")) { nextScene(); return; }
   if (sceneT >= SCENES[scene].dur) { nextScene(); return; }

   CAM[scene](dt);

   // Per-scene animations
   if (scene === 0) {
      batchInstanceTransforms(terrainCells, (cell, data, off) => {
         const wave = Math.sin(cell.x * 0.1 + t) * Math.cos(cell.z * 0.1 + t);
         const h = Math.max(0.8, cell.baseH + wave * 1.5);
         writeMat4(data, off, 2.35, h, 2.35, cell.x, h/2 - 2.8, cell.z);
      });
      // Wave animation on grid heights
      batchInstanceTransforms(gridCells, (cell, data, off) => {
         const wave = Math.sin(cell.x*0.35 + t*2.2) * Math.cos(cell.z*0.35 + t*1.6);
         const h = 0.1 + (wave*0.5+0.5) * 2.5;
         writeMat4(data, off, 1.85, h, 1.85, cell.x, -3+h/2, cell.z);
      });
      // Pillar pulse
      const ph = 5 + Math.sin(t*2)*1;
      setScale(groundMesh, 0.8, ph, 0.8);
      setPosition(groundMesh, 0, ph/2 - 3, 0);

      if (Math.floor(t * 1.8) !== Math.floor((t - dt) * 1.8)) {
         const colors = [rgba8(0,240,255,180), rgba8(255,40,220,180), rgba8(255,236,40,160)];
         const col = colors[Math.floor(rng() * colors.length)];
         const m = createSphere(1, col);
         setMeshEmissive(m, col, 0.95);
         setPosition(m, 0, -2.6, 0);
         pulseRings.push({ mesh: m, life: 1.7, scale: 1.0 });
      }
      for (let i = pulseRings.length - 1; i >= 0; i--) {
         const p = pulseRings[i];
         p.life -= dt;
         p.scale += dt * 11;
         setScale(p.mesh, p.scale, 0.035, p.scale);
         setMeshOpacity(p.mesh, Math.max(0, p.life / 1.7) * 0.72);
         if (p.life <= 0) { destroyMesh(p.mesh); pulseRings.splice(i, 1); }
      }
      for (const tw of towers) {
         if (tw.type !== 'crystal') continue;
         const bob = Math.sin(t * 1.7 + tw.phase) * 2.4;
         const a = tw.angle + t * tw.speed;
         setPosition(tw.mesh, Math.cos(a) * tw.radius, 2.8 + bob, Math.sin(a) * tw.radius);
         setRotation(tw.mesh, Math.PI / 4 + Math.sin(t + tw.phase) * 0.18, a, t * 0.45);
      }
   }

   if (scene === 1) {
      for (const ring of rings) {
         setRotation(ring.mesh, t*ring.rot + ring.phase, t*ring.rot*0.6, ring.phase*0.5);
      }
      const camZ = -sceneT * 3 + 8;
      for (const stream of dataStreams) {
         stream.z += stream.speed * dt;
         if (stream.z > camZ + 18)
            stream.z = camZ - 95 - rng() * 45;
         setPosition(stream.mesh, stream.x, stream.y, stream.z);
         setRotation(stream.mesh, 0, 0, stream.roll + t * 0.6);
      }
   }

   if (scene === 2) {
      if (horizonGlow) {
         setRotation(horizonGlow, 0, t * 0.8, 0);
         setScale(horizonGlow, 0.45 + Math.sin(t * 2.4) * 0.08, 3.5, 0.45 + Math.sin(t * 2.4) * 0.08);
      }
      batchInstanceTransforms(towers, (tw, data, off) => {
         const h = tw.baseH * (0.7 + 0.3*Math.sin(t*1.8 + tw.phase));
         writeMat4(data, off, 2.6, h, 2.6, tw.x, h/2, tw.z);
      });
      for (const cycle of lightCycles) {
         cycle.angle += dt * cycle.speed;
         const wobble = Math.sin(t * 1.4 + cycle.phase) * 1.8;
         const x = Math.cos(cycle.angle) * (cycle.radius + wobble);
         const z = Math.sin(cycle.angle) * (cycle.radius + wobble);
         const yaw = cycle.angle + Math.PI / 2;
         const trailX = x - Math.cos(yaw) * 4.7;
         const trailZ = z - Math.sin(yaw) * 4.7;
         setPosition(cycle.body, x, 0.55, z);
         setRotation(cycle.body, 0, yaw, 0);
         setPosition(cycle.trail, trailX, 0.38, trailZ);
         setRotation(cycle.trail, 0, yaw, 0);
      }
   }

   if (scene === 3) {
      setRotation(centralSphere, t*1.4, t*0.9, 0);
      const corePulse = 1.0 + Math.sin(t * 4.0) * 0.18;
      setScale(centralSphere, corePulse, corePulse, corePulse);
      if (horizonGlow) {
         const beamPulse = 1.0 + Math.sin(t * 3.0) * 0.16;
         setScale(horizonGlow, beamPulse, 7.5 + Math.sin(t * 2.2) * 1.0, beamPulse);
      }
      for (let i = 0; i < rings.length; i++) {
         const ring = rings[i];
         const s = ring.speed;
         setRotation(ring.mesh,
            (i%3===0 ? t*s + ring.phase : 0),
            (i%3===1 ? t*s + ring.phase : 0),
            (i%3===2 ? t*s + ring.phase : 0));
      }
      for (const orb of energyOrbs) {
         orb.a += dt * orb.speed;
         const wobble = Math.sin(t * 1.9 + orb.phase);
         const x = Math.cos(orb.a) * orb.r;
         const z = Math.sin(orb.a) * orb.r;
         const y = orb.y + wobble * 1.5;
         const pulse = orb.scale * (0.85 + 0.28 * Math.sin(t * 4.2 + orb.phase));
         setPosition(orb.mesh, x, y, z);
         setRotation(orb.mesh, t * 1.1 + orb.phase, orb.a, t * 0.7);
         setScale(orb.mesh, pulse, pulse, pulse);
      }
      burstTimer -= dt;
      if (burstTimer <= 0) {
         burstTimer = 0.7 + rng()*0.5;
         const b = createBurst(0, 0, 16, 50);
         setBurstColors(b, rgba8(255,60,200,255), rgba8(255,180,60,255), rgba8(255,255,255,180));
         coreBurst.push(b);
      }
      for (let i = coreBurst.length-1; i >= 0; i--) {
         updateBurst(coreBurst[i], dt);
         if (isBurstDone(coreBurst[i])) { destroyBurst(coreBurst[i]); coreBurst.splice(i,1); }
      }
   }

   if (scene === 4) {
      if (horizonGlow) {
         const pulse = 1.0 + Math.sin(t * 1.7) * 0.28;
         setScale(horizonGlow, pulse, pulse, pulse);
         setRotation(horizonGlow, t * 0.25, t * 0.4, 0);
      }
      for (let i = 0; i < rings.length; i++) {
         const ring = rings[i];
         setRotation(ring.mesh,
            t * ring.speed + ring.phase,
            t * (ring.speed * 0.7) + ring.phase,
            t * (ring.speed * 1.2));
      }
      for (const vs of voidSpheres) {
         vs.a += dt * vs.speed;
         const pulse = vs.scale * (0.8 + 0.25 * Math.sin(t * 2.3 + vs.phase));
         setPosition(vs.mesh, Math.cos(vs.a)*vs.r, vs.y + Math.sin(t*0.7+vs.phase)*1.4, Math.sin(vs.a)*vs.r);
         setRotation(vs.mesh, t * 0.45 + vs.phase, vs.a, t * 0.35);
         setScale(vs.mesh, pulse, pulse, pulse);
      }
   }
}

// ── Draw ───────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(2, 3, 10, 255));

   // ── Start screen ───────────────────────────────────────────────────────────
   if (state === 'start') {
      rectfill(80, 80, 480, 220, rgba8(4, 6, 20, 250));
      glowRect(80, 80, 480, 220, rgba8(0, 230, 255, 220), 8);
      drawGlowTextCentered('TRON ODYSSEY', 320, 96,
         rgba8(0, 240, 255, 255), rgba8(0, 110, 255, 150), 2);
      printTight('RETROARCH EDITION - GLES3', 320, 118, rgba8(160, 200, 255, 200), 'center');
      glowLine(100, 134, 560, 134, rgba8(0,160,255,160), 1);
      printTight('5 SCENES - AUTO - Z=SKIP', 320, 144, rgba8(130,180,255,190), 'center');
      for (let i = 0; i < SCENES.length; i++) {
         printTight((i+1) + '. ' + SCENES[i].name, 184, 160 + i*14, rgba8(60+i*30, 180, 255-i*20, 180));
      }
      glowLine(100, 234, 560, 234, rgba8(0,160,255,160), 1);
      printTightScaled('Z OR X TO BEGIN', 320, 244, rgba8(255,220,60,255), 2, 'center');
      return;
   }

   const sc = SCENES[scene];
   const prog = sceneT / sc.dur;

   // ── Scene transition flash ─ drawn FIRST so HUD always appears on top ─────
   if (sceneT < 1.0) {
      const flashA = Math.floor((1 - sceneT) * 255);
      rectfill(0, 0, 640, 360, rgba8(0, 10, 28, flashA));
   }

   // ── Burst particles (energy core) ─────────────────────────────────────────
   for (const b of coreBurst) drawBurst(b);

   // Keep HUD-only drawing here. Scene glow is handled by native post bloom so
   // the underlying 3D forms stay visible.
   drawWebBloomWash();

   // ── Web-style HUD panels ──────────────────────────────────────────────────
   const panelColor = rgba8(0, 0, 20, 200);
   const sceneAccent = scene === 0 ? rgba8(0, 255, 255, 255)
      : scene === 1 ? rgba8(255, 0, 255, 255)
      : scene === 2 ? rgba8(255, 236, 40, 255)
      : scene === 3 ? rgba8(255, 0, 153, 255)
      : rgba8(0, 153, 255, 255);

   rectfill(16, 16, 280, 90, panelColor);
   rect(16, 16, 280, 90, sceneAccent, false);
   print('DEMOSCENE', 24, 24, rgba8(255, 255, 255, 255));
   printTight('Scene ' + (scene + 1) + '/' + SCENES.length + ': ' + sc.name,
      24, 45, rgba8(200, 200, 255, 255));
   rectfill(24, 62, 264, 8, rgba8(40, 40, 60, 200));
   rectfill(24, 62, Math.floor(264 * prog), 8, sceneAccent);
   rect(24, 62, 264, 8, rgba8(255, 255, 255, 100), false);
   printTight((prog * 100).toFixed(1) + '%', 24, 78, rgba8(150, 150, 200, 255));
   printTight('Time: ' + sceneT.toFixed(1) + 's / ' + sc.dur + 's',
      24, 90, rgba8(150, 150, 200, 255));

   rectfill(424, 16, 200, 65, panelColor);
   rect(424, 16, 200, 65, rgba8(255, 0, 255, 255), false);
   printTight('EFFECTS ACTIVE:', 432, 24, rgba8(255, 255, 255, 255));
   printTight('BLOOM', 432, 37, rgba8(0, 255, 0, 255));
   printTight('FXAA', 432, 48, rgba8(0, 255, 0, 255));
   printTight('PARTICLES', 432, 59, rgba8(0, 255, 0, 255));
   printTight('FOG', 432, 70, rgba8(0, 255, 0, 255));

   rectfill(16, 315, 608, 30, rgba8(0, 0, 20, 220));
   printTight(SCENE_DESCRIPTIONS[scene], 320, 325, rgba8(255, 255, 100, 255), 'center');
   printTight('NOVA64 - POWERED BY THREE.JS', 320, 340, rgba8(100, 100, 150, 200), 'center');

   printTight('Z:SKIP', 596, 8, rgba8(70,110,190,140));

   // Scene name flash at top of scene (printed ON TOP of HUD)
   if (sceneT < 0.8) {
      const ta = Math.floor((1 - sceneT/0.8) * 255);
      drawGlowTextCentered(sc.name, 320, 160,
         rgba8(0,240,255,ta), rgba8(0,80,255,Math.floor(ta * 0.55)), 2);
   }

}
