// Conformance cart 190: printBold(text, x, y, color).

let errors = [];

export function init() {
   if (typeof printBold !== 'function') { errors.push('printBold-missing'); return; }
   // Must not crash on empty string
   printBold('', 0, 0, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('190 PRINT BOLD', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   print('Regular text here', 8, 40, rgba8(180, 220, 255, 255));
   printBold('Bold text here', 8, 52, rgba8(255, 220, 80, 255));
   print('Regular again', 8, 64, rgba8(180, 220, 255, 255));
   printBold('NOVA 64  SYSTEM', 8, 80, rgba8(200, 240, 255, 255));
   printBold('SCORE: 999999', 8, 96, rgba8(255, 160, 60, 255));

   // Side by side comparison
   rectfill(8, 120, 300, 150, rgba8(20, 30, 60, 255));
   print(    'Normal', 12, 126, rgba8(160, 200, 255, 255));
   printBold('Normal', 12, 137, rgba8(255, 255, 255, 255));
   print(    'Normal vs Bold', 12, 148, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
