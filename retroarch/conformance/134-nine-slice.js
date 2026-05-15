// Conformance cart 134: drawNineSlice — 9-slice sprite stretching.
// drawNineSlice(path, dx, dy, dw, dh, border [, imgw, imgh])
// Non-existent asset path returns without crash.

let errors = [];

export function init() {
   if (typeof drawNineSlice !== 'function') {
      errors.push('drawNineSlice-missing'); return;
   }

   // Non-existent path should not crash
   drawNineSlice('nonexistent.rgba', 10, 10, 100, 80, 8, 32, 32);

   // Zero/invalid dimensions should not crash
   drawNineSlice('nonexistent.rgba', 0, 0, 0, 0, 4, 16, 16);
   drawNineSlice('nonexistent.rgba', 0, 0, 10, 10, 0, 16, 16);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('134 NINE SLICE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Simulate a 9-slice panel using filled rects to show the concept
   // (no actual asset available in conformance suite)
   const bx = 60, by = 60, bw = 200, bh = 120, b = 8;
   // Border
   rect(bx, by, bx + bw, by + bh, rgba8(180, 140, 80, 255));
   // Interior
   rectfill(bx + b, by + b, bx + bw - b, by + bh - b, rgba8(40, 50, 80, 255));
   // Corner accents
   rectfill(bx,        by,        bx + b,   by + b,   rgba8(220, 180, 80, 255));
   rectfill(bx + bw - b, by,      bx + bw,  by + b,   rgba8(220, 180, 80, 255));
   rectfill(bx,        by + bh - b, bx + b, by + bh,  rgba8(220, 180, 80, 255));
   rectfill(bx + bw - b, by + bh - b, bx + bw, by + bh, rgba8(220, 180, 80, 255));
   printCentered('nine slice panel', bx + bw / 2, by + bh / 2 - 4, rgba8(200, 220, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
