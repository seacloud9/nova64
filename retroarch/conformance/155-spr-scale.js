// Conformance cart 155: sprScale(path, dx, dy, scale) — uniform scale blit.

let errors = [];

export function init() {
   if (typeof sprScale !== 'function') { errors.push('sprScale-missing'); return; }
   // Non-existent asset should not crash
   sprScale('nonexistent.rgba', 10, 10, 2.0, 16, 16);
   sprScale('nonexistent.rgba', 0, 0, 0, 0, 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('155 SPR SCALE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw scaled placeholder rects to show the API concept
   const scales = [0.5, 1.0, 1.5, 2.0, 3.0];
   let xpos = 30;
   for (let i = 0; i < scales.length; i++) {
      const s = scales[i];
      const base = 32;
      const sw = Math.round(base * s), sh = Math.round(base * s);
      const c = rgba8(80 + i * 30, 120, 200, 255);
      rectfill(xpos, 150 - sh, xpos + sw, 150, c);
      rect(xpos, 150 - sh, xpos + sw, 150, rgba8(180, 200, 255, 255));
      xpos += sw + 8;
   }
   printCentered('scale 0.5 1.0 1.5 2.0 3.0', 160, 162, rgba8(180, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
