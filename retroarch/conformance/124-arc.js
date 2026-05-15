// Conformance cart 124: drawArc / fillArc.
// drawArc(cx, cy, r, startDeg, endDeg, color [, segments])
// fillArc(cx, cy, r, startDeg, endDeg, color [, segments])

let errors = [];

export function init() {
   if (typeof drawArc !== 'function') { errors.push('drawArc-missing'); return; }
   if (typeof fillArc !== 'function') { errors.push('fillArc-missing'); return; }

   // Full circle via drawArc — should not crash
   drawArc(160, 120, 40, 0, 360, rgba8(255, 255, 255, 255));

   // Filled quarter circle — check center pixel after fill
   cls(rgba8(0, 0, 0, 255));
   fillArc(100, 100, 40, 0, 90, rgba8(200, 100, 50, 255));
   // A point at 45deg at r/2 should be inside the pie: (100+14, 100+14)
   const px = pget(114, 114);
   const pr = (px >> 24) & 0xff;
   if (pr !== 200)
      errors.push('fillArc 45-deg point not filled: r=' + pr);

   // Zero/tiny segments should not crash
   drawArc(50, 50, 10, 0, 360, rgba8(100, 100, 100, 255), 1);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('124 ARC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled pie chart
   fillArc(160, 150, 60, 0,   120, rgba8(200, 80,  60,  255));
   fillArc(160, 150, 60, 120, 230, rgba8(60,  200, 100, 255));
   fillArc(160, 150, 60, 230, 360, rgba8(80,  120, 220, 255));

   // Arc outline
   drawArc(340, 150, 50, -60, 240, rgba8(255, 200, 60, 255));
   drawArc(340, 150, 35, -60, 240, rgba8(180, 140, 40, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
