// Conformance cart 132: screenBlur(radius) — separable box blur.

let errors = [];

export function init() {
   if (typeof screenBlur !== 'function') { errors.push('screenBlur-missing'); return; }

   // Blur with radius 0 or large should not crash
   screenBlur(0);
   screenBlur(100);

   // Verify: set a bright pixel, blur, check it spreads
   cls(rgba8(0, 0, 0, 255));
   pset(100, 100, rgba8(255, 255, 255, 255));
   screenBlur(2);
   // After blur, adjacent pixels should have non-zero brightness
   const adj = pget(102, 100);
   if ((adj >> 24) === 0)
      errors.push('blurred pixel adjacent still 0');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('132 SCREEN BLUR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw deterministic gradient stripes, then blur
   for (let y = 40; y < 180; y++) {
      for (let x = 40; x < 240; x++) {
         const v = (x - 40 + y - 40) % 256;
         pset(x, y, rgba8(v, 128, 255 - v, 255));
      }
   }
   screenBlur(2);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
