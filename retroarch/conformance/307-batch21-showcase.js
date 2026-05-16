// Conformance cart 307: batch 21 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawNestedRects', 'fillNestedRects',
                   'drawParallelogram', 'fillParallelogram',
                   'drawTrapezoid', 'fillTrapezoid',
                   'drawConcentricPolygons', 'fillCheckerCircle',
                   'colorFromRandom', 'drawNeonLine',
                   'screenDuotone', 'gradientCircle'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 10, 255));
   printBold('307 BATCH 21', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background gradient circles
   gradientCircle(160, 180, 160, rgba8(40, 20, 100, 160), rgba8(4, 4, 10, 0), 0);
   gradientCircle(480, 180, 160, rgba8(20, 60, 100, 120), rgba8(4, 4, 10, 0), 0);

   // Filled nested rects
   fillNestedRects(20, 50, 140, 100, 4, 10, rgba8(80, 120, 220, 255), rgba8(20, 40, 100, 255));

   // Parallelogram shapes
   fillParallelogram(180, 50, 100, 60, 25, rgba8(200, 80, 60, 255));
   fillParallelogram(310, 50, 100, 60, -25, rgba8(60, 180, 120, 255));

   // Trapezoid shapes
   fillTrapezoid(440, 50, 80, 120, 60, rgba8(180, 100, 220, 255));
   drawTrapezoid(440, 50, 80, 120, 60, rgba8(220, 160, 255, 200));

   // Checker circles
   fillCheckerCircle(100, 220, 60, 10, rgba8(200, 220, 255, 255), rgba8(20, 40, 100, 255));
   fillCheckerCircle(240, 220, 50, 8,  colorFromRandom(7), colorFromRandom(77));

   // Concentric hex
   drawConcentricPolygons(380, 230, 6, 70, 5, 10, rgba8(80, 200, 255, 200));

   // Neon line grid
   for (let i = 0; i < 6; i++) {
      drawNeonLine(480+i*24, 160, 480+i*24, 310, 3, colorFromHSL(i*50, 0.9, 0.6));
   }

   // Draw content then apply duotone
   rectfill(20, 300, 250, 355, rgba8(60, 100, 60, 255));
   circfill(80, 328, 25, rgba8(200, 200, 80, 255));
   circfill(140, 328, 20, rgba8(80, 200, 200, 255));
   circfill(200, 328, 18, rgba8(200, 80, 80, 255));
   setClip(20, 300, 230, 55);
   screenDuotone(rgba8(40, 20, 80, 255), rgba8(180, 255, 180, 255));
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
