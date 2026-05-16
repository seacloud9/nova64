// Conformance cart 419: screenBokeh, colorNeon.

let errors = [];

export function init() {
   if (typeof screenBokeh !== 'function') { errors.push('screenBokeh-missing'); return; }
   if (typeof colorNeon   !== 'function') { errors.push('colorNeon-missing');   return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   print('419 BOKEH NEON', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw some circles to bokeh-blur
   for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      circfill(320 + Math.cos(ang) * 120, 200 + Math.sin(ang) * 80, 20 + i * 4,
               rgba8(60 + i * 25, 80, 200 - i * 20, 200));
   }
   circfill(320, 200, 30, rgba8(255, 200, 60, 240));

   // Apply bokeh
   screenBokeh(5);

   // Neon color swatches
   const base1 = rgba8(200, 40, 40, 255);
   const base2 = rgba8(40, 200, 40, 255);
   const base3 = rgba8(40, 40, 200, 255);
   rectfill(40, 290, 100, 340, base1);
   rectfill(40, 290, 100, 340, colorNeon(base1, 0.8));
   rectfill(140, 290, 200, 340, base2);
   rectfill(140, 290, 200, 340, colorNeon(base2, 0.8));
   rectfill(240, 290, 300, 340, base3);
   rectfill(240, 290, 300, 340, colorNeon(base3, 0.8));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
