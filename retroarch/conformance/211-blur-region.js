// Conformance cart 211: blurRegion(x,y,w,h,radius).

let errors = [];

export function init() {
   if (typeof blurRegion !== 'function') { errors.push('blurRegion-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('211 BLUR REGION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw some colorful content first
   for (let i = 0; i < 12; i++) {
      const x = 20 + i * 48;
      const c = rgba8(40 + i * 18, 220 - i * 10, 80 + i * 14, 255);
      rectfill(x, 50, x + 40, 160, c);
      circ(x + 20, 105, 16, rgba8(255, 255, 255, 200));
   }
   print('source region (top)', 20, 165, rgba8(120, 160, 200, 255));

   // Draw same content for blurred version
   for (let i = 0; i < 12; i++) {
      const x = 20 + i * 48;
      const c = rgba8(40 + i * 18, 220 - i * 10, 80 + i * 14, 255);
      rectfill(x, 185, x + 40, 295, c);
      circ(x + 20, 240, 16, rgba8(255, 255, 255, 200));
   }
   // Apply blur to bottom half
   blurRegion(20, 185, 596, 110, 4);
   print('blurred r=4 (bottom)', 20, 300, rgba8(120, 160, 200, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
