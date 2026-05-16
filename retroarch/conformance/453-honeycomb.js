// Conformance cart 453: drawHoneycomb, fillHoneycomb.

let errors = [];

export function init() {
   if (typeof drawHoneycomb !== 'function') { errors.push('drawHoneycomb-missing'); return; }
   if (typeof fillHoneycomb !== 'function') { errors.push('fillHoneycomb-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 6, 18, 255));
   print('453 HONEYCOMB', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled honeycomb
   fillHoneycomb(20, 30, 300, 300, 22, rgba8(220, 150, 40, 200), rgba8(180, 110, 20, 200));

   // Outline honeycomb
   drawHoneycomb(340, 30, 270, 300, 18, rgba8(80, 180, 255, 220));

   // Small honeycomb
   fillHoneycomb(340, 30, 270, 300, 12, rgba8(100, 60, 200, 120), rgba8(60, 40, 160, 120));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
