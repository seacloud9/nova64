// Conformance cart 451: batch 33 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawMeteor', 'drawCorona', 'fillCorona', 'drawCrystal', 'fillCrystal',
                   'screenCRT', 'colorClamp2', 'drawSpiralGalaxy', 'drawOrbit', 'drawAtom',
                   'drawRadar', 'drawSunburst'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 4, 16, 255));
   printBold('451 BATCH 33', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Galaxy background
   drawSpiralGalaxy(320, 190, 160, 2, rgba8(140, 160, 220, 140));

   // Corona / sun
   fillCorona(100, 110, 60, 10, rgba8(255, 200, 60, 220));
   drawCorona(100, 110, 62, 10, rgba8(255, 240, 120, 180));

   // Crystals
   fillCrystal(530, 110, 55, 6, rgba8(100, 180, 255, 180));
   drawCrystal(530, 110, 55, 6, rgba8(180, 220, 255, 220));

   // Orbits (solar system)
   drawOrbit(320, 190, 110, Math.PI * 0.7, 7, rgba8(255, 200, 80, 255));
   drawOrbit(320, 190, 75, Math.PI * 2.1, 5, rgba8(200, 100, 255, 255));
   drawOrbit(320, 190, 40, Math.PI * 0.3, 4, rgba8(100, 220, 255, 255));
   circfill(320, 190, 12, rgba8(255, 220, 80, 255));

   // Meteors
   for (let i = 0; i < 4; i++) {
      drawMeteor(600 - i * 60, 25 + i * 20, 70, Math.PI * 0.65, rgba8(255, 180 - i * 20, 80, 200));
   }

   // Atom
   drawAtom(90, 290, 55, 3, rgba8(80, 200, 255, 200));

   // Radar
   drawRadar(250, 300, 60, Math.PI * 0.8, rgba8(0, 220, 100, 220));

   // Sunburst
   drawSunburst(430, 300, 55, 20, rgba8(255, 220, 60, 220));

   // colorClamp2 row
   for (let i = 0; i < 6; i++) {
      const col = colorClamp2(rgba8(255, 255, 255, 255), 0.2 + i * 0.1, 0.4 + i * 0.1);
      rectfill(530 + i * 14, 270, 542 + i * 14, 295, col);
   }

   // CRT effect on right region
   setClip(460, 25, 625, 170);
   screenCRT(0.35);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
