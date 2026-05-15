// Conformance cart 129: Logical grid.
// createGrid(cols, rows [, cellW, cellH]); setCell(h, col, row, val);
// getCell(h, col, row); clearGrid(h [, val]); gridCols(h); gridRows(h);
// destroyGrid(h).

let errors = [];
let g = 0;

export function init() {
   if (typeof createGrid  !== 'function') { errors.push('createGrid-missing');  return; }
   if (typeof setCell     !== 'function') { errors.push('setCell-missing');     return; }
   if (typeof getCell     !== 'function') { errors.push('getCell-missing');     return; }
   if (typeof clearGrid   !== 'function') { errors.push('clearGrid-missing');   return; }
   if (typeof gridCols    !== 'function') { errors.push('gridCols-missing');    return; }
   if (typeof gridRows    !== 'function') { errors.push('gridRows-missing');    return; }
   if (typeof destroyGrid !== 'function') { errors.push('destroyGrid-missing'); return; }

   g = createGrid(10, 8, 20, 20);
   if (!g) { errors.push('createGrid returned 0'); return; }

   if (gridCols(g) !== 10) errors.push('gridCols: expected 10, got ' + gridCols(g));
   if (gridRows(g) !== 8)  errors.push('gridRows: expected 8, got '  + gridRows(g));

   // Default values are 0
   if (getCell(g, 0, 0) !== 0) errors.push('initial cell not 0: ' + getCell(g, 0, 0));

   // setCell / getCell round-trip
   setCell(g, 3, 2, 42);
   if (getCell(g, 3, 2) !== 42) errors.push('getCell after set: expected 42, got ' + getCell(g, 3, 2));

   // Out-of-bounds access should return 0 / not crash
   setCell(g, 99, 99, 1);
   const oob = getCell(g, 99, 99);
   if (oob !== 0) errors.push('oob get should be 0, got ' + oob);

   // clearGrid resets values
   clearGrid(g, 7);
   if (getCell(g, 3, 2) !== 7) errors.push('after clearGrid: expected 7, got ' + getCell(g, 3, 2));
   clearGrid(g, 0);

   // destroyGrid + re-create
   const g2 = createGrid(4, 4);
   destroyGrid(g2);
   if (gridCols(g2) !== 0) errors.push('destroyed grid cols should be 0');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('129 GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw grid with pattern
   const cols = gridCols(g), rows = gridRows(g);
   for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
         setCell(g, c, r, (c + r) % 3);
      }
   }
   const ox = 40, oy = 50, cw = 20, ch = 20;
   for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
         const v = getCell(g, c, r);
         const color = v === 0 ? rgba8(60, 80, 140, 255)
                     : v === 1 ? rgba8(80, 160, 80, 255)
                     :           rgba8(160, 80, 60, 255);
         rectfill(ox + c * cw, oy + r * ch,
                  ox + c * cw + cw - 1, oy + r * ch + ch - 1, color);
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
