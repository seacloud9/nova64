// Conformance cart 273: screenBrightnessContrast, screenGlitch.

let errors = [];

export function init() {
   if (typeof screenBrightnessContrast !== 'function') { errors.push('screenBrightnessContrast-missing'); return; }
   if (typeof screenGlitch             !== 'function') { errors.push('screenGlitch-missing');             return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('273 SCREEN EFFECTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw test panels
   for (let panel = 0; panel < 3; panel++) {
      const px = 20 + panel * 204;
      rectfill(px, 40, px+180, 200, rgba8(30, 50, 100, 255));
      circfill(px+90, 120, 50, rgba8(180, 100, 60, 255));
      circfill(px+50, 80,  30, rgba8(60, 180, 220, 255));
      circfill(px+130, 160, 25, rgba8(180, 220, 60, 255));
      print('TEST', px+50, 110, rgba8(255, 255, 255, 255));
   }

   // Panel 1: brightness boost
   setClip(20, 40, 184, 161);
   screenBrightnessContrast(0.2, 1.0);
   clearClip();
   print('bright+', 70, 208, rgba8(140, 180, 220, 255));

   // Panel 2: high contrast
   setClip(224, 40, 184, 161);
   screenBrightnessContrast(0.0, 2.0);
   clearClip();
   print('contrast+', 258, 208, rgba8(140, 180, 220, 255));

   // Panel 3: glitch
   setClip(428, 40, 180, 161);
   screenGlitch(6);
   clearClip();
   print('glitch', 468, 208, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
