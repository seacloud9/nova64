// Conformance cart 937: Batch 76 showcase — bullet pool shooter demo.

let t = 0;
let fireTimer = 0;
let burstTimer = 0;
let pool;

// Three "turrets" firing different patterns
const TURRETS = [
   { x: 320, y: 180, pattern: 'spiral', speed: 160, col: [255, 80,  80 ] },
   { x: 120, y: 120, pattern: 'fan',    speed: 140, col: [80,  200, 80 ] },
   { x: 520, y: 240, pattern: 'fan',    speed: 140, col: [80,  120, 255] },
];
let spiralAngle = 0;
let fanAngle    = 0;

function fireSpiralBurst(turret) {
   for (let i = 0; i < 5; i++) {
      const a = spiralAngle + (i / 5) * Math.PI * 2;
      fireBullet(pool, turret.x, turret.y,
         Math.cos(a) * turret.speed, Math.sin(a) * turret.speed,
         rgba8(turret.col[0], turret.col[1], turret.col[2], 255), 4, 1.8);
   }
   spiralAngle += 0.22;
}

function fireFanBurst(turret) {
   const spread = Math.PI / 4;
   for (let i = 0; i < 5; i++) {
      const a = fanAngle + (i / 4) * spread - spread / 2;
      fireBullet(pool, turret.x, turret.y,
         Math.cos(a) * turret.speed, Math.sin(a) * turret.speed,
         rgba8(turret.col[0], turret.col[1], turret.col[2], 255), 3, 1.5);
   }
   fanAngle += 0.08;
}

export function init() {
   pool = createBulletPool(128);
}

export function update(dt) {
   t += dt;
   fireTimer += dt;
   if (fireTimer >= 0.12) {
      fireTimer = 0;
      fireSpiralBurst(TURRETS[0]);
   }
   burstTimer += dt;
   if (burstTimer >= 0.18) {
      burstTimer = 0;
      fireFanBurst(TURRETS[1]);
      fireFanBurst(TURRETS[2]);
   }
   updateBullets(pool, dt);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   // Draw turret bases
   for (let i = 0; i < TURRETS.length; i++) {
      const tr = TURRETS[i];
      circfill(tr.x, tr.y, 8, rgba8(tr.col[0], tr.col[1], tr.col[2], 180));
      circ(tr.x, tr.y, 12, rgba8(200, 220, 255, 120));
   }

   drawBullets(pool);

   printBold('937 BATCH 76', 4, 4, rgba8(200, 220, 255, 255));
   print('bullet pool', 4, 14, rgba8(80, 255, 120, 255));
   print('active: ' + getBulletCount(pool), 4, 24, rgba8(255, 200, 80, 200));
}
