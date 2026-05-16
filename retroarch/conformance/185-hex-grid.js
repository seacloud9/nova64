// Conformance cart 185: hexGrid(x,y, size, cols, rows, color).

let errors = [];

export function init() {
   if (typeof hexGrid !== 'function') { errors.push('hexGrid-missing'); return; }
   // Degenerate: must not crash
   hexGrid(0, 0, 0, 0, 0, rgba8(255,255,255,255));
   hexGrid(0, 0, 10, 1, 1, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('185 HEX GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   hexGrid(20, 40, 24, 8, 5, rgba8(60, 100, 200, 255));
   hexGrid(20, 40, 24, 8, 5, rgba8(40, 70, 140, 80));

   // Small grid with bright color
   hexGrid(380, 60, 14, 4, 6, rgba8(100, 200, 255, 255));

   print('8x5 + 4x6 hex grids', 8, 270, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
