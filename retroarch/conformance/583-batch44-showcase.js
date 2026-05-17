// Conformance cart 583: batch 44 combined showcase.

let errors = [];
let cam;
let t = 0;

export function init() {
   const needed = ['createCamera2D', 'cam2DFollow', 'cam2DShake', 'updateCamera2D',
                   'updateTweens', 'killTween', 'killAllTweens', 'getTweenCount',
                   'normVec2', 'dotVec2', 'magVec2', 'angleVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   cam = createCamera2D({ x: 320, y: 180 });
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;

   const tx = 320 + Math.cos(t * 0.8) * 80;
   const ty = 180 + Math.sin(t * 0.6) * 50;
   cam2DFollow(cam, tx, ty, dt, 0.12);
   updateCamera2D(cam, dt);

   if (Math.floor(t * 2) % 6 === 0 && cam._shakeTime <= 0) {
      cam2DShake(cam, 5, 0.3);
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('583 BATCH 44', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Camera follow trail
   const cx = Math.floor(cam.x + cam._shakeX);
   const cy = Math.floor(cam.y + cam._shakeY);
   circ(cx, cy, 8, rgba8(80, 200, 255, 255));

   const tx2 = Math.floor(320 + Math.cos(t * 0.8) * 80);
   const ty2 = Math.floor(180 + Math.sin(t * 0.6) * 50);
   rectfill(tx2 - 3, ty2 - 3, tx2 + 3, ty2 + 3, rgba8(255, 200, 60, 255));
   line(cx, cy, tx2, ty2, rgba8(100, 100, 200, 120));

   // normVec2 direction arrow
   const dir = normVec2(tx2 - cx, ty2 - cy);
   const ax = cx + Math.floor(dir.x * 30);
   const ay = cy + Math.floor(dir.y * 30);
   line(cx, cy, ax, ay, rgba8(80, 255, 120, 200));

   // magVec2 distance bar
   const dm = magVec2(tx2 - cx, ty2 - cy);
   const bw = Math.min(Math.floor(dm * 0.8), 200);
   rectfill(20, 310, 20 + bw, 320, rgba8(200, 80, 255, 200));
   print('dist:' + Math.floor(dm), 230, 311, rgba8(200, 220, 255, 255));

   // angleVec2 sector wedge
   const ang = angleVec2(dir.x, dir.y);
   for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const diff = Math.abs(a - (ang + Math.PI * 2) % (Math.PI * 2));
      const active = diff < 0.4 || diff > Math.PI * 2 - 0.4;
      circ(Math.floor(500 + Math.cos(a) * 30),
           Math.floor(100 + Math.sin(a) * 30), 3,
           active ? rgba8(255, 200, 60, 255) : rgba8(60, 80, 120, 200));
   }

   // dotVec2 alignment meter
   const fwd = normVec2(Math.cos(t), Math.sin(t));
   const dot = dotVec2(fwd.x, fwd.y, dir.x, dir.y);
   const mw  = Math.floor((dot * 0.5 + 0.5) * 100);
   rectfill(20, 330, 20 + mw, 340, rgba8(80, 255, 200, 200));
   print('dot:' + dot.toFixed(2), 130, 331, rgba8(200, 220, 255, 255));

   // getTweenCount
   print('tw:' + getTweenCount(), 4, 345, rgba8(180, 180, 255, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
