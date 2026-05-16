// Conformance cart 245: screenNightVision(strength).

let errors = [];

export function init() {
   if (typeof screenNightVision !== 'function') { errors.push('screenNightVision-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('245 NIGHT VISION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a scene with people/shapes
   rectfill(0, 200, 640, 360, rgba8(20, 30, 20, 255));  // ground
   rectfill(0, 0, 640, 200, rgba8(10, 15, 10, 255));    // sky

   // Buildings silhouettes
   rectfill(40,  100, 120, 200, rgba8(30, 40, 30, 255));
   rectfill(150, 130, 220, 200, rgba8(25, 35, 25, 255));
   rectfill(440, 80,  540, 200, rgba8(35, 45, 35, 255));
   rectfill(560, 110, 630, 200, rgba8(30, 40, 30, 255));

   // Figures
   circfill(200, 185, 10, rgba8(60, 80, 60, 255));
   rectfill(192, 195, 208, 220, rgba8(50, 70, 50, 255));

   circfill(400, 180, 10, rgba8(60, 80, 60, 255));
   rectfill(392, 190, 408, 215, rgba8(50, 70, 50, 255));

   // Apply night vision effect
   screenNightVision(0.85);

   print('ok', 4, 14, rgba8(0, 180, 0, 255));
}
