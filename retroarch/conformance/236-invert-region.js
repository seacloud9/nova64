// Conformance cart 236: invertRegion(x,y,w,h).

let errors = [];

export function init() {
   if (typeof invertRegion !== 'function') { errors.push('invertRegion-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('236 INVERT REGION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw colorful scene
   for (let i = 0; i < 8; i++) {
      rectfill(20 + i * 72, 50, 84 + i * 72, 160, rgba8(40 + i*20, 100, 200 - i*20, 255));
      circfill(56 + i * 72, 105, 26, rgba8(200 - i*20, 160, 60 + i*20, 200));
   }
   print('original', 240, 170, rgba8(200, 220, 255, 200));

   // Draw same content again below
   for (let i = 0; i < 8; i++) {
      rectfill(20 + i * 72, 200, 84 + i * 72, 310, rgba8(40 + i*20, 100, 200 - i*20, 255));
      circfill(56 + i * 72, 255, 26, rgba8(200 - i*20, 160, 60 + i*20, 200));
   }
   // Invert half of it
   invertRegion(20, 200, 280, 110);
   print('left half inverted', 180, 318, rgba8(200, 220, 255, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
