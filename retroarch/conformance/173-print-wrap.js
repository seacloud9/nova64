// Conformance cart 173: printWrap(text, x, y, maxWidth, color [,lineH]).

let errors = [];

export function init() {
   if (typeof printWrap !== 'function') { errors.push('printWrap-missing'); return; }
   // Must not crash on empty or single-word string
   printWrap('', 0, 0, 100, rgba8(255, 255, 255, 255));
   printWrap('hello', 0, 0, 100, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('173 PRINT WRAP', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   rectfill(10, 40, 300, 160, rgba8(18, 24, 48, 255));
   rect(10, 40, 300, 160, rgba8(60, 90, 160, 255));
   printWrap(
      'The quick brown fox jumps over the lazy dog near the river bank on a sunny afternoon.',
      16, 46, 278, rgba8(200, 230, 255, 255), 11
   );

   rectfill(10, 170, 150, 230, rgba8(18, 24, 48, 255));
   rect(10, 170, 150, 230, rgba8(60, 90, 160, 255));
   printWrap('narrow column text wraps here', 16, 176, 128, rgba8(180, 220, 160, 255), 11);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
