// Conformance cart 191: dotGrid(x,y, w,h, gap, r, color).

let errors = [];

export function init() {
   if (typeof dotGrid !== 'function') { errors.push('dotGrid-missing'); return; }
   // Degenerate: must not crash
   dotGrid(0, 0, 0, 0, 8, 2, rgba8(255,255,255,255));
   dotGrid(0, 0, 100, 100, 0, 2, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('191 DOT GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Large dot grid (background texture)
   dotGrid(0, 30, 639, 330, 16, 1, rgba8(40, 60, 100, 255));

   // Smaller dense dot grid in a region
   rectfill(40, 60, 240, 180, rgba8(10, 16, 34, 255));
   dotGrid(40, 60, 200, 120, 8, 2, rgba8(80, 140, 200, 255));

   // Large dots
   dotGrid(280, 80, 160, 120, 20, 5, rgba8(255, 160, 60, 100));

   print('dot grid patterns', 8, 240, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
