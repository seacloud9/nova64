// Conformance cart 226: colorVibrance(c, amount).

let errors = [];

export function init() {
   if (typeof colorVibrance !== 'function') { errors.push('colorVibrance-missing'); return; }

   const gray = rgba8(128, 128, 128, 255);
   // Vibrance of gray should stay gray (already desaturated, boosting won't help since all channels equal)
   const vg = colorVibrance(gray, 1.0);
   if (Math.abs(colorR(vg) - 128) > 10) errors.push('gray-R: ' + colorR(vg));

   const vivid = rgba8(220, 60, 60, 255);
   const boosted = colorVibrance(vivid, 1.0);
   // Boosting a vivid color: red channel should stay dominant
   if (colorR(boosted) < colorR(vivid) - 10) errors.push('boosted-R-dropped');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('226 COLOR VIBRANCE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Vibrance scale: -1 to 2
   const base = rgba8(160, 100, 80, 255);
   const amounts = [-1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0];
   for (let i = 0; i < amounts.length; i++) {
      const c = colorVibrance(base, amounts[i]);
      const x = 20 + i * 84;
      rectfill(x, 50, x + 78, 100, c);
      print(toFixed(amounts[i], 1), x + 8, 104, rgba8(140, 180, 220, 255));
   }

   // Multiple source colors
   const sources = [
      rgba8(180, 120, 100, 255), rgba8(100, 160, 120, 255),
      rgba8(100, 120, 180, 255), rgba8(160, 140, 80,  255),
   ];
   for (let ci = 0; ci < 4; ci++) {
      for (let ai = 0; ai < 7; ai++) {
         const amt = -0.5 + ai * 0.5;
         rectfill(20 + ai * 84, 140 + ci * 30, 92 + ai * 84, 166 + ci * 30,
                  colorVibrance(sources[ci], amt));
      }
   }

   print('vibrance -1..2', 8, 268, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
