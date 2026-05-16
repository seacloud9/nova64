// Conformance cart 345: drawHexGrid, fillHexGrid, drawTriGrid.

let errors = [];

export function init() {
   if (typeof drawHexGrid !== 'function') { errors.push('drawHexGrid-missing'); return; }
   if (typeof fillHexGrid !== 'function') { errors.push('fillHexGrid-missing'); return; }
   if (typeof drawTriGrid !== 'function') { errors.push('drawTriGrid-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('345 HEX TRI GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hex grids
   fillHexGrid(20, 30, 180, 300, 20, rgba8(100, 180, 255, 200), rgba8(10, 20, 50, 255));
   drawHexGrid(220, 30, 180, 300, 16, rgba8(255, 160, 60, 200));

   // Filled hex with custom fill
   fillHexGrid(410, 30, 120, 150, 14, rgba8(180, 255, 100, 200), rgba8(20, 40, 10, 255));

   // Triangle grid
   drawTriGrid(410, 190, 200, 140, 20, rgba8(200, 100, 255, 180));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
