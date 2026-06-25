// Nova64 Game Cart: NOVA DRIFT (RetroArch port of examples/hello-skybox)
// 6DOF free-flight asteroid field with energy crystals to collect.
// Controls: Z/up = thrust, X/down = brake, left/right = yaw, c/v = pitch
// (The web cart uses W/S/A/D/Q/E; we map to the libretro joypad face buttons.)

const TOTAL = 15;
const THRUST = 0.32;
const TURN_SPD = 0.95;
const PITCH_SPD = 0.72;
const DRAG = 0.88;
const COLLECT_DIST_SQ = 100;

let time = 0;
let pos = { x: 0, y: 0, z: 10 };
let vel = { x: 0, y: 0, z: 0 };
let yaw = 0;
let pitch = 0;
let score = 0;
let collected = 0;

let asteroids = [];
let crystals = [];
let planets = [];
let starMesh = null;

const CRYSTAL_PALETTE = [
   rgba8(0x00, 0xff, 0xcc, 255),
   rgba8(0xff, 0x44, 0xff, 255),
   rgba8(0xff, 0xdd, 0x00, 255),
   rgba8(0x44, 0xaa, 0xff, 255),
];

function rng() {
   // Deterministic LCG so the asteroid field is the same every run
   rng._s = ((rng._s | 0) * 1664525 + 1013904223) >>> 0;
   return rng._s / 0x100000000;
}

export function init() {
   rng._s = 0xc0ffee;
   asteroids = [];
   crystals = [];
   planets = [];
   time = 0;
   pos = { x: 0, y: 0, z: 10 };
   vel = { x: 0, y: 0, z: 0 };
   yaw = 0;
   pitch = 0;
   score = 0;
   collected = 0;

   setSkyColor(rgba8(8, 4, 28, 255), rgba8(0, 0, 8, 255));
   setFog(rgba8(0, 5, 17, 255), 80, 420);
   setAmbientLight(rgba8(40, 50, 90, 255), 1.0);
   setLightDirection(-0.4, -1, -0.3);

   nova64.post.setBloom(1.2);
   nova64.post.setChromatic(0.003);
   nova64.post.setVignette(0.10, 0.85);
   nova64.post.setCRT(true);

   setCameraFOV(75);

   // Asteroid field: 45 lumpy rocks via instanced spheres
   const aMesh = createInstancedMesh('sphere', 45);
   setMeshColor(aMesh, rgba8(85, 68, 51, 255));
   setMeshEmissive(aMesh, rgba8(34, 28, 22, 255), 0.06);
   const aData = new Array(45 * 16);
   for (let i = 0; i < 45; i++) {
      const a = rng() * Math.PI * 2;
      const dist = 30 + rng() * 200;
      const x = Math.cos(a) * dist + (rng() - 0.5) * 60;
      const y = (rng() - 0.5) * 80;
      const z = Math.sin(a) * dist + (rng() - 0.5) * 60;
      const r = 2 + rng() * 9;
      writeMat(aData, i * 16, r, r, r, x, y, z);
      asteroids.push({ x, y, z, r, idx: i });
   }
   setInstanceTransforms(aMesh, 0, aData);
   asteroids._mesh = aMesh;

   // 3 distant planets
   const planetDefs = [
      { x:  250, y: -40, z: -300, r: 50, color: rgba8(0x33, 0x55, 0xaa, 255) },
      { x: -400, y:  30, z: -150, r: 70, color: rgba8(0xaa, 0x33, 0x33, 255) },
      { x:   80, y:  60, z:  320, r: 35, color: rgba8(0x22, 0x88, 0x55, 255) },
   ];
   for (const p of planetDefs) {
      const m = createSphere(p.r, p.color);
      setMeshEmissive(m, p.color, 0.18);
      setPosition(m, p.x, p.y, p.z);
      planets.push(m);
   }

   // 15 energy crystals (instanced cubes, one mesh per crystal so we can hide on pickup)
   for (let i = 0; i < TOTAL; i++) {
      const a = (i / TOTAL) * Math.PI * 2 + (rng() - 0.5) * 0.8;
      const dist = 40 + rng() * 120;
      const x = Math.cos(a) * dist;
      const y = (rng() - 0.5) * 50;
      const z = Math.sin(a) * dist;
      const color = CRYSTAL_PALETTE[i % CRYSTAL_PALETTE.length];
      const m = createCube(2.5, 2.5, 2.5, color);
      setMeshEmissive(m, color, 1.6);
      setPosition(m, x, y, z);
      crystals.push({ mesh: m, x, y, z, active: true });
   }

   setCameraPosition(pos.x, pos.y, pos.z);
   setCameraTarget(0, 0, 0);
}

function writeMat(out, off, sx, sy, sz, tx, ty, tz) {
   out[off+0]=sx; out[off+1]=0;  out[off+2]=0;  out[off+3]=0;
   out[off+4]=0;  out[off+5]=sy; out[off+6]=0;  out[off+7]=0;
   out[off+8]=0;  out[off+9]=0;  out[off+10]=sz;out[off+11]=0;
   out[off+12]=tx;out[off+13]=ty;out[off+14]=tz;out[off+15]=1;
}

export function update(dt) {
   time += dt;

   if (btn('left'))  yaw   += TURN_SPD * dt;
   if (btn('right')) yaw   -= TURN_SPD * dt;
   if (btn('c'))     pitch  = Math.min(pitch + PITCH_SPD * dt, 1.3);
   if (btn('v'))     pitch  = Math.max(pitch - PITCH_SPD * dt, -1.3);

   const cosY = Math.cos(yaw),  sinY = Math.sin(yaw);
   const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
   const fdx = -sinY * cosP;
   const fdy =  sinP;
   const fdz = -cosY * cosP;

   if (btn('z') || btn('up')) {
      vel.x += fdx * THRUST;
      vel.y += fdy * THRUST;
      vel.z += fdz * THRUST;
   }
   if (btn('x') || btn('down')) {
      vel.x -= fdx * THRUST * 0.5;
      vel.y -= fdy * THRUST * 0.5;
      vel.z -= fdz * THRUST * 0.5;
   }

   vel.x *= DRAG;
   vel.y *= DRAG;
   vel.z *= DRAG;
   pos.x += vel.x;
   pos.y += vel.y;
   pos.z += vel.z;

   setCameraPosition(pos.x, pos.y, pos.z);
   setCameraTarget(pos.x + fdx, pos.y + fdy, pos.z + fdz);

   for (const c of crystals) {
      if (!c.active) continue;
      rotateMesh(c.mesh, 0.5 * dt, 1.2 * dt, 0.3 * dt);
      const dx = pos.x - c.x, dy = pos.y - c.y, dz = pos.z - c.z;
      if (dx*dx + dy*dy + dz*dz < COLLECT_DIST_SQ) {
         destroyMesh(c.mesh);
         c.active = false;
         collected += 1;
         score += 100;
      }
   }
}

export function draw() {
   const spd = Math.round(Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z) * 60);
   print('CRYSTALS  ' + String(score).padStart(6, '0'), 16, 16, rgba8(0, 255, 200, 255));
   print('SPEED     ' + String(spd).padStart(3) + ' u/s',16, 36, rgba8(160, 200, 255, 210));
   print('REMAINING ' + collected + ' / ' + TOTAL,      16, 56, rgba8(255, 220, 80, 200));

   if (time < 8) {
      const a = Math.min(255, Math.floor((8 - time) * 50));
      printCentered('Z/Up = Thrust   X/Down = Brake', 320, 328, rgba8(200, 200, 200, a));
      printCentered('Left/Right = Yaw   C/V = Pitch', 320, 346, rgba8(200, 200, 200, a));
   }

   if (collected >= TOTAL) {
      const pulse = Math.floor((Math.sin(time * 4) * 0.5 + 0.5) * 255);
      printCentered('ALL CRYSTALS COLLECTED!', 320, 170, rgba8(0, 255, 200, pulse));
      printCentered('FINAL SCORE  ' + score, 320, 194, rgba8(255, 220, 0, 255));
   }
}
