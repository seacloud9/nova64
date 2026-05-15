// Conformance cart 122: screenPixelate(blockSize).

let errors = [];

export function init() {
   if (typeof screenPixelate !== 'function') {
      errors.push('screenPixelate-missing'); return;
   }
   // Calling with blockSize < 2 or > 64 should not crash
   screenPixelate(1);
   screenPixelate(100);
   screenPixelate(8);
}

let frame = 0;

export function update(dt) { frame++; }

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('122 SCREEN PIXELATE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw gradient scene
   for (let y = 40; y < 200; y++) {
      for (let x = 40; x < 280; x++) {
         pset(x, y, rgba8(
            Math.floor((x - 40) / 240 * 255),
            Math.floor((y - 40) / 160 * 255),
            180, 255));
      }
   }

   screenPixelate(6);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
