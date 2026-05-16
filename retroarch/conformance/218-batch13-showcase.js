// Conformance cart 218: batch 13 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['colorWithAlpha', 'drawCapsule', 'fillCapsule', 'drawRing',
                   'blurRegion', 'drawGradientLine', 'colorContrast',
                   'pixelateRegion', 'fillPlus', 'drawTextVertical',
                   'drawStar', 'fillStar'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   printBold('218 BATCH 13', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Gradient lines background
   for (let i = 0; i < 8; i++) {
      const y2 = 30 + i * 40;
      drawGradientLine(0, y2, 640, y2,
         colorWithAlpha(rgba8(80, 120, 200, 255), 40),
         colorWithAlpha(rgba8(200, 80, 120, 255), 40));
   }

   // Stars cluster
   fillStar(80,  120, 34, 14, 5, rgba8(220, 180, 40, 255));
   drawStar(80,  120, 34, 14, 5, rgba8(255, 230, 100, 255));
   fillStar(140, 100, 22, 9,  5, colorContrast(rgba8(220, 180, 40, 255), 1.4));
   fillStar(50,  100, 18, 7,  5, colorContrast(rgba8(220, 180, 40, 255), 0.7));

   // Capsule health bars
   fillCapsule(200, 90, 420, 90, 12, rgba8(30, 60, 30, 255));
   fillCapsule(200, 90, 340, 90, 12, rgba8(60, 200, 80, 255));
   drawCapsule(200, 90, 420, 90, 12, rgba8(100, 255, 120, 255));
   print('HP', 434, 84, rgba8(100, 220, 100, 255));

   // Ring indicator
   drawRing(540, 120, 28, 38, rgba8(60, 140, 255, 255));
   drawRing(540, 120, 18, 26, rgba8(60, 100, 200, 255));
   fillStar(540, 120, 14, 6, 6, rgba8(100, 200, 255, 255));

   // Blur + pixelate panels
   for (let i = 0; i < 8; i++) {
      rectfill(20 + i * 72, 165, 80 + i * 72, 225, rgba8(40 + i*20, 100, 200 - i*20, 255));
      circfill(56 + i * 72, 195, 22, rgba8(255, 100 + i*18, 60, 180));
   }
   blurRegion(20, 165, 292, 60, 3);
   pixelateRegion(324, 165, 292, 60, 6);
   print('blur', 140, 230, rgba8(200, 220, 255, 255));
   print('pixelate', 420, 230, rgba8(200, 220, 255, 255));

   // Plus/cross pattern
   for (let i = 0; i < 6; i++) {
      fillPlus(50 + i * 86, 285, 16, 4, colorWithAlpha(rgba8(255, 200, 80, 255), 180 - i*20));
   }

   // Vertical text labels
   drawTextVertical('BATCH13', 610, 30, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
