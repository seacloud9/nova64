// Conformance cart 440: drawMeteor, drawCorona, fillCorona.

let errors = [];

export function init() {
   if (typeof drawMeteor  !== 'function') { errors.push('drawMeteor-missing');  return; }
   if (typeof drawCorona  !== 'function') { errors.push('drawCorona-missing');  return; }
   if (typeof fillCorona  !== 'function') { errors.push('fillCorona-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 2, 14, 255));
   print('440 METEOR CORONA', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Meteors
   for (let i = 0; i < 6; i++) {
      drawMeteor(580 - i * 70, 30 + i * 40, 90, Math.PI * 0.7, rgba8(255, 200 - i * 20, 100, 220));
   }

   // Filled corona (sun)
   fillCorona(160, 230, 70, 12, rgba8(255, 200, 60, 230));

   // Outline coronas
   drawCorona(360, 230, 65, 8, rgba8(255, 160, 60, 220));
   drawCorona(520, 230, 55, 16, rgba8(255, 220, 100, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
