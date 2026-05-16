// Conformance cart 439: batch 32 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawDotGrid', 'fillDotGrid', 'drawZigzag', 'fillZigzag',
                   'drawBullseye', 'fillBullseye', 'drawNeedle', 'screenVHS',
                   'colorCycle', 'drawConveyorBelt', 'screenEcho', 'drawArcArrow'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('439 BATCH 32', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled dot grid background
   fillDotGrid(20, 25, 250, 170, 12, rgba8(80, 120, 200, 160), rgba8(8, 10, 30, 255));

   // Bullseye
   fillBullseye(130, 110, 80, 4, rgba8(200, 40, 40, 240), rgba8(240, 240, 240, 200));

   // Dot grid overlay
   drawDotGrid(20, 25, 250, 170, 18, rgba8(255, 220, 60, 80));

   // Zigzag bands
   fillZigzag(280, 25, 330, 50, 18, 5, rgba8(80, 160, 255, 180));
   drawZigzag(280, 55, 330, 16, 6, rgba8(200, 255, 100, 220));

   // Bullseye right
   drawBullseye(470, 110, 80, 5, rgba8(80, 200, 255, 255));

   // Conveyor belt
   drawConveyorBelt(20, 210, 580, 22, 0, rgba8(180, 160, 80, 220));

   // Arc arrows
   drawArcArrow(130, 310, 65, -Math.PI * 0.7, Math.PI * 0.7, rgba8(100, 220, 100, 255));
   drawArcArrow(320, 310, 55, 0, Math.PI * 1.6, rgba8(255, 140, 60, 255));

   // Needles
   for (let i = 0; i < 4; i++) {
      drawNeedle(440 + i * 47, 310, 38, (-0.6 + i * 0.4) * Math.PI, rgba8(255, 80 + i * 40, 60, 255));
   }

   // Color cycle row
   for (let i = 0; i < 8; i++) {
      const col = colorCycle(rgba8(200, 60, 60, 255), i * 45);
      rectfill(20 + i * 35, 245, 52 + i * 35, 265, col);
   }

   // VHS over left region
   setClip(20, 25, 270, 200);
   screenVHS(0.5);
   clearClip();

   // Echo over right region
   setClip(280, 25, 610, 200);
   screenEcho(4, 2, 0.3);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
