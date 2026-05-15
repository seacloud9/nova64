// Conformance cart 135: tilemap getters — getTile, tilemapCols/Rows/TileW/TileH.

let errors = [];

export function init() {
   if (typeof createTilemap !== 'function') { errors.push('createTilemap-missing'); return; }
   if (typeof getTile       !== 'function') { errors.push('getTile-missing'); return; }

   const tm = createTilemap(8, 6, 16, 16);
   if (!tm) { errors.push('createTilemap-zero'); return; }

   if (tilemapCols(tm) !== 8)  errors.push('cols-wrong');
   if (tilemapRows(tm) !== 6)  errors.push('rows-wrong');
   if (tilemapTileW(tm) !== 16) errors.push('tileW-wrong');
   if (tilemapTileH(tm) !== 16) errors.push('tileH-wrong');

   setTile(tm, 3, 2, 7);
   if (getTile(tm, 3, 2) !== 7) errors.push('getTile-wrong');

   // Out-of-bounds returns -1
   if (getTile(tm, 99, 0) !== -1) errors.push('oob-not-minus1');

   destroyTilemap(tm);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('135 TILEMAP GETTERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a grid to illustrate the concept
   for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 6; row++) {
         const v = (col + row) % 2 === 0 ? rgba8(60, 80, 140, 255) : rgba8(40, 55, 100, 255);
         rectfill(60 + col * 16, 50 + row * 16, 75 + col * 16, 65 + row * 16, v);
      }
   }
   printCentered('8x6 tile grid', 188, 158, rgba8(160, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
