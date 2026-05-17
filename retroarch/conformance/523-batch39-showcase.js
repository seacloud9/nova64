// Conformance cart 523: batch 39 combined showcase.

let errors = [];

export function init() {
   const needed = ['dist', 'dist3d', 'remap', 'deg2rad', 'rad2deg', 'pulse',
                   'drawRoundedRect', 'drawStarburst', 'drawCheckerboard',
                   'drawScanlines', 'drawCrosshair', 'drawPanel'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('523 BATCH 39', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Checkerboard field as background
   drawCheckerboard(0, 20, 640, 340, rgba8(12, 12, 30, 255), rgba8(18, 18, 45, 255), 20);

   // Distance-based star field
   const stars = [[120, 120], [320, 180], [520, 100], [200, 250], [440, 240]];
   const starColors = [rgba8(255,220,60,255), rgba8(80,200,255,255), rgba8(255,100,200,255),
                       rgba8(120,255,100,255), rgba8(200,180,255,255)];
   for (let si = 0; si < 5; si++) {
      const spikes = 5 + si;
      const outerR = 25 + si * 6;
      const innerR = Math.floor(outerR * 0.45);
      drawStarburst(stars[si][0], stars[si][1], outerR, innerR, spikes, starColors[si], true);
   }

   // Pulse-driven ring of crosshairs
   for (let ci = 0; ci < 8; ci++) {
      const angle = deg2rad(ci * 45);
      const p = pulse(ci / 8, 1);
      const r = 80 + p * 20;
      const cx = 320 + Math.floor(r * Math.cos(angle));
      const cy = 190 + Math.floor(r * Math.sin(angle));
      drawCrosshair(cx, cy, 6 + Math.floor(p * 6), lerpColor(rgba8(255,200,60,180), rgba8(60,160,255,180), ci/7));
   }

   // Panels row with remap-based fill indicators
   for (let pi = 0; pi < 4; pi++) {
      const val = (pi + 1) * 25;
      drawPanel(20 + pi * 150, 290, 130, 50);
      drawHealthBar(30 + pi * 150, 316, 110, 12, val, 100);
      print(String(val) + '%', 30 + pi * 150, 300, rgba8(200, 220, 255, 255));
   }

   // Rounded rect corners to frame the scene
   drawRoundedRect(10, 18, 620, 344, 8, rgba8(100, 140, 220, 180), false);

   // Scanlines overlay
   drawScanlines(0.25, 3);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
