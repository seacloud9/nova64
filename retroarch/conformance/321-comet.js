// Conformance cart 321: drawComet, fillComet.

let errors = [];

export function init() {
   if (typeof drawComet !== 'function') { errors.push('drawComet-missing'); return; }
   if (typeof fillComet !== 'function') { errors.push('fillComet-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 12, 255));
   print('321 COMET', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Star field
   for (let i = 0; i < 80; i++) {
      pset((i * 197) % 630 + 5, (i * 131) % 350 + 5,
           rgba8(200, 220, 255, (i % 2 === 0) ? 200 : 80));
   }

   // Filled comets
   fillComet(20,  80, 300, 80,  12, rgba8(255, 200, 80,  255));
   fillComet(20, 180, 320, 160,  8, rgba8(100, 200, 255, 255));
   fillComet(580, 260, 200, 300, 10, rgba8(200, 100, 255, 255));

   // Outlined comets
   drawComet(40,  280, 260, 300, 10, rgba8(255, 120, 80, 220));
   drawComet(600, 100, 400, 120,  7, rgba8(120, 255, 160, 200));

   // Small comet ring
   for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const ex = 490 + Math.cos(ang) * 60;
      const ey = 200 + Math.sin(ang) * 60;
      fillComet(490, 200, ex, ey, 5, colorFromHSL(i * 72, 0.9, 0.6));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
