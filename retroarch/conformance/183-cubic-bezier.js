// Conformance cart 183: drawCubicBezier(x0,y0, cx0,cy0, cx1,cy1, x1,y1, color).

let errors = [];

export function init() {
   if (typeof drawCubicBezier !== 'function') { errors.push('drawCubicBezier-missing'); return; }
   // Degenerate: all same point must not crash
   drawCubicBezier(50,50, 50,50, 50,50, 50,50, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('183 CUBIC BEZIER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // S-curve
   drawCubicBezier( 40, 100,  40,  60, 280, 180, 280, 140, rgba8(255,  80,  80, 255));
   // Loop
   drawCubicBezier( 40, 200, 160,  60, 160, 340, 280, 200, rgba8( 80, 200,  80, 255));
   // Symmetric arch
   drawCubicBezier( 60, 250, 100, 180, 220, 180, 260, 250, rgba8( 80, 140, 255, 255));

   print('S-curve / loop / arch', 8, 270, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
