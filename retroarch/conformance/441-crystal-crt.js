// Conformance cart 441: drawCrystal, fillCrystal, screenCRT, colorClamp2.

let errors = [];

export function init() {
   if (typeof drawCrystal  !== 'function') { errors.push('drawCrystal-missing');  return; }
   if (typeof fillCrystal  !== 'function') { errors.push('fillCrystal-missing');  return; }
   if (typeof screenCRT    !== 'function') { errors.push('screenCRT-missing');    return; }
   if (typeof colorClamp2  !== 'function') { errors.push('colorClamp2-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('441 CRYSTAL CRT CLAMP', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled crystals
   fillCrystal(100, 190, 60, 6, rgba8(120, 180, 255, 200));
   fillCrystal(240, 190, 50, 4, rgba8(180, 120, 255, 200));
   fillCrystal(360, 190, 55, 8, rgba8(120, 255, 180, 200));

   // Outline crystals
   drawCrystal(100, 190, 60, 6, rgba8(200, 230, 255, 255));
   drawCrystal(240, 190, 50, 4, rgba8(220, 180, 255, 255));
   drawCrystal(360, 190, 55, 8, rgba8(180, 255, 220, 255));

   // colorClamp2 strip
   for (let i = 0; i < 10; i++) {
      const raw = rgba8(255, 255, 255, 255);
      const clamped = colorClamp2(raw, 0.1 + i * 0.08, 0.3 + i * 0.06);
      rectfill(440 + i * 16, 150, 454 + i * 16, 220, clamped);
   }

   // CRT effect on left half
   setClip(20, 30, 420, 340);
   screenCRT(0.4);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
