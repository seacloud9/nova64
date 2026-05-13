// Conformance cart 31: tilemap API
// Tests createTilemap, setTile, drawTilemap, clearTilemap, destroyTilemap.
// Tilesheet: 4 tiles wide × 1 tile tall, each tile 8×8 pixels (32×8 RGBA raw).

let errors = [];
let tm = -1;

export function init() {
   if (typeof createTilemap  !== 'function') throw new Error('createTilemap missing');
   if (typeof setTile        !== 'function') throw new Error('setTile missing');
   if (typeof drawTilemap    !== 'function') throw new Error('drawTilemap missing');
   if (typeof clearTilemap   !== 'function') throw new Error('clearTilemap missing');
   if (typeof destroyTilemap !== 'function') throw new Error('destroyTilemap missing');

   // 4×3 grid of 8×8 tiles
   tm = createTilemap(8, 8, 4, 3);
   if (tm < 0) { errors.push('createTilemap failed'); return; }

   // Fill with alternating tile 0 and tile 1
   for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
         setTile(tm, c, r, (r + c) % 4);

   // clearTilemap should zero all cells without throwing
   const tm2 = createTilemap(4, 4, 2, 2);
   if (tm2 < 0) { errors.push('second createTilemap failed'); return; }
   setTile(tm2, 0, 0, 3);
   clearTilemap(tm2);
   destroyTilemap(tm2);
}

export function update() {}

export function draw() {
   cls(rgba8(10, 14, 24, 255));

   if (tm >= 0) {
      // Draw the tilemap starting at (4, 4)
      const ok = drawTilemap(tm, 4, 4, 'tiles/sheet.rgba');
      if (!ok) errors.push('drawTilemap returned false');
   }

   if (errors.length === 0) {
      print('31 TILEMAP ok', 4, 60, rgba8(80, 255, 120, 255));
   } else {
      print('31 TILEMAP FAIL', 4, 60, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 70, rgba8(255, 120, 120, 255));
   }
}
