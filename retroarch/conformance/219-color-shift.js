// Conformance cart 219: colorShift(c, hueOffset).

let errors = [];

export function init() {
   if (typeof colorShift !== 'function') { errors.push('colorShift-missing'); return; }

   const red = rgba8(255, 0, 0, 255);
   // Shift red 120° → should be green-ish
   const shifted = colorShift(red, 120);
   if (colorG(shifted) < 180) errors.push('120deg-green: ' + colorG(shifted));
   // Shift red 240° → should be blue-ish
   const shifted2 = colorShift(red, 240);
   if (colorB(shifted2) < 180) errors.push('240deg-blue: ' + colorB(shifted2));
   // 360° full rotation → same color
   const same = colorShift(red, 360);
   if (Math.abs(colorR(same) - 255) > 5) errors.push('360deg-R: ' + colorR(same));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('219 COLOR SHIFT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hue wheel — shift red across 360 degrees
   const base = rgba8(220, 60, 60, 255);
   const steps = 36;
   for (let i = 0; i < steps; i++) {
      const c = colorShift(base, i * 10);
      rectfill(20 + i * 16, 50, 34 + i * 16, 120, c);
   }
   print('hue sweep 0-360', 20, 126, rgba8(140, 180, 220, 255));

   // Multiple source colors shifted by same amount
   const sources = [
      rgba8(220, 80, 80,  255),
      rgba8(80,  220, 80,  255),
      rgba8(80,  80, 220,  255),
      rgba8(220, 220, 80,  255),
   ];
   for (let ci = 0; ci < 4; ci++) {
      for (let si = 0; si < 8; si++) {
         const c = colorShift(sources[ci], si * 45);
         rectfill(20 + si * 72, 150 + ci * 30, 80 + si * 72, 176 + ci * 30, c);
      }
   }
   print('4 colors x 8 shifts', 8, 278, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
