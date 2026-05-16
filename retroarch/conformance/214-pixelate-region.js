// Conformance cart 214: pixelateRegion(x,y,w,h,blockSize).

let errors = [];

export function init() {
   if (typeof pixelateRegion !== 'function') { errors.push('pixelateRegion-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('214 PIXELATE REGION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw gradient background
   for (let y = 40; y < 320; y++) {
      for (let x2 = 0; x2 < 640; x2 += 4) {
         const r = (x2 / 640 * 200 + 20) | 0;
         const g = (y / 320 * 180 + 40) | 0;
         const b = 160;
         rectfill(x2, y, x2 + 3, y, rgba8(r, g, b, 255));
      }
   }

   // Draw shapes on top
   circfill(160, 160, 60, rgba8(255, 80, 80, 180));
   circfill(320, 180, 50, rgba8(80, 220, 80, 180));
   circfill(480, 160, 60, rgba8(80, 80, 255, 180));

   // Pixelate with different block sizes
   pixelateRegion(20, 50, 140, 120, 4);
   print('b=4', 60, 176, rgba8(255,255,255,255));

   pixelateRegion(180, 50, 140, 120, 8);
   print('b=8', 236, 176, rgba8(255,255,255,255));

   pixelateRegion(340, 50, 140, 120, 12);
   print('b=12', 390, 176, rgba8(255,255,255,255));

   pixelateRegion(500, 50, 120, 120, 16);
   print('b=16', 542, 176, rgba8(255,255,255,255));

   print('pixelate region: block sizes 4/8/12/16', 8, 300, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
