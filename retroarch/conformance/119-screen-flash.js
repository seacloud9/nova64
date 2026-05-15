// Conformance cart 119: Screen flash.
// screenFlash(color, duration) — auto-fading color overlay.

let errors = [];
let elapsed = 0;
let flashApplied = false;
let preFlashPixel = 0;

export function init() {
   if (typeof screenFlash !== 'function') {
      errors.push('screenFlash-missing'); return;
   }

   // Calling with short duration should not crash
   screenFlash(rgba8(255, 255, 255, 255), 0.01);
}

export function update(dt) {
   elapsed += dt;

   if (!flashApplied && elapsed >= 0.1) {
      flashApplied = true;
      screenFlash(rgba8(255, 200, 60, 255), 0.5);
   }
}

export function draw() {
   cls(rgba8(20, 30, 50, 255));
   print('119 SCREEN FLASH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background scene — flash will tint this
   for (let i = 0; i < 8; i++) {
      const x = 40 + i * 40;
      rectfill(x, 60, x + 30, 100, rgba8(60, 100 + i * 20, 200, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
