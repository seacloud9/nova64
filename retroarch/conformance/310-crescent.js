// Conformance cart 310: drawCrescent, fillCrescent.

let errors = [];

export function init() {
   if (typeof drawCrescent !== 'function') { errors.push('drawCrescent-missing'); return; }
   if (typeof fillCrescent !== 'function') { errors.push('fillCrescent-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 20, 255));
   print('310 CRESCENT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled crescents — varying offset and size
   fillCrescent(100, 180, 70, 20, rgba8(230, 220, 140, 255));  // yellow moon
   fillCrescent(260, 180, 60, 15, rgba8(180, 200, 255, 255));  // blue moon
   fillCrescent(420, 180, 80, 30, rgba8(255, 160, 100, 255));  // orange moon

   // Outline crescents
   drawCrescent(100, 180, 70, 20, rgba8(255, 240, 180, 160));
   drawCrescent(260, 180, 60, 15, rgba8(140, 170, 255, 160));
   drawCrescent(420, 180, 80, 30, rgba8(255, 200, 140, 160));

   // Different offsets: small to large
   for (let i = 0; i < 6; i++) {
      fillCrescent(80 + i * 100, 320, 35, i * 6 + 2, colorFromHSL(i * 40 + 20, 0.8, 0.65));
   }

   // Star field behind crescents
   for (let i = 0; i < 80; i++) {
      const sx = (i * 197) % 620 + 10;
      const sy = (i * 131) % 340 + 10;
      pset(sx, sy, rgba8(200, 220, 255, (i % 3 === 0) ? 255 : 120));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
