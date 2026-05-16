// Conformance cart 334: drawLabel, drawTag, fillCloud.

let errors = [];

export function init() {
   if (typeof drawLabel !== 'function') { errors.push('drawLabel-missing'); return; }
   if (typeof drawTag   !== 'function') { errors.push('drawTag-missing');   return; }
   if (typeof fillCloud !== 'function') { errors.push('fillCloud-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   print('334 LABEL TAG CLOUD', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Clouds
   fillCloud(120, 120, 160, 60, rgba8(200, 210, 230, 255));
   fillCloud(360, 100, 120, 50, rgba8(180, 200, 220, 240));
   fillCloud(530, 160, 100, 40, rgba8(190, 205, 225, 220));

   // Labels
   drawLabel(20,  200, 'PLAYER 1',  rgba8(255, 220, 80,  255), rgba8(20, 20, 60, 255));
   drawLabel(20,  220, 'SCORE 999', rgba8(100, 255, 160, 255), rgba8(10, 40, 20, 255));
   drawLabel(20,  240, 'LEVEL 5',   rgba8(100, 180, 255, 255), rgba8(10, 20, 50, 255));
   drawLabel(20,  260, 'READY',     rgba8(255, 100, 100, 255), rgba8(50, 10, 10, 255));

   // Tags
   drawTag(200, 200, 'NEW',     rgba8(255, 255, 255, 255), rgba8(200, 60, 60, 255));
   drawTag(200, 220, 'HOT',     rgba8(255, 255, 255, 255), rgba8(220, 100, 20, 255));
   drawTag(200, 240, 'BONUS',   rgba8(255, 255, 255, 255), rgba8(60, 160, 60, 255));
   drawTag(200, 260, 'SPECIAL', rgba8(255, 255, 255, 255), rgba8(80, 80, 200, 255));

   // More clouds at bottom
   fillCloud(100, 320, 140, 45, rgba8(150, 165, 190, 200));
   fillCloud(300, 330, 160, 50, rgba8(160, 175, 200, 200));
   fillCloud(500, 315, 120, 42, rgba8(145, 160, 185, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
