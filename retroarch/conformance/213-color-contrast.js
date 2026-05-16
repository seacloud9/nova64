// Conformance cart 213: colorContrast(c, amount).

let errors = [];

export function init() {
   if (typeof colorContrast !== 'function') { errors.push('colorContrast-missing'); return; }

   const mid = rgba8(128, 128, 128, 255);
   if (colorR(colorContrast(mid, 1.0)) !== 128) errors.push('mid-unchanged');

   const high = rgba8(200, 100, 50, 255);
   const boosted = colorContrast(high, 2.0);
   if (colorR(boosted) <= colorR(high)) errors.push('boost-R-not-higher');

   const reduced = colorContrast(high, 0.5);
   if (colorR(reduced) >= colorR(high)) errors.push('reduce-R-not-lower');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('213 COLOR CONTRAST', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(180, 120, 60, 255);
   const amounts = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
   for (let i = 0; i < amounts.length; i++) {
      const c = colorContrast(base, amounts[i]);
      const x = 20 + i * 64;
      rectfill(x, 50, x + 58, 100, c);
      print(toFixed(amounts[i], 2), x, 104, rgba8(140, 180, 220, 255));
   }

   // Apply to a set of source colors
   const sources = [
      rgba8(200, 80, 80, 255), rgba8(80, 180, 80, 255),
      rgba8(80, 80, 200, 255), rgba8(180, 160, 60, 255),
   ];
   const levels = [0.5, 1.0, 1.5, 2.0];
   for (let ci = 0; ci < 4; ci++) {
      for (let li = 0; li < 4; li++) {
         rectfill(20 + li * 80, 140 + ci * 30, 90 + li * 80, 166 + ci * 30,
                  colorContrast(sources[ci], levels[li]));
      }
   }
   for (let li = 0; li < 4; li++) {
      print(toFixed(levels[li], 1) + 'x', 30 + li * 80, 265, rgba8(140, 180, 220, 255));
   }

   print('contrast scale 0..3', 8, 280, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
