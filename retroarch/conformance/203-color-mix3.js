// Conformance cart 203: colorMix3(c1,w1, c2,w2, c3,w3).

let errors = [];

export function init() {
   if (typeof colorMix3 !== 'function') { errors.push('colorMix3-missing'); return; }

   const red   = rgba8(255, 0, 0, 255);
   const green = rgba8(0, 255, 0, 255);
   const blue  = rgba8(0, 0, 255, 255);

   const mixed = colorMix3(red, 1, green, 1, blue, 1);
   if (typeof mixed !== 'number') errors.push('colorMix3-not-number');
   // Equal mix should give roughly (85,85,85)
   if (Math.abs(colorR(mixed) - 85) > 5) errors.push('equal-R: ' + colorR(mixed));
   if (Math.abs(colorG(mixed) - 85) > 5) errors.push('equal-G: ' + colorG(mixed));
   if (Math.abs(colorB(mixed) - 85) > 5) errors.push('equal-B: ' + colorB(mixed));

   // All weight on red
   const allRed = colorMix3(red, 1, green, 0, blue, 0);
   if (colorR(allRed) < 250) errors.push('all-red-R: ' + colorR(allRed));
   if (colorG(allRed) > 5)   errors.push('all-red-G: ' + colorG(allRed));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('203 COLOR MIX3', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const r = rgba8(255, 40, 40, 255);
   const g = rgba8(40, 220, 40, 255);
   const b = rgba8(40, 80, 255, 255);

   // Triangle of blends
   const steps = 8;
   for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps - i; j++) {
         const k = steps - i - j;
         const c = colorMix3(r, i, g, j, b, k);
         const x = 20 + i * 20 + j * 10;
         const y = 50 + j * 18;
         rectfill(x, y, x + 16, y + 14, c);
      }
   }

   // Three source colors shown below
   rectfill(20, 230, 60, 250, r);
   rectfill(80, 230, 120, 250, g);
   rectfill(140, 230, 180, 250, b);
   print('R G B sources', 20, 255, rgba8(160, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
