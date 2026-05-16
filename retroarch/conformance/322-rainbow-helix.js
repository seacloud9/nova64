// Conformance cart 322: drawRainbow, drawHelix.

let errors = [];

export function init() {
   if (typeof drawRainbow !== 'function') { errors.push('drawRainbow-missing'); return; }
   if (typeof drawHelix   !== 'function') { errors.push('drawHelix-missing');   return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 6, 18, 255));
   print('322 RAINBOW HELIX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Rainbows — varying sizes and thicknesses
   drawRainbow(160, 320, 140, 20, 200);
   drawRainbow(400, 280, 100, 14, 180);
   drawRainbow(570, 260,  70, 10, 160);

   // Helixes — different turn counts
   drawHelix(100, 180, 35, 2, 100, rgba8(100, 200, 255, 255));
   drawHelix(240, 180, 30, 4, 120, rgba8(255, 160, 60, 255));
   drawHelix(370, 190, 28, 6,  80, rgba8(180, 255, 100, 255));
   drawHelix(480, 185, 25, 3, 110, rgba8(255, 100, 200, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
