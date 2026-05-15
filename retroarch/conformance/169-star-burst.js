// Conformance cart 169: drawStarBurst / fillStarBurst.

let errors = [];

export function init() {
   if (typeof drawStarBurst !== 'function') { errors.push('drawStarBurst-missing'); return; }
   if (typeof fillStarBurst !== 'function') { errors.push('fillStarBurst-missing'); return; }
   // Degenerate: 0 or negative points must not crash
   drawStarBurst(100, 100, 20, 10, 0, rgba8(255, 255, 255, 255));
   fillStarBurst(100, 100, 20, 10, 0, rgba8(255, 255, 255, 255));
   drawStarBurst(100, 100, 20, 10, -1, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('169 STAR BURST', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();
   const pts = [3, 4, 5, 6, 8];
   const cx = [80, 160, 240, 320, 200];
   const cy = [120, 120, 120, 120, 200];
   for (let i = 0; i < pts.length; i++) {
      const r2 = 14 + Math.sin(t * (1 + i * 0.3)) * 4;
      fillStarBurst(cx[i], cy[i], 30, r2, pts[i], rgba8(60 + i * 30, 80, 200 - i * 20, 255));
      drawStarBurst(cx[i], cy[i], 30, r2, pts[i], rgba8(200, 230, 255, 255));
   }
   print('3/4/5/6/8-point stars', 8, 220, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
