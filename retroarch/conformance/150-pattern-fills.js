// Conformance cart 150: fillCheckerboard / fillStripes — pattern fills.

let errors = [];

export function init() {
   if (typeof fillCheckerboard !== 'function') { errors.push('fillCheckerboard-missing'); return; }
   if (typeof fillStripes      !== 'function') { errors.push('fillStripes-missing'); return; }
   // Degenerate calls must not crash
   fillCheckerboard(0, 0, 0, 0, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 4);
   fillStripes(0, 0, 0, 0, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 4, 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('150 PATTERN FILLS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   fillCheckerboard(30, 50, 150, 200, rgba8(60, 100, 200, 255), rgba8(10, 20, 60, 255), 8);
   fillStripes(160, 50, 290, 200, rgba8(200, 100, 60, 255), rgba8(60, 30, 10, 255), 8, 0);
   rect(30, 50, 150, 200, rgba8(120, 140, 200, 255));
   rect(160, 50, 290, 200, rgba8(200, 120, 80, 255));
   printCentered('checker', 90, 208, rgba8(180, 200, 255, 255));
   printCentered('stripes', 225, 208, rgba8(255, 180, 130, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
