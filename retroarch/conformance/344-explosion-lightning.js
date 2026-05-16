// Conformance cart 344: drawExplosion, fillExplosion, drawLightning.

let errors = [];

export function init() {
   if (typeof drawExplosion !== 'function') { errors.push('drawExplosion-missing'); return; }
   if (typeof fillExplosion !== 'function') { errors.push('fillExplosion-missing'); return; }
   if (typeof drawLightning !== 'function') { errors.push('drawLightning-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   print('344 EXPLOSION LIGHTNING', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled explosions
   fillExplosion(100, 180, 70, 8,  rgba8(255, 200, 40,  255));
   fillExplosion(260, 180, 60, 12, rgba8(255, 100, 40,  255));
   fillExplosion(420, 180, 65, 6,  rgba8(200, 60,  255, 255));

   // Outlined on top
   drawExplosion(100, 180, 70, 8,  rgba8(255, 255, 150, 200));
   drawExplosion(260, 180, 60, 12, rgba8(255, 200, 100, 200));
   drawExplosion(420, 180, 65, 6,  rgba8(220, 120, 255, 200));

   // Lightning bolts
   drawLightning(20,  50, 200, 320, 8, rgba8(200, 220, 255, 255));
   drawLightning(550, 40, 400, 330, 6, rgba8(255, 220, 80,  255));
   drawLightning(280, 30, 350, 340, 10, rgba8(100, 255, 200, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
