// Conformance cart 573: updateTweens, killTween, killAllTweens, getTweenCount,
//                        normVec2, dotVec2, magVec2, angleVec2.

let errors = [];

export function init() {
   const needed = ['updateTweens', 'killTween', 'killAllTweens', 'getTweenCount',
                   'normVec2', 'dotVec2', 'magVec2', 'angleVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // updateTweens — must not throw
   updateTweens(0.016);

   // Tween lifecycle
   killAllTweens();
   const h1 = createTween(0, 100, 1.0, 'linear');
   const h2 = createTween(0, 50,  0.5, 'linear');
   const cnt = getTweenCount();
   if (cnt < 2) errors.push('getTweenCount-low');
   killTween(h1);
   const cnt2 = getTweenCount();
   if (cnt2 >= cnt) errors.push('killTween-no-effect');
   killAllTweens();
   if (getTweenCount() !== 0) errors.push('killAllTweens-non-zero');

   // normVec2
   const n = normVec2(3, 4);
   if (Math.abs(n.x - 0.6) > 0.001 || Math.abs(n.y - 0.8) > 0.001) errors.push('normVec2-wrong');
   const nz = normVec2(0, 0);
   if (nz.x !== 0 || nz.y !== 0) errors.push('normVec2-zero');

   // dotVec2
   const d = dotVec2(1, 0, 0, 1);
   if (d !== 0) errors.push('dotVec2-perp');
   const d2 = dotVec2(3, 4, 3, 4);
   if (Math.abs(d2 - 25) > 0.001) errors.push('dotVec2-self');

   // magVec2
   const m = magVec2(3, 4);
   if (Math.abs(m - 5) > 0.001) errors.push('magVec2-wrong');

   // angleVec2
   const a = angleVec2(1, 0);
   if (Math.abs(a) > 0.001) errors.push('angleVec2-right');
   const a2 = angleVec2(0, 1);
   if (Math.abs(a2 - Math.PI / 2) > 0.001) errors.push('angleVec2-up');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('573 TWEEN VEC2', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // normVec2 compass rose
   const angles = [0, 45, 90, 135, 180, 225, 270, 315];
   for (let i = 0; i < angles.length; i++) {
      const rad = angles[i] * Math.PI / 180;
      const v = normVec2(Math.cos(rad), Math.sin(rad));
      const ex = Math.floor(320 + v.x * 60);
      const ey = Math.floor(180 + v.y * 60);
      line(320, 180, ex, ey, rgba8(80, 200, 255, 200));
   }

   // dotVec2 perpendicularity bar
   for (let i = 0; i < 10; i++) {
      const ang = i * Math.PI / 10;
      const dv = dotVec2(Math.cos(ang), Math.sin(ang), 1, 0);
      const bh = Math.floor(Math.abs(dv) * 40);
      rectfill(20 + i * 25, 280 - bh, 40 + i * 25, 280,
               hslColor(i * 25, 0.7, 0.5, 220));
   }

   // angleVec2 display
   for (let i = 0; i < 8; i++) {
      const rad = i * Math.PI / 4;
      const vx = Math.cos(rad), vy = Math.sin(rad);
      const got = angleVec2(vx, vy);
      const match = Math.abs(got - rad) < 0.01 || Math.abs(got - rad + Math.PI * 2) < 0.01;
      rectfill(20 + i * 35, 300, 50 + i * 35, 315,
               match ? rgba8(80, 255, 120, 220) : rgba8(255, 80, 80, 220));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
