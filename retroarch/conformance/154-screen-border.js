// Conformance cart 154: screenBorder(size, color) — filled edge border.

let errors = [];

export function init() {
   if (typeof screenBorder !== 'function') { errors.push('screenBorder-missing'); }
   screenBorder(0, rgba8(0, 0, 0, 255));
   screenBorder(999, rgba8(0, 0, 0, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(40, 60, 100, 255));
   print('154 SCREEN BORDER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw content, then overlay border
   for (let x = 0; x < 320; x += 20) {
      for (let y = 0; y < 240; y += 20) {
         const c = ((x / 20 + y / 20) % 2 === 0) ? rgba8(50, 70, 110, 255) : rgba8(30, 50, 90, 255);
         rectfill(x, y, x + 20, y + 20, c);
      }
   }
   screenBorder(16, rgba8(0, 0, 0, 255));
   printCentered('letterbox border', 160, 120, rgba8(200, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
