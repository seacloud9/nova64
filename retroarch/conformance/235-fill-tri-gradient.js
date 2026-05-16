// Conformance cart 235: fillTriGradient(x1,y1,c1, x2,y2,c2, x3,y3,c3).

let errors = [];

export function init() {
   if (typeof fillTriGradient !== 'function') { errors.push('fillTriGradient-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('235 FILL TRI GRADIENT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // RGB triangle
   fillTriGradient(
      320, 50, rgba8(255, 60, 60, 255),
      120, 180, rgba8(60, 220, 60, 255),
      520, 180, rgba8(60, 100, 255, 255)
   );

   // Color wheel style quads (two triangles each)
   const cx2 = 320, cy2 = 270, r = 70;
   for (let i = 0; i < 6; i++) {
      const a0 = i / 6 * Math.PI * 2 - Math.PI / 2;
      const a1 = (i + 1) / 6 * Math.PI * 2 - Math.PI / 2;
      const hue0 = i * 60, hue1 = (i + 1) * 60;
      const c0 = colorShift(rgba8(255, 0, 0, 255), hue0);
      const c1 = colorShift(rgba8(255, 0, 0, 255), hue1);
      const x0 = (cx2 + Math.cos(a0) * r) | 0, y0 = (cy2 + Math.sin(a0) * r) | 0;
      const x1 = (cx2 + Math.cos(a1) * r) | 0, y1 = (cy2 + Math.sin(a1) * r) | 0;
      fillTriGradient(cx2, cy2, rgba8(255, 255, 255, 255), x0, y0, c0, x1, y1, c1);
   }

   print('RGB vertices', 250, 195, rgba8(200, 220, 255, 200));
   print('color wheel', 280, 348, rgba8(200, 220, 255, 200));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
