// Conformance cart 157: drawArrow(x0, y0, x1, y1, color [, headSize]).

let errors = [];

export function init() {
   if (typeof drawArrow !== 'function') { errors.push('drawArrow-missing'); return; }
   // Degenerate calls must not crash
   drawArrow(0, 0, 0, 0, rgba8(255, 255, 255, 255));
   drawArrow(10, 10, 10, 10, rgba8(255, 255, 255, 255), 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('157 DRAW ARROW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const cx = 160, cy = 130, radius = 80;
   for (let i = 0; i < 8; i++) {
      const ang = i / 8 * Math.PI * 2;
      const x1 = cx + Math.round(Math.cos(ang) * radius);
      const y1 = cy + Math.round(Math.sin(ang) * radius);
      const c = colorHSV(i / 8 * 360, 200, 220, 255);
      drawArrow(cx, cy, x1, y1, c, 8);
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
