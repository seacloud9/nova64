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
let rings = [], towers = [], voidSpheres = [];
let coreBurst = [], burstTimer = 0;

function mat4(sx, sy, sz, tx, ty, tz) {
   return [sx,0,0,0, 0,sy,0,0, 0,0,sz,0, tx,ty,tz,1];
}

function clearScene3D() {
   if (gridMesh)      { destroyMesh(gridMesh);      gridMesh      = null; }
   if (cityMesh)      { destroyMesh(cityMesh);       cityMesh      = null; }
   if (groundMesh)    { destroyMesh(groundMesh);     groundMesh    = null; }
   if (centralSphere) { destroyMesh(centralSphere);  centralSphere = null; }
   for (const r of rings)       destroyMesh(r.mesh);
   for (const tw of towers)     destroyMesh(tw.mesh);
   for (const v of voidSpheres) destroyMesh(v.mesh);
   for (const b of coreBurst)   destroyBurst(b);
   rings = []; towers = []; voidSpheres = []; coreBurst = [];
   nova64.post.clear();
}

// ── Scene 0: GRID AWAKENING ───────────────────────────────────────────────────
function buildScene0() {
   nova64.post.setBloom(0.7);
   setLightDirection(-0.4, -1, -0.5);
   setFog(rgba8(4, 6, 18, 255), 25, 80);
   setCameraFOV(65);

   const COLS = 18, ROWS = 18;
   gridMesh = createInstancedMesh('cube', COLS * ROWS);
   let idx = 0;
   for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
         const x = (c - COLS/2 + 0.5) * 3.2;
         const z = (r - ROWS/2 + 0.5) * 3.2;
         const h = 0.1 + rng() * 0.2;
         setInstanceTransform(gridMesh, idx, mat4(3.0, h, 3.0, x, -3 + h/2, z));
         // Bright cyan to blue gradient by position
         const cx = Math.floor(30 + (c/COLS) * 80);
         setInstanceColor(gridMesh, idx, rgba8(cx, 180 + Math.floor(rng()*75), 255, 255));
         idx++;
      }
   }

   // Central landmark: tall glowing pillar
   groundMesh = createCube(0.8, 6, 0.8, rgba8(0, 240, 255, 255));
   setPosition(groundMesh, 0, 0, 0);
}

// ── Scene 1: DATA TUNNEL ──────────────────────────────────────────────────────
function buildScene1() {
   nova64.post.setBloom(1.4);
   nova64.post.setChromatic(0.005);
   setLightDirection(0, -1, 0);
   setFog(rgba8(2, 0, 10, 255), 10, 60);
   setCameraFOV(85);

   rings = [];
   for (let i = 0; i < 28; i++) {
      const z = -i * 5;
      // Alternate large and medium rings; thick tube so they're visible
      const outer = (i % 3 === 0) ? 3.2 : 2.6;
      const tube  = 0.38;
      const hue   = i / 28;
      const col = hue < 0.5
         ? rgba8(255, Math.floor(40 + hue*180), 220, 255)
         : rgba8(Math.floor(255 - (hue-0.5)*360), 40, 255, 255);
      const m = createTorus(outer, tube, col);
      setPosition(m, 0, 0, z);
      rings.push({ mesh: m, z, rot: (i % 2 === 0) ? 1 : -0.7, phase: rng() * 6.28 });
   }
}

// ── Scene 2: DIGITAL CITY ─────────────────────────────────────────────────────
function buildScene2() {
   nova64.post.setBloom(0.9);
   setLightDirection(-0.6, -1, -0.4);
   setFog(rgba8(6, 4, 16, 255), 20, 90);
   setCameraFOV(62);

   groundMesh = createCube(56, 0.2, 56, rgba8(10, 10, 26, 255));
   setPosition(groundMesh, 0, -0.1, 0);

   const COLS = 7, ROWS = 7;
   cityMesh = createInstancedMesh('cube', COLS * ROWS);
   towers = [];
   let idx = 0;
   for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
         const x = (c - COLS/2 + 0.5) * 7;
         const z = (r - ROWS/2 + 0.5) * 7;
         const h = 1.5 + rng() * 9;
         setInstanceTransform(cityMesh, idx, mat4(2.6, h, 2.6, x, h/2, z));
         const hue3 = rng();
         const col = hue3 < 0.33
            ? rgba8(0,  210, 255, 255)
            : hue3 < 0.66 ? rgba8(255, 230, 0, 255)
            : rgba8(180,  0, 255, 255);
         setInstanceColor(cityMesh, idx, col);
         towers.push({ x, z, baseH: h, phase: rng()*6.28, idx });
         idx++;
      }
   }
}

// ── Scene 3: ENERGY CORE ──────────────────────────────────────────────────────
function buildScene3() {
   nova64.post.setBloom(2.0);
   nova64.post.setVignette(1.4, 0.82);
   setLightDirection(0, -0.5, -1);
   setFog(rgba8(4, 0, 8, 255), 12, 50);
   setCameraFOV(75);

   centralSphere = createSphere(1.4, rgba8(255, 60, 200, 255));
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
      rings.push({ mesh: m, phase: i * Math.PI / 4, speed: 0.8 + i * 0.2 });
   }

   burstTimer = 0.5;
}

// ── Scene 4: THE VOID ─────────────────────────────────────────────────────────
function buildScene4() {
   nova64.post.setBloom(2.8);
   nova64.post.setVignette(2.0, 0.68);
   setLightDirection(0.2, -1, 0.4);
   setFog(rgba8(0, 0, 6, 255), 8, 45);
   setCameraFOV(58);

   const VCOLS = [
      rgba8(40,100,255,255), rgba8(100,40,255,255),
      rgba8(40,200,255,255), rgba8(180,40,255,255),
      rgba8(60,140,255,255), rgba8(220,80,255,255),
   ];
   for (let i = 0; i < 14; i++) {
      const a = (i/14) * Math.PI * 2;
      const r = 4 + rng() * 7;
      const m = createSphere(0.35 + rng() * 0.7, VCOLS[i % VCOLS.length]);
      voidSpheres.push({
         mesh: m, r, a,
         y: (rng()-0.5) * 9,
         speed: 0.18 + rng() * 0.45,
         phase: rng() * 6.28,
      });
   }
}

const BUILD = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4];

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
function cam0(dt) {   // GRID AWAKENING — slow descending sweep
   const py = Math.max(3, 14 - sceneT * 0.7);
   const pz = Math.max(1, 28 - sceneT * 1.2);
   setCameraPosition(Math.sin(sceneT * 0.15) * 4, py, pz);
   setCameraTarget(0, 0, 0);
}
function cam1(dt) {   // DATA TUNNEL — fly through rings
   const pz = -sceneT * 3 + 8;
   const sx = Math.sin(sceneT * 0.35) * 1.2;
   const sy = Math.cos(sceneT * 0.22) * 0.6;
   setCameraPosition(sx, sy, pz);
   setCameraTarget(sx * 0.3, 0, pz - 6);
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
      // Wave animation on grid heights
      let idx = 0;
      const COLS = 18, ROWS = 18;
      for (let r = 0; r < ROWS; r++) {
         for (let c = 0; c < COLS; c++) {
            const x = (c-COLS/2+0.5)*3.2, z = (r-ROWS/2+0.5)*3.2;
            const wave = Math.sin(x*0.35 + t*2.2) * Math.cos(z*0.35 + t*1.6);
            const h = 0.1 + (wave*0.5+0.5) * 2.5;
            setInstanceTransform(gridMesh, idx, mat4(3.0, h, 3.0, x, -3+h/2, z));
            idx++;
         }
      }
      // Pillar pulse
      const ph = 5 + Math.sin(t*2)*1;
      setScale(groundMesh, 0.8, ph, 0.8);
      setPosition(groundMesh, 0, ph/2 - 3, 0);
   }

   if (scene === 1) {
      for (const ring of rings) {
         setRotation(ring.mesh, t*ring.rot + ring.phase, t*ring.rot*0.6, ring.phase*0.5);
      }
   }

   if (scene === 2) {
      for (const tw of towers) {
         const h = tw.baseH * (0.7 + 0.3*Math.sin(t*1.8 + tw.phase));
         setInstanceTransform(cityMesh, tw.idx, mat4(2.6, h, 2.6, tw.x, h/2, tw.z));
      }
   }

   if (scene === 3) {
      setRotation(centralSphere, t*1.4, t*0.9, 0);
      for (let i = 0; i < rings.length; i++) {
         const ring = rings[i];
         const s = ring.speed;
         setRotation(ring.mesh,
            (i%3===0 ? t*s + ring.phase : 0),
            (i%3===1 ? t*s + ring.phase : 0),
            (i%3===2 ? t*s + ring.phase : 0));
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
      for (const vs of voidSpheres) {
         vs.a += dt * vs.speed;
         setPosition(vs.mesh, Math.cos(vs.a)*vs.r, vs.y + Math.sin(t*0.7+vs.phase)*1.4, Math.sin(vs.a)*vs.r);
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
      printBold('TRON ODYSSEY', 190, 98, rgba8(0, 240, 255, 255));
      print('RetroArch Edition  —  GLES3', 192, 118, rgba8(160, 200, 255, 200));
      glowLine(100, 134, 560, 134, rgba8(0,160,255,160), 1);
      print('5 scenes  ·  auto  ·  Z=skip', 204, 144, rgba8(130,180,255,190));
      for (let i = 0; i < SCENES.length; i++) {
         print((i+1) + '. ' + SCENES[i].name, 184, 160 + i*14, rgba8(60+i*30, 180, 255-i*20, 180));
      }
      glowLine(100, 234, 560, 234, rgba8(0,160,255,160), 1);
      printFlash(240, 246, 'Z or X to begin', rgba8(255,220,60,255), -startT, 1.8);
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

   // ── HUD — always drawn AFTER the flash so it stays readable ───────────────
   rectfill(0, 0, 640, 34, rgba8(2, 4, 12, 220));
   glowLine(0, 34, 640, 34, rgba8(0,160,255,140), 2);
   printBold('TRON ODYSSEY', 8, 6, rgba8(0, 220, 255, 210));
   print('scene ' + (scene+1) + '/' + SCENES.length + '   ' + sc.name,
         160, 8, rgba8(255,230,60,220));
   print('Z:skip', 596, 8, rgba8(70,110,190,140));

   // Progress bar
   const BAR_X = 8, BAR_Y = 344, BAR_W = 300;
   rect(BAR_X, BAR_Y, BAR_W, 7, rgba8(15,30,60,200));
   rectfill(BAR_X+1, BAR_Y+1, Math.floor((BAR_W-2)*prog), 5, rgba8(0,200,255,220));

   // Scene name flash at top of scene (printed ON TOP of HUD)
   if (sceneT < 0.8) {
      const ta = Math.floor((1 - sceneT/0.8) * 255);
      printBold(sc.name, 320 - sc.name.length * 6, 166, rgba8(0,240,255,ta));
   }
}
