// Conformance cart 144: screenDissolve(t) — ordered Bayer dither dissolve.

let errors = [];

export function init() {
   if (typeof screenDissolve !== 'function') {
      errors.push('screenDissolve-missing');
   }
   // t=1 should be no-op (full image visible), t=0 all black
   screenDissolve(1);
   screenDissolve(0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('144 SCREEN DISSOLVE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw colored rectangle, dissolve at ~50%
   rectfill(50, 50, 270, 200, rgba8(80, 160, 240, 255));
   printCentered('dissolve effect', 160, 125, rgba8(255, 255, 200, 255));
   screenDissolve(0.5);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
