// Conformance cart 284: drawTarget, fillTarget, drawSpiderWeb.

let errors = [];

export function init() {
   if (typeof drawTarget    !== 'function') { errors.push('drawTarget-missing');    return; }
   if (typeof fillTarget    !== 'function') { errors.push('fillTarget-missing');    return; }
   if (typeof drawSpiderWeb !== 'function') { errors.push('drawSpiderWeb-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('284 TARGET SPIDER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Target outlines
   drawTarget(100, 150, 80, 5, rgba8(200, 80, 80, 255));
   drawTarget(280, 150, 60, 4, rgba8(80, 200, 120, 255));
   drawTarget(430, 150, 50, 3, rgba8(100, 160, 255, 255));

   // Filled bullseyes
   fillTarget(120, 300, 70, 5, rgba8(200, 40, 40, 255), rgba8(255, 255, 240, 255));
   fillTarget(280, 300, 55, 4, rgba8(40, 160, 60, 255), rgba8(200, 255, 220, 255));
   fillTarget(430, 300, 45, 3, rgba8(60, 80, 200, 255), rgba8(200, 220, 255, 255));

   // Spider webs
   drawSpiderWeb(560, 120, 55, 4, 8, rgba8(200, 220, 240, 160));
   drawSpiderWeb(580, 260, 40, 3, 6, rgba8(180, 200, 220, 140));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
