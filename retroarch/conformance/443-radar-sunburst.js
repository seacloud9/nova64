// Conformance cart 443: drawRadar, drawSunburst.

let errors = [];

export function init() {
   if (typeof drawRadar    !== 'function') { errors.push('drawRadar-missing');    return; }
   if (typeof drawSunburst !== 'function') { errors.push('drawSunburst-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 8, 6, 255));
   print('443 RADAR SUNBURST', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Radar displays
   drawRadar(140, 200, 100, Math.PI * 0.4, rgba8(0, 220, 100, 255));
   drawRadar(360, 200, 90, Math.PI * 1.2, rgba8(80, 255, 160, 220));
   drawRadar(540, 200, 70, Math.PI * 2.6, rgba8(0, 200, 80, 200));

   // Sunbursts
   drawSunburst(130, 330, 55, 16, rgba8(255, 220, 60, 255));
   drawSunburst(280, 330, 50, 24, rgba8(255, 160, 60, 220));
   drawSunburst(430, 330, 45, 8, rgba8(255, 200, 100, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
