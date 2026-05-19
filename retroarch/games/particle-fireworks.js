// Nova64 Game Cart: PARTICLE FIREWORKS
// Fireworks bursting over a city skyline. Fully automatic — just watch.
// Showcases: createBurst, setBurstColors, triggerBurst, updateBurst,
//            drawBurst, destroyBurst, glowCircle, glowLine, hslColor.

const W = 640, H = 360;
const GROUND_Y = H - 30;

// Colour palettes per firework type
const PALETTES = [
   [rgba8(255, 80,  80, 255), rgba8(255,180, 60, 255), rgba8(255,255,200,255)],  // warm
   [rgba8( 60,180,255, 255), rgba8(120, 80,255, 255), rgba8(200,220,255,255)],   // cool
   [rgba8( 60,255,120, 255), rgba8(200,255, 60, 255), rgba8(255,255,200,255)],   // vivid
   [rgba8(255, 60,200, 255), rgba8(255,120, 80, 255), rgba8(255,200,255,255)],   // pink
   [rgba8(255,240, 60, 255), rgba8(255,160, 40, 255), rgba8(255,255,180,255)],   // gold
];

let bursts = [];
let trails = [];       // rising trail sparks {x, y, vy, age, col}
let launchTimer = 0;
let launchInterval = 1.2;
let time = 0;

// Pre-generated "city" silhouette column heights (seeded-ish)
const BUILDINGS = [];
(function buildCity() {
   let bx = 0;
   while (bx < W) {
      const bw = 14 + (bx * 17 % 22);
      const bh = 22 + (bx * 13 % 38);
      BUILDINGS.push({ x: bx, w: bw, h: bh });
      bx += bw + 2;
   }
})();

function launchFirework() {
   const fx = 40 + rngRandom() * (W - 80);
   const fy = 30 + rngRandom() * (H * 0.5);
   const pal = PALETTES[Math.floor(rngRandom() * PALETTES.length)];
   const n = 18 + Math.floor(rngRandom() * 20);
   const life = 45 + Math.floor(rngRandom() * 30);

   // Main explosion burst
   const b = createBurst(fx, fy, n, life);
   setBurstColors(b, pal[0], pal[1], pal[2]);
   bursts.push({ handle: b, x: fx, y: fy });

   // Secondary smaller ring
   const b2 = createBurst(fx, fy, Math.floor(n * 0.6), Math.floor(life * 0.7));
   setBurstColors(b2, pal[2], pal[1], rgba8(255,255,255,200));
   bursts.push({ handle: b2, x: fx, y: fy });

   // Rising trail — multiple sparks climbing toward burst point
   const steps = 6;
   for (let i = 0; i < steps; i++) {
      trails.push({
         x: fx + (rngRandom() - 0.5) * 4,
         y: GROUND_Y - 10,
         vy: -(fy - GROUND_Y + 10) / (0.35 + rngRandom() * 0.1) * (1 - i * 0.12),
         age: 0,
         maxAge: 0.35 + rngRandom() * 0.1,
         col: pal[0],
      });
   }
}

export function init() {
   time = 0; launchTimer = 0; launchInterval = 0.6;
   bursts = []; trails = [];
   launchFirework();
}

export function update(dt) {
   time += dt;
   launchTimer += dt;

   if (launchTimer >= launchInterval) {
      launchTimer = 0;
      launchInterval = 0.7 + rngRandom() * 1.4;
      launchFirework();
      // Occasional double-burst
      if (rngRandom() < 0.3) {
         launchTimer = launchInterval * -0.3;
      }
   }

   // Update bursts
   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i].handle, dt);
      if (isBurstDone(bursts[i].handle)) {
         destroyBurst(bursts[i].handle);
         bursts.splice(i, 1);
      }
   }

   // Update rising trails
   for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      tr.age += dt;
      tr.y += tr.vy * dt;
      tr.vy *= 0.92;
      if (tr.age >= tr.maxAge) trails.splice(i, 1);
   }
}

export function draw() {
   cls(rgba8(3, 3, 12, 255));

   // Stars
   for (let i = 0; i < 50; i++) {
      const sx = (i * 137 + 3) % W;
      const sy = (i * 97  + 7) % (H - 50);
      const br = Math.floor((0.45 + 0.55 * Math.sin(time * 2.2 + i)) * 210);
      pset(sx, sy, rgba8(br, br, Math.min(255, br + 30), 255));
   }

   // Rising trails (drawn before bursts so bursts appear on top)
   for (const tr of trails) {
      const a = 1 - tr.age / tr.maxAge;
      const r = Math.max(1, Math.floor(2 * a));
      glowCircle(Math.floor(tr.x), Math.floor(tr.y), r, tr.col, Math.floor(3 * a));
   }

   // Burst particles
   for (const b of bursts) drawBurst(b.handle);

   // City silhouette (drawn over particles so it masks ground-level splatter)
   for (const bld of BUILDINGS) {
      rectfill(bld.x, GROUND_Y - bld.h, bld.w, bld.h + 30, rgba8(8, 8, 20, 255));
      // Windows
      for (let wy = GROUND_Y - bld.h + 4; wy < GROUND_Y - 4; wy += 6) {
         for (let wx = bld.x + 3; wx < bld.x + bld.w - 2; wx += 5) {
            if (Math.sin(bld.x * 7 + wy * 13) > 0.25)
               pset(wx, wy, rgba8(255, 240, 160, 180));
         }
      }
   }
   // Ground strip
   rectfill(0, GROUND_Y, W, 30, rgba8(6, 6, 16, 255));

   // HUD
   print('PARTICLE FIREWORKS', 4, 4, rgba8(200, 200, 255, 180));
   print('bursts: ' + bursts.length, 4, 16, rgba8(140, 140, 200, 140));
}
