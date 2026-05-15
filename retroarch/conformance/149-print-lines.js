// Conformance cart 149: printLines(arr, x, y, lineH, color) — multi-line array print.

let errors = [];

export function init() {
   if (typeof printLines !== 'function') { errors.push('printLines-missing'); return; }
   // Must not crash with empty or non-array
   printLines([], 10, 10, 10, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('149 PRINT LINES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const lines = [
      'GAME OVER',
      '',
      'Score:  9999',
      'Lives:  3',
      'Stage:  4',
      '',
      'Press START'
   ];
   rectfill(80, 50, 240, 200, rgba8(20, 20, 40, 255));
   printLines(lines, 110, 62, 14, rgba8(200, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
