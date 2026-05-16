// Conformance cart 263: fillRadialGradient(cx, cy, r, c1, c2).

let errors = [];

export function init() {
   if (typeof fillRadialGradient !== 'function') { errors.push('fillRadialGradient-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('263 RADIAL GRADIENT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Large sun glow
   fillRadialGradient(320, 180, 150, rgba8(255, 240, 100, 200), rgba8(255, 100, 20, 0));

   // Planet with atmosphere glow
   fillRadialGradient(160, 280, 60,  rgba8(60, 180, 255, 240),  rgba8(20, 60, 200, 0));
   circfill(160, 280, 40, rgba8(30, 120, 200, 255));

   // Colored spotlights
   fillRadialGradient(480, 90,  80, rgba8(255, 80, 80, 180),   rgba8(200, 20, 20, 0));
   fillRadialGradient(520, 280, 60, rgba8(80, 255, 120, 160),  rgba8(20, 160, 40, 0));
   fillRadialGradient(420, 280, 70, rgba8(180, 80, 255, 160),  rgba8(80, 20, 200, 0));

   // Nested gradient rings
   fillRadialGradient(320, 180, 50, rgba8(255, 255, 200, 255), rgba8(255, 180, 30, 0));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
