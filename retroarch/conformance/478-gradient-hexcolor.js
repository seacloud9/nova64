// Conformance cart 478: drawGradient, drawRadialGradient, drawSkyGradient, hexColor.

let errors = [];

export function init() {
   const needed = ['drawGradient', 'drawRadialGradient', 'drawSkyGradient', 'hexColor'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   // Sky gradient as background
   drawSkyGradient(rgba8(10, 10, 50, 255), rgba8(40, 100, 180, 255));

   print('478 GRADIENT HEXCOLOR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal gradient
   drawGradient(20, 30, 280, 50, rgba8(255, 60, 60, 255), rgba8(60, 60, 255, 255), 'horizontal');

   // Vertical gradient
   drawGradient(320, 30, 120, 120, rgba8(80, 200, 80, 255), rgba8(200, 80, 200, 255), 'vertical');

   // Radial gradient
   drawRadialGradient(160, 200, 80, rgba8(255, 220, 60, 255), rgba8(60, 40, 120, 0));

   // hexColor — string form
   const hc1 = hexColor('#FF8800', 255);
   const hc2 = hexColor('0044CC', 200);
   const hc3 = hexColor(0x22BB44, 180);
   rectfill(300, 160, 360, 200, hc1);
   rectfill(370, 160, 430, 200, hc2);
   rectfill(440, 160, 500, 200, hc3);

   // Gradient used as bar overlay
   drawGradient(20, 290, 580, 30, rgba8(255, 255, 255, 0), rgba8(0, 0, 0, 180), 0);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
