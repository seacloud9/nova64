// Conformance cart 798: 2D bullet pool
// Verifies createBulletPool / fireBullet / updateBullets / drawBullets /
//         getBulletCount / clearBullets / destroyBulletPool

let testDone = false;

export function init() {
   // ── Basic create ──
   const pool = createBulletPool(16);
   if (!pool) throw new Error('createBulletPool returned 0');
   if (getBulletCount(pool) !== 0) throw new Error('fresh pool should have 0 bullets');

   // ── Fire bullets ──
   const ok1 = fireBullet(pool, 100, 100, 200, 0, rgba8(255, 80, 80, 255), 4, 2.0);
   if (!ok1) throw new Error('fireBullet should succeed');
   if (getBulletCount(pool) !== 1) throw new Error('count should be 1 after fire');

   fireBullet(pool, 200, 150, 0, -150, rgba8(80, 200, 80, 255), 3, 1.5);
   fireBullet(pool, 300, 200, -100, 50, rgba8(80, 120, 255, 255), 5, 3.0);
   if (getBulletCount(pool) !== 3) throw new Error('count should be 3');

   // ── updateBullets moves positions and ages ──
   updateBullets(pool, 0.5);
   // bullet 0: x=100+200*0.5=200, life=2-0.5=1.5 (still active)
   if (getBulletCount(pool) !== 3) throw new Error('still 3 active after 0.5s');

   // advance bullet 1 past its life (1.5s total)
   updateBullets(pool, 1.1);
   // bullet 1 life: 1.5-0.5-1.1= -0.1 → dead
   if (getBulletCount(pool) !== 2) throw new Error('count should be 2 after bullet1 expires');

   // ── clearBullets ──
   clearBullets(pool);
   if (getBulletCount(pool) !== 0) throw new Error('count should be 0 after clear');

   // ── Pool cap enforcement ──
   const small = createBulletPool(3);
   for (let i = 0; i < 3; i++) fireBullet(small, 0, 0, 0, 0, rgba8(255,255,255,255), 2, 1.0);
   if (getBulletCount(small) !== 3) throw new Error('small pool should have 3');
   const overflow = fireBullet(small, 0, 0, 0, 0, rgba8(255,255,255,255), 2, 1.0);
   if (overflow) throw new Error('fire into full pool should return false');
   destroyBulletPool(small);

   // ── destroyBulletPool / re-create ──
   destroyBulletPool(pool);
   const pool2 = createBulletPool(32);
   if (!pool2) throw new Error('re-create after destroy failed');
   destroyBulletPool(pool2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('798 BULLET POOL', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Visual: fire a ring of bullets and draw them at t=0.4s
   const pool = createBulletPool(32);
   const cx = 320, cy = 200;
   for (let i = 0; i < 16; i++) {
      const a  = (i / 16) * Math.PI * 2;
      const sp = 120;
      const cols = [
         rgba8(255, 80,  80,  255),
         rgba8(80,  255, 80,  255),
         rgba8(80,  120, 255, 255),
         rgba8(255, 220, 40,  255),
      ];
      fireBullet(pool, cx, cy, Math.cos(a)*sp, Math.sin(a)*sp, cols[i%4], 4, 2.0);
   }
   updateBullets(pool, 0.4);
   drawBullets(pool);
   destroyBulletPool(pool);

   print('count: 16 fired, t=0.4s', 4, 24, rgba8(120, 160, 255, 180));
}
