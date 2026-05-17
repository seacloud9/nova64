// Conformance cart 466: quadCurve, ellipse, ellipsefill, hsb.

let errors = [];

export function init() {
   const needed = ['quadCurve', 'ellipse', 'ellipsefill', 'hsb'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 4, 18, 255));
   print('466 CURVE ELLIPSE HSB', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // quadCurve — arching line
   quadCurve(30, 200, 200, 30, 370, 200, rgba8(200, 200, 80, 255));
   quadCurve(30, 210, 200, 380, 370, 210, rgba8(80, 200, 255, 255));

   // ellipse (outline) — width/height style
   ellipse(140, 300, 120, 60, rgba8(220, 80, 80, 255));
   ellipse(360, 300, 60, 120, rgba8(80, 220, 80, 255));

   // ellipsefill
   ellipsefill(250, 300, 80, 80, rgba8(100, 100, 220, 180));

   // hsb color strip — hue rotation
   for (let i = 0; i < 24; i++) {
      const c = hsb(i * 15, 0.9, 0.9, 255);
      rectfill(20 + i * 24, 340, 42 + i * 24, 370, c);
   }

   // hsb saturation sweep
   for (let i = 0; i < 10; i++) {
      const c = hsb(200, i * 0.1, 0.9, 255);
      rectfill(20 + i * 22, 375, 40 + i * 22, 395, c);
   }

   // hsb brightness sweep
   for (let i = 0; i < 10; i++) {
      const c = hsb(120, 0.8, i * 0.1, 255);
      rectfill(20 + i * 22, 400, 40 + i * 22, 420, c);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
