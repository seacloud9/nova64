// Conformance cart 264: screenCRTWarp, screenOilPaint.

let errors = [];

export function init() {
   if (typeof screenCRTWarp  !== 'function') { errors.push('screenCRTWarp-missing');  return; }
   if (typeof screenOilPaint !== 'function') { errors.push('screenOilPaint-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('264 CRT + OIL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw test scene in two panels
   for (let panel = 0; panel < 2; panel++) {
      const px = 20 + panel * 310;
      rectfill(px, 40, px+280, 320, rgba8(20, 40, 80, 255));
      circfill(px+140, 120, 60, rgba8(200, 120, 60, 255));
      circfill(px+80,  200, 40, rgba8(60, 200, 180, 255));
      circfill(px+200, 220, 35, rgba8(200, 80, 200, 255));
      for (let i = 0; i < 5; i++) {
         rectfill(px+20+i*48, 270, px+60+i*48, 310, colorFromHSL(i*72, 0.8, 0.5));
      }
   }

   // Apply CRT warp to left panel
   setClip(20, 40, 280, 280);
   screenCRTWarp(0.4);
   clearClip();
   print('CRT warp', 100, 326, rgba8(140, 180, 220, 255));

   // Apply oil paint to right panel
   setClip(330, 40, 280, 280);
   screenOilPaint(3);
   clearClip();
   print('oil paint', 415, 326, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
