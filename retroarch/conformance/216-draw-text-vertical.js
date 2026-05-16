// Conformance cart 216: drawTextVertical(text,x,y,color).

let errors = [];

export function init() {
   if (typeof drawTextVertical !== 'function') { errors.push('drawTextVertical-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('216 TEXT VERTICAL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Column labels rotated 90 deg
   drawTextVertical('ALPHA',   30, 50, rgba8(100, 200, 255, 255));
   drawTextVertical('BETA',    60, 50, rgba8(255, 160, 60,  255));
   drawTextVertical('GAMMA',   90, 50, rgba8(180, 255, 100, 255));
   drawTextVertical('DELTA',  120, 50, rgba8(255, 100, 180, 255));
   drawTextVertical('EPSILON',150, 50, rgba8(200, 100, 255, 255));

   // Single letters
   for (let i = 0; i < 10; i++) {
      const letter = String.fromCharCode(65 + i);
      const brt = 100 + i * 15;
      drawTextVertical(letter, 260 + i * 18, 80, rgba8(brt, 220, 255 - brt, 255));
   }

   // Side label
   rectfill(340, 200, 560, 300, rgba8(20, 30, 60, 255));
   drawTextVertical('SCORE', 596, 200, rgba8(200, 220, 100, 255));
   drawTextVertical('LEVEL', 614, 200, rgba8(200, 100, 220, 255));
   print('12345', 380, 240, rgba8(255, 220, 80, 255));
   print('LEVEL 7', 380, 260, rgba8(120, 200, 255, 255));

   print('vertical rotated text', 8, 320, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
