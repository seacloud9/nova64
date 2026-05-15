// Conformance cart 127: stampText — integer-scaled text rendering.
// stampText(text, x, y [, scaleX [, scaleY [, color]]])

let errors = [];

export function init() {
   if (typeof stampText !== 'function') { errors.push('stampText-missing'); return; }

   // Test: 2x scaled 'A' — first pixel should be written
   cls(rgba8(0, 0, 0, 255));
   stampText('A', 20, 20, 2, 2, rgba8(255, 255, 255, 255));
   // At scale 2, each glyph pixel is 2x2. 'A' has a set pixel at col 1 row 0 (0-indexed).
   // Check that something is written at the approximate position
   let found = false;
   for (let x = 20; x < 40; x++) {
      for (let y = 20; y < 36; y++) {
         if (((pget(x, y) >> 24) & 0xff) > 200) { found = true; break; }
      }
      if (found) break;
   }
   if (!found) errors.push('stampText 2x: no pixels written');

   // Scale 1 should not crash
   stampText('test', 4, 50, 1, 1, rgba8(200, 200, 200, 255));

   // Large scale should not crash
   stampText('X', 4, 60, 8, 8, rgba8(100, 100, 100, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   stampText('NOVA', 20, 30, 3, 3, rgba8(80, 200, 255, 255));
   stampText('64', 20, 60, 4, 4, rgba8(255, 180, 60, 255));
   stampText('127 STAMP TEXT', 4, 4, 1, 1, rgba8(200, 220, 255, 255));
   stampText('ok', 4, 100, 2, 2, rgba8(80, 255, 120, 255));
}
