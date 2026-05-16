// Conformance cart 429: drawBullseye, fillBullseye, drawNeedle.

let errors = [];

export function init() {
   if (typeof drawBullseye !== 'function') { errors.push('drawBullseye-missing'); return; }
   if (typeof fillBullseye !== 'function') { errors.push('fillBullseye-missing'); return; }
   if (typeof drawNeedle   !== 'function') { errors.push('drawNeedle-missing');   return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 6, 18, 255));
   print('429 BULLSEYE NEEDLE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bullseyes
   fillBullseye(140, 190, 100, 5, rgba8(200, 40, 40, 240), rgba8(240, 240, 240, 240));
   drawBullseye(360, 190, 90, 4, rgba8(80, 180, 255, 255));
   fillBullseye(530, 190, 70, 3, rgba8(60, 200, 60, 220), rgba8(20, 60, 20, 200));

   // Needles (gauges)
   const angles = [-Math.PI * 0.4, 0, Math.PI * 0.3, Math.PI * 0.6];
   for (let i = 0; i < angles.length; i++) {
      drawNeedle(100 + i * 130, 320, 50, angles[i], rgba8(255, 80 + i * 40, 60, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
