// Conformance cart 229: copyPixels(srcX,srcY,dstX,dstY,w,h).

let errors = [];

export function init() {
   if (typeof copyPixels !== 'function') { errors.push('copyPixels-missing'); return; }
   copyPixels(0, 0, 0, 0, 0, 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('229 COPY PIXELS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw source pattern in top-left
   for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 120; x += 2) {
         const c = rgba8((x * 2) & 255, (y * 3) & 255, 160, 255);
         pset(20 + x, 50 + y, c);
      }
   }
   circfill(80, 90, 30, rgba8(255, 100, 60, 200));
   print('SRC', 65, 85, rgba8(255, 255, 255, 255));

   // Copy it to 3 other positions
   copyPixels(20, 50, 160, 50,  120, 80);
   copyPixels(20, 50, 300, 50,  120, 80);
   copyPixels(20, 50, 440, 50,  120, 80);

   print('copy1', 175, 136, rgba8(140, 180, 220, 255));
   print('copy2', 315, 136, rgba8(140, 180, 220, 255));
   print('copy3', 455, 136, rgba8(140, 180, 220, 255));

   // Copy partial region
   rectfill(20, 180, 200, 260, rgba8(40, 80, 160, 255));
   for (let i = 0; i < 5; i++) {
      circfill(60 + i * 36, 220, 14, rgba8(200 - i*30, 80 + i*30, 120, 255));
   }
   copyPixels(20, 180, 220, 200, 90, 40);
   print('partial', 222, 246, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
