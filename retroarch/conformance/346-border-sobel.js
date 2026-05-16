// Conformance cart 346: drawBorder, fillBorder, screenSobel.

let errors = [];

export function init() {
   if (typeof drawBorder !== 'function') { errors.push('drawBorder-missing'); return; }
   if (typeof fillBorder !== 'function') { errors.push('fillBorder-missing'); return; }
   if (typeof screenSobel !== 'function') { errors.push('screenSobel-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('346 BORDER SOBEL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Borders at various thicknesses
   drawBorder(20,  40, 100, 80, 1, rgba8(100, 200, 255, 255));
   drawBorder(140, 40, 100, 80, 3, rgba8(255, 180, 60,  255));
   drawBorder(260, 40, 100, 80, 5, rgba8(180, 255, 100, 255));
   drawBorder(380, 40, 100, 80, 8, rgba8(255, 100, 200, 255));

   // fillBorder with two-tone
   fillBorder(20,  150, 120, 90, 6, rgba8(200, 100, 255, 255), rgba8(20, 10, 40,  255));
   fillBorder(160, 150, 120, 90, 4, rgba8(255, 200, 60,  255), rgba8(40, 30, 10,  255));
   fillBorder(300, 150, 120, 90, 8, rgba8(60,  200, 255, 255), rgba8(10, 20, 40,  255));

   // Sobel on a colorful scene (right half)
   rectfill(440, 40, 620, 240, rgba8(20, 20, 80, 255));
   circfill(500, 120, 40, rgba8(255, 100, 60, 255));
   circfill(570, 100, 30, rgba8(60, 200, 255, 255));
   rectfill(445, 200, 615, 230, rgba8(100, 255, 100, 255));
   setClip(440, 40, 180, 200);
   screenSobel();
   clearClip();
   print('sobel', 445, 245, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
