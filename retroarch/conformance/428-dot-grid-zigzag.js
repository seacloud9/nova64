// Conformance cart 428: drawDotGrid, fillDotGrid, drawZigzag, fillZigzag.

let errors = [];

export function init() {
   if (typeof drawDotGrid !== 'function') { errors.push('drawDotGrid-missing'); return; }
   if (typeof fillDotGrid !== 'function') { errors.push('fillDotGrid-missing'); return; }
   if (typeof drawZigzag  !== 'function') { errors.push('drawZigzag-missing');  return; }
   if (typeof fillZigzag  !== 'function') { errors.push('fillZigzag-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 20, 255));
   print('428 DOT GRID ZIGZAG', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Dot grids
   fillDotGrid(20, 30, 280, 140, 14, rgba8(80, 160, 255, 255), rgba8(10, 15, 40, 255));
   drawDotGrid(320, 30, 280, 140, 10, rgba8(255, 160, 60, 200));

   // Zigzag lines
   drawZigzag(20, 200, 580, 18, 6, rgba8(100, 220, 100, 255));
   drawZigzag(20, 230, 580, 12, 10, rgba8(255, 100, 200, 220));

   // Filled zigzag band
   fillZigzag(20, 260, 580, 60, 20, 5, rgba8(80, 140, 255, 180));
   fillZigzag(20, 285, 580, 40, 8, 15, rgba8(255, 180, 60, 140));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
