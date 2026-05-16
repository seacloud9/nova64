// Conformance cart 356: drawStar2, fillStar2, drawRosette, fillRosette.

let errors = [];

export function init() {
   if (typeof drawStar2   !== 'function') { errors.push('drawStar2-missing');   return; }
   if (typeof fillStar2   !== 'function') { errors.push('fillStar2-missing');   return; }
   if (typeof drawRosette !== 'function') { errors.push('drawRosette-missing'); return; }
   if (typeof fillRosette !== 'function') { errors.push('fillRosette-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('356 STAR2 ROSETTE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled stars — different n and ratio
   fillStar2(80,  160, 60, 5, 0.38, rgba8(255, 200, 40, 255));
   fillStar2(220, 160, 55, 7, 0.5,  rgba8(100, 200, 255, 255));
   fillStar2(360, 160, 60, 4, 0.6,  rgba8(180, 100, 255, 255));
   fillStar2(490, 160, 50, 9, 0.45, rgba8(80, 255, 160, 255));

   // Outlines on top
   drawStar2(80,  160, 60, 5, 0.38, rgba8(255, 240, 140, 200));
   drawStar2(220, 160, 55, 7, 0.5,  rgba8(160, 220, 255, 200));
   drawStar2(360, 160, 60, 4, 0.6,  rgba8(220, 160, 255, 200));
   drawStar2(490, 160, 50, 9, 0.45, rgba8(140, 255, 200, 200));

   // Rosettes — different k values
   fillRosette(80,  300, 50, 3, rgba8(255, 100, 60, 180));
   fillRosette(220, 300, 50, 4, rgba8(60, 160, 255, 180));
   fillRosette(360, 300, 50, 5, rgba8(180, 255, 60, 180));
   fillRosette(490, 300, 50, 7, rgba8(255, 60, 200, 180));
   drawRosette(80,  300, 50, 3, rgba8(255, 160, 120, 220));
   drawRosette(220, 300, 50, 4, rgba8(120, 200, 255, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
