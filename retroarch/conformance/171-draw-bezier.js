// Conformance cart 171: drawBezier(x0,y0, cx,cy, x1,y1, color [,steps]).

let errors = [];

export function init() {
   if (typeof drawBezier !== 'function') { errors.push('drawBezier-missing'); return; }
   // Degenerate: same start and end must not crash
   drawBezier(50, 50, 50, 50, 50, 50, rgba8(255, 255, 255, 255));
   drawBezier(50, 50, 80, 20, 120, 50, rgba8(255, 255, 255, 255), 2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('171 DRAW BEZIER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Several quadratic bezier curves
   drawBezier( 20, 100, 160,  40, 300, 100, rgba8(255,  80,  80, 255), 48);
   drawBezier( 20, 130, 160, 200, 300, 130, rgba8( 80, 200,  80, 255), 48);
   drawBezier( 20, 160,  20, 100, 160, 160, rgba8( 80, 140, 255, 255), 48);
   drawBezier(160, 160, 300, 100, 300, 200, rgba8(255, 200,  60, 255), 48);

   print('4 bezier curves', 8, 220, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
