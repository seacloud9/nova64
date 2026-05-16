// Conformance cart 237: screenRetro(strength).

let errors = [];

export function init() {
   if (typeof screenRetro !== 'function') { errors.push('screenRetro-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('237 SCREEN RETRO', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a colorful scene
   clsGradient(rgba8(20, 30, 80, 255), rgba8(60, 10, 40, 255), 1);

   for (let i = 0; i < 6; i++) {
      const x = 60 + i * 90, y = 160;
      const c = colorShift(rgba8(255, 100, 60, 255), i * 60);
      circfill(x, y, 40, c);
   }

   fillStar(180, 100, 50, 20, 5, rgba8(255, 220, 60, 255));
   drawStar(180, 100, 50, 20, 5, rgba8(255, 255, 100, 255));

   fillStar(460, 100, 50, 20, 6, rgba8(100, 180, 255, 255));
   drawStar(460, 100, 50, 20, 6, rgba8(180, 240, 255, 255));

   for (let i = 0; i < 10; i++) {
      drawGradientLine(40 + i * 56, 240, 40 + i * 56, 320,
         colorShift(rgba8(200, 100, 255, 255), i * 36),
         colorShift(rgba8(255, 200, 60,  255), i * 36));
   }

   // Apply retro effect
   screenRetro(0.6);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
