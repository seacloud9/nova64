// Conformance cart 415: batch 30 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawMatrixRain', 'screenQuantize', 'colorFromCMYK', 'colorFromYUV',
                   'drawRipple', 'fillRipple', 'drawSparkle', 'fillSparkle',
                   'screenTilt', 'drawWireBox', 'fillWireBox', 'screenCrosshatch'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 8, 18, 255));
   printBold('415 BATCH 30', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Matrix rain
   drawMatrixRain(20, 25, 140, 320, 0.45, rgba8(0, 200, 70, 200));

   // Ripple rings
   drawRipple(250, 130, 80, 4, rgba8(80, 180, 255, 255));
   fillRipple(420, 130, 70, 3, rgba8(80, 200, 255, 180), rgba8(10, 20, 50, 200));

   // Sparkle
   drawSparkle(560, 130, 55, 8, rgba8(255, 220, 60, 255));

   // Wire boxes
   fillWireBox(180, 220, 0, 90, 70, 45, rgba8(100, 200, 100, 200));
   drawWireBox(310, 220, 10, 80, 60, 40, rgba8(255, 160, 60, 220));

   // CMYK swatches
   for (let i = 0; i < 4; i++) {
      const col = colorFromCMYK(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 0.5 : 0);
      rectfill(420 + i * 42, 220, 460 + i * 42, 260, col);
   }

   // YUV color strip
   for (let i = 0; i < 10; i++) {
      const col = colorFromYUV(0.4 + i * 0.04, (i - 5) * 0.06, (i - 5) * 0.04);
      rectfill(420 + i * 17, 270, 437 + i * 17, 290, col);
   }

   // Filled sparkle bottom
   fillSparkle(250, 310, 45, 8, rgba8(255, 140, 60, 220));

   // Crosshatch over the matrix area
   setClip(20, 25, 165, 345);
   screenCrosshatch(12, rgba8(0, 255, 80, 40));
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
