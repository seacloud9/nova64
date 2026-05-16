// Conformance cart 238: batch 15 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['copyPixels', 'colorAddRGB', 'drawLozenge', 'fillLozenge',
                   'drawSpiral', 'colorWarm', 'colorCool', 'easeExpo',
                   'easePower', 'fillTriGradient', 'invertRegion', 'screenRetro'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   printBold('238 BATCH 15', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Gouraud triangle showcase (left)
   fillTriGradient(
      60,  40,  rgba8(255, 60, 60,  255),
      20,  180, rgba8(60, 200, 60,  255),
      140, 180, rgba8(60, 80,  255, 255)
   );
   fillTriGradient(
      60,  40,  rgba8(255, 60, 60,  255),
      140, 180, rgba8(60, 80,  255, 255),
      180, 60,  rgba8(255, 220, 60, 255)
   );

   // Spiral cluster
   drawSpiral(320, 110, 0, 60, 4, rgba8(100, 200, 255, 255));
   drawSpiral(320, 110, 5, 55, 4, rgba8(255, 160, 60, 180));

   // Lozenge pattern
   for (let i = 0; i < 5; i++) {
      const c = colorShift(rgba8(200, 80, 80, 255), i * 72);
      fillLozenge(480 + (i % 3 - 1) * 36, 80 + Math.floor(i / 3) * 44, 30, 38, c);
      drawLozenge(480 + (i % 3 - 1) * 36, 80 + Math.floor(i / 3) * 44, 30, 38,
                  colorAddRGB(c, 60, 60, 60));
   }

   // Warm/cool strip
   for (let i = 0; i < 8; i++) {
      const base = rgba8(160, 130, 100, 255);
      const t = i / 7;
      rectfill(20 + i * 72, 215, 84 + i * 72, 245, i < 4 ? colorWarm(base, t * 2) : colorCool(base, (t - 0.5) * 2));
   }
   print('warm', 50, 252, rgba8(255, 160, 80, 255));
   print('cool', 380, 252, rgba8(80, 160, 255, 255));

   // easing curves mini
   const ox = 20, oy = 340, W = 280, H = 60;
   for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const xe = ox + (t * W) | 0;
      pset(xe, oy - (easeExpo(t) * H) | 0, rgba8(255, 100, 60, 255));
      pset(xe, oy - (easePower(t, 3) * H) | 0, rgba8(100, 220, 100, 255));
   }

   // Copy region effect
   rectfill(340, 268, 600, 340, rgba8(30, 50, 100, 255));
   for (let i = 0; i < 5; i++) {
      circfill(370 + i * 48, 304, 16, colorShift(rgba8(200, 100, 60, 255), i * 72));
   }
   copyPixels(340, 268, 350, 278, 100, 50);
   invertRegion(460, 268, 130, 72);

   screenRetro(0.4);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
