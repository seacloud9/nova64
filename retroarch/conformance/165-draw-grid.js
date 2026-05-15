// Conformance cart 165: drawGrid(x1, y1, x2, y2, cols, rows, color).

let errors = [];

export function init() {
   if (typeof drawGrid !== 'function') { errors.push('drawGrid-missing'); return; }
   // Degenerate: 0 cols or 0 rows must not crash
   drawGrid(0, 0, 100, 100, 0, 0, rgba8(255, 255, 255, 255));
   drawGrid(0, 0, 0, 0, 4, 4, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('165 DRAW GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   drawGrid(20, 40, 300, 200, 8, 5, rgba8(60, 100, 180, 255));
   drawGrid(20, 40, 300, 200, 1, 1, rgba8(100, 140, 220, 255));

   print('8x5 grid', 8, 210, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
