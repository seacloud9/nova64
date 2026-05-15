// Conformance cart 146: sprFlipX / sprFlipY — API smoke test (no asset needed).

let errors = [];

export function init() {
   if (typeof sprFlipX !== 'function') { errors.push('sprFlipX-missing'); return; }
   if (typeof sprFlipY !== 'function') { errors.push('sprFlipY-missing'); return; }

   // Non-existent asset should not crash
   sprFlipX('nonexistent.rgba', 10, 10, 32, 32);
   sprFlipY('nonexistent.rgba', 10, 10, 32, 32);
   // Zero dimensions should not crash
   sprFlipX('nonexistent.rgba', 0, 0, 0, 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('146 SPR FLIP', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Illustrate flip concept with colored rects + arrows
   const lx = 80, rx = 200, y0 = 70, sw = 60, sh = 80;
   rectfill(lx, y0, lx + sw, y0 + sh, rgba8(40, 80, 160, 255));
   for (let i = 0; i < 4; i++) {
      const c = rgba8(80 + i * 40, 100 + i * 30, 200, 255);
      rectfill(lx + 4, y0 + 4 + i * 18, lx + 28, y0 + 18 + i * 18, c);
   }
   rectfill(rx, y0, rx + sw, y0 + sh, rgba8(40, 80, 160, 255));
   for (let i = 0; i < 4; i++) {
      const c = rgba8(80 + i * 40, 100 + i * 30, 200, 255);
      rectfill(rx + sw - 28, y0 + 4 + i * 18, rx + sw - 4, y0 + 18 + i * 18, c);
   }
   line(lx + sw + 4, y0 + sh / 2, rx - 4, y0 + sh / 2, rgba8(255, 220, 80, 255));
   printCentered('flipX', 160, y0 + sh + 8, rgba8(200, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
