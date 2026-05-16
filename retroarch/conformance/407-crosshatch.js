// Conformance cart 407: screenCrosshatch.

let errors = [];

export function init() {
   if (typeof screenCrosshatch !== 'function') { errors.push('screenCrosshatch-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(14, 10, 24, 255));
   print('407 CROSSHATCH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background shapes to show crosshatch over
   for (let i = 0; i < 6; i++) {
      circfill(80 + i * 100, 200, 40, rgba8(40 + i * 30, 60, 180 - i * 20, 200));
   }

   // Crosshatch overlay
   screenCrosshatch(20, rgba8(200, 200, 255, 80));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
