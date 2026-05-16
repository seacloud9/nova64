// Conformance cart 452: drawAurora, fillAurora, drawWindmill, fillWindmill.

let errors = [];

export function init() {
   if (typeof drawAurora   !== 'function') { errors.push('drawAurora-missing');   return; }
   if (typeof fillAurora   !== 'function') { errors.push('fillAurora-missing');   return; }
   if (typeof drawWindmill !== 'function') { errors.push('drawWindmill-missing'); return; }
   if (typeof fillWindmill !== 'function') { errors.push('fillWindmill-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 6, 18, 255));
   print('452 AURORA WINDMILL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Aurora bands
   fillAurora(20, 30, 600, 100, 4, rgba8(40, 220, 120, 180));
   drawAurora(20, 30, 600, 100, 3, rgba8(80, 255, 160, 220));

   // Windmills
   fillWindmill(140, 270, 80, 4, Math.PI * 0.1, rgba8(200, 200, 80, 200));
   drawWindmill(140, 270, 80, 4, Math.PI * 0.1, rgba8(255, 255, 140, 255));

   fillWindmill(350, 270, 70, 3, Math.PI * 0.3, rgba8(100, 180, 255, 200));
   drawWindmill(350, 270, 70, 3, Math.PI * 0.3, rgba8(160, 220, 255, 255));

   fillWindmill(530, 270, 60, 6, Math.PI * 0.05, rgba8(255, 120, 80, 180));
   drawWindmill(530, 270, 60, 6, Math.PI * 0.05, rgba8(255, 180, 140, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
