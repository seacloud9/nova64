// Conformance cart 513: drawRoundedRect, drawStarburst, drawCheckerboard,
//                        drawScanlines, drawCrosshair, drawPanel.

let errors = [];

export function init() {
   const needed = ['drawRoundedRect', 'drawStarburst', 'drawCheckerboard',
                   'drawScanlines', 'drawCrosshair', 'drawPanel'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 30, 255));
   print('513 DRAW SHAPES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Rounded rects — filled
   drawRoundedRect(20, 30, 100, 60, 10, rgba8(80, 140, 255, 220), true);
   drawRoundedRect(140, 30, 100, 60, 4, rgba8(200, 80, 80, 220), true);
   drawRoundedRect(260, 30, 100, 60, 20, rgba8(80, 200, 120, 220), true);

   // Rounded rect outline
   drawRoundedRect(380, 30, 100, 60, 8, rgba8(200, 200, 80, 255), false);

   // Starburst — various spike counts
   drawStarburst(60, 160, 40, 20, 5, rgba8(255, 220, 60, 255), true);
   drawStarburst(160, 160, 35, 15, 8, rgba8(255, 80, 80, 200), true);
   drawStarburst(260, 160, 40, 25, 3, rgba8(80, 200, 255, 200), false);
   drawStarburst(360, 160, 30, 10, 12, rgba8(200, 100, 255, 220), true);

   // Checkerboard patterns
   drawCheckerboard(20, 210, 120, 80, rgba8(40, 40, 80, 255), rgba8(80, 80, 160, 255), 10);
   drawCheckerboard(160, 210, 120, 80, rgba8(200, 160, 80, 255), rgba8(120, 80, 40, 255), 8);
   drawCheckerboard(300, 210, 120, 80, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255), 6);

   // Crosshairs
   drawCrosshair(480, 60, 20, rgba8(255, 255, 80, 255));
   drawCrosshair(530, 60, 12, rgba8(80, 255, 200, 255));
   drawCrosshair(570, 60, 8,  rgba8(255, 100, 100, 255));

   // Panels
   drawPanel(450, 100, 160, 80);
   drawPanel(450, 195, 160, 60, { bgColor: rgba8(20, 40, 20, 220), borderColor: rgba8(80, 200, 80, 200) });

   // Scanlines overlay on lower section
   drawCheckerboard(20, 300, 580, 50, rgba8(60, 100, 180, 255), rgba8(40, 60, 140, 255), 4);
   drawScanlines(0.4, 2);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
