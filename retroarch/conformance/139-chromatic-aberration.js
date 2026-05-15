// Conformance cart 139: screenChromaticAberration(offset) — R/B channel shift.

let errors = [];

export function init() {
   if (typeof screenChromaticAberration !== 'function') {
      errors.push('screenChromaticAberration-missing');
   }
   // Edge cases must not crash
   screenChromaticAberration(0);
   screenChromaticAberration(100);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 10, 255));
   print('139 CHROMA ABERRATION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw white vertical bar; after aberration R shifts right, B shifts left
   const cx = 160, cy = 120, bw = 20, bh = 80;
   rectfill(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2, rgba8(255, 255, 255, 255));
   screenChromaticAberration(4);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
