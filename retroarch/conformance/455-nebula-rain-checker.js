// Conformance cart 455: drawNebula, drawRainDrop, drawCheckerFade.

let errors = [];

export function init() {
   if (typeof drawNebula      !== 'function') { errors.push('drawNebula-missing');      return; }
   if (typeof drawRainDrop    !== 'function') { errors.push('drawRainDrop-missing');    return; }
   if (typeof drawCheckerFade !== 'function') { errors.push('drawCheckerFade-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 16, 255));
   print('455 NEBULA RAIN CHECKER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Nebulae
   drawNebula(150, 180, 110, rgba8(100, 40, 180, 220));
   drawNebula(380, 180, 90, rgba8(40, 120, 200, 200));
   drawNebula(560, 180, 70, rgba8(180, 60, 100, 180));

   // Checker fade
   drawCheckerFade(20, 280, 580, 70, 16, rgba8(200, 200, 255, 255), rgba8(30, 30, 80, 255));

   // Rain drops
   for (let i = 0; i < 30; i++) {
      const xd = 30 + (i * 47) % 560;
      const yd = 30 + (i * 31) % 240;
      drawRainDrop(xd, yd, 15 + (i % 3) * 5, rgba8(100, 160, 255, 160));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
