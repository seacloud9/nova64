// Conformance cart 296: drawNestedRects, fillNestedRects.

let errors = [];

export function init() {
   if (typeof drawNestedRects !== 'function') { errors.push('drawNestedRects-missing'); return; }
   if (typeof fillNestedRects !== 'function') { errors.push('fillNestedRects-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('296 NESTED RECTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Outline nested
   drawNestedRects(20,  50,  200, 140, 6, 8,  rgba8(100, 200, 255, 255));
   drawNestedRects(240, 50,  200, 140, 4, 12, rgba8(255, 180, 60,  255));
   drawNestedRects(460, 50,  160, 140, 8, 6,  rgba8(180, 255, 100, 255));

   // Filled alternating
   fillNestedRects(20,  220, 200, 120, 5, 10, rgba8(200, 40, 80,   255), rgba8(255, 200, 220, 255));
   fillNestedRects(240, 220, 200, 120, 4, 14, rgba8(40, 100, 200,  255), rgba8(180, 220, 255, 255));
   fillNestedRects(460, 220, 160, 120, 6, 8,  rgba8(80, 200, 40,   255), rgba8(200, 255, 180, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
