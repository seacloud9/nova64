// Conformance cart 454: screenChromaShift, colorSaturate2, colorAdjust.

let errors = [];

export function init() {
   if (typeof screenChromaShift !== 'function') { errors.push('screenChromaShift-missing'); return; }
   if (typeof colorSaturate2    !== 'function') { errors.push('colorSaturate2-missing');    return; }
   if (typeof colorAdjust       !== 'function') { errors.push('colorAdjust-missing');       return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 18, 255));
   print('454 CHROMA SATURATE ADJUST', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // colorSaturate2 strip (desaturate to supersaturate)
   const base1 = rgba8(180, 80, 60, 255);
   for (let i = 0; i < 10; i++) {
      rectfill(20 + i * 28, 30, 45 + i * 28, 70, colorSaturate2(base1, i * 0.3));
   }

   // colorAdjust — hue shifts
   const base2 = rgba8(200, 60, 80, 255);
   for (let i = 0; i < 12; i++) {
      rectfill(20 + i * 22, 80, 40 + i * 22, 120, colorAdjust(base2, i * 30, 0, 0));
   }

   // Scene to chroma-shift
   for (let i = 0; i < 5; i++) {
      circfill(80 + i * 100, 220, 45, rgba8(200 - i * 20, 80 + i * 20, 60, 230));
   }
   rectfill(20, 280, 600, 320, rgba8(60, 120, 200, 200));

   // Chroma shift
   setClip(20, 140, 610, 330);
   screenChromaShift(5);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
