// Conformance cart 463: batch 34 APIs combined showcase — FINAL BATCH.

let errors = [];

export function init() {
   const needed = ['drawAurora', 'fillAurora', 'drawWindmill', 'fillWindmill',
                   'drawHoneycomb', 'fillHoneycomb', 'screenChromaShift', 'colorSaturate2',
                   'drawNebula', 'drawRainDrop', 'drawCheckerFade', 'colorAdjust'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 4, 16, 255));
   printBold('463 BATCH 34', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Aurora sky
   fillAurora(20, 22, 600, 80, 3, rgba8(30, 200, 120, 160));
   drawAurora(20, 22, 600, 80, 2, rgba8(60, 255, 160, 200));

   // Nebulae
   drawNebula(130, 200, 85, rgba8(80, 40, 180, 200));
   drawNebula(320, 200, 70, rgba8(40, 100, 200, 180));

   // Honeycomb grid
   fillHoneycomb(450, 110, 180, 220, 18, rgba8(200, 140, 40, 180), rgba8(160, 100, 20, 180));
   drawHoneycomb(450, 110, 180, 220, 18, rgba8(255, 200, 80, 120));

   // Windmill
   fillWindmill(130, 310, 55, 4, Math.PI * 0.15, rgba8(200, 200, 80, 200));
   drawWindmill(130, 310, 55, 4, Math.PI * 0.15, rgba8(255, 255, 140, 240));

   // Checker fade band
   drawCheckerFade(20, 340, 430, 18, 14, rgba8(180, 200, 255, 200), rgba8(20, 20, 60, 200));

   // Rain drops scattered
   for (let i = 0; i < 20; i++) {
      const xd = 20 + (i * 53) % 420;
      const yd = 115 + (i * 37) % 210;
      drawRainDrop(xd, yd, 14 + (i % 4) * 4, rgba8(100, 160, 255, 130));
   }

   // colorAdjust / saturate row
   const base = rgba8(180, 60, 200, 255);
   for (let i = 0; i < 8; i++) {
      rectfill(20 + i * 22, 110, 40 + i * 22, 130, colorAdjust(base, i * 45, 0, 0));
      rectfill(20 + i * 22, 133, 40 + i * 22, 153, colorSaturate2(base, 0.5 + i * 0.25));
   }

   // Chroma shift right half
   setClip(460, 110, 625, 330);
   screenChromaShift(4);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
