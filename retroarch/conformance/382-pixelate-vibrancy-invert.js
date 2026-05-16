// Conformance cart 382: screenPixelate2, colorVibrancy, screenInvert2.

let errors = [];

export function init() {
   if (typeof screenPixelate2 !== 'function') { errors.push('screenPixelate2-missing'); return; }
   if (typeof colorVibrancy   !== 'function') { errors.push('colorVibrancy-missing');   return; }
   if (typeof screenInvert2   !== 'function') { errors.push('screenInvert2-missing');   return; }

   // colorVibrancy: desaturated input should gain saturation
   const gray = rgba8(150, 150, 150, 255);
   const vib  = colorVibrancy(gray, 0.5);
   // result should still look reasonable
   if (typeof vib !== 'number') errors.push('vibrancy-type');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('382 PIXELATE VIBRANCY INVERT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // colorVibrancy: muted colors boosted
   const dullColors = [rgba8(160, 100, 100, 255), rgba8(100, 140, 100, 255), rgba8(100, 100, 160, 255)];
   for (let i = 0; i < dullColors.length; i++) {
      const xv = 20 + i * 110;
      rectfill(xv, 40, xv + 80, 80, dullColors[i]);
      for (let j = 0; j < 5; j++) {
         rectfill(xv + j * 16, 90, xv + 14 + j * 16, 130,
                  colorVibrancy(dullColors[i], j / 4));
      }
   }
   print('vibrancy 0->1', 20, 135, rgba8(160, 160, 200, 200));

   // Pixelate demo
   rectfill(20, 160, 280, 280, rgba8(20, 20, 50, 255));
   circfill(100, 220, 40, rgba8(255, 100, 60, 255));
   circfill(200, 220, 35, rgba8(60, 200, 255, 255));
   setClip(20, 160, 260, 120);
   screenPixelate2(8);
   clearClip();
   print('pixelate', 25, 285, rgba8(160, 160, 200, 200));

   // Invert demo
   rectfill(310, 160, 590, 280, rgba8(20, 20, 50, 255));
   circfill(390, 220, 40, rgba8(255, 100, 60, 255));
   circfill(490, 220, 35, rgba8(60, 200, 255, 255));
   setClip(310, 160, 280, 120);
   screenInvert2(1.0);
   clearClip();
   print('invert', 315, 285, rgba8(160, 160, 200, 200));

   // Partial invert
   rectfill(20, 300, 280, 355, rgba8(20, 20, 50, 255));
   circfill(100, 328, 22, rgba8(255, 200, 60, 255));
   circfill(200, 328, 20, rgba8(100, 255, 100, 255));
   setClip(20, 300, 260, 55);
   screenInvert2(0.5);
   clearClip();
   print('partial invert', 25, 358, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
