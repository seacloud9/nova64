// Conformance cart 357: drawFractalTree.

let errors = [];

export function init() {
   if (typeof drawFractalTree !== 'function') { errors.push('drawFractalTree-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 10, 6, 255));
   print('357 FRACTAL TREE', 4, 4, rgba8(200, 220, 180, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Different trees with varying depth and color
   drawFractalTree(160, 355, 70, Math.PI / 2, 7, rgba8(100, 200, 80, 255));
   drawFractalTree(320, 355, 60, Math.PI / 2, 6, rgba8(200, 160, 60, 255));
   drawFractalTree(480, 355, 55, Math.PI / 2, 8, rgba8(80, 180, 255, 255));

   // Tilted tree
   drawFractalTree(60, 320, 50, Math.PI / 3, 5, rgba8(180, 255, 120, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
