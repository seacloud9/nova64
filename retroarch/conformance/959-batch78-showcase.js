// Conformance cart 959: Batch 78 showcase — starfield + bullet pool space shooter.

let t = 0;
let stars, pool;
let fireTimer = 0;
let waveAngle = 0;

// A small "ship" that flies across the screen
let shipX = 320, shipY = 220;

export function init() {
   stars = createStarfield(160, 60);
   setStarfieldAngle(stars, -Math.PI / 2);  // upward scroll
   setStarfieldColors(stars,
      rgba8(30,  40,  70,  140),
      rgba8(80,  100, 150, 190),
      rgba8(200, 220, 255, 240));

   pool = createBulletPool(96);
}

export function update(dt) {
   t += dt;
   fireTimer += dt;

   // Move ship in a gentle figure-8
   shipX = 320 + Math.sin(t * 0.9) * 180;
   shipY = 200 + Math.sin(t * 0.45) * 80;

   // Fire bullets in a spread pattern
   if (fireTimer >= 0.07) {
      fireTimer = 0;
      waveAngle += 0.15;
      for (let i = 0; i < 3; i++) {
         const a = -Math.PI / 2 + (i - 1) * 0.18 + Math.sin(waveAngle) * 0.3;
         fireBullet(pool, shipX, shipY - 6,
            Math.cos(a) * 260, Math.sin(a) * 260,
            rgba8(255, 220, 60, 255), 3, 1.2);
      }
   }

   updateStarfield(stars, dt);
   updateBullets(pool, dt);
}

export function draw() {
   cls(rgba8(2, 3, 10, 255));

   drawStarfield(stars);
   drawBullets(pool);

   // Ship body
   rectfill(shipX - 8,  shipY - 14, 16, 20, rgba8(80,  160, 220, 255));
   rectfill(shipX - 14, shipY - 4,  28, 8,  rgba8(60,  120, 180, 255));
   rectfill(shipX - 3,  shipY + 4,  6,  8,  rgba8(255, 100, 40,  200));

   printBold('959 BATCH 78', 4, 4, rgba8(200, 220, 255, 255));
   print('starfield + bullets', 4, 14, rgba8(80, 255, 120, 255));
   print('bullets: ' + getBulletCount(pool), 4, 24, rgba8(255, 200, 80, 180));
}
