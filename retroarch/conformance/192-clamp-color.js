// Conformance cart 192: clampColor(c, lo, hi).

let errors = [];

export function init() {
   if (typeof clampColor !== 'function') { errors.push('clampColor-missing'); return; }

   const white = rgba8(255, 255, 255, 255);
   const c1 = clampColor(white, 0, 200);
   if (typeof c1 !== 'number') errors.push('clampColor-not-number');
   if (colorR(c1) > 200) errors.push('clampColor-R-above-200: ' + colorR(c1));
   if (colorG(c1) > 200) errors.push('clampColor-G-above-200: ' + colorG(c1));

   const black = rgba8(0, 0, 0, 255);
   const c2 = clampColor(black, 50, 255);
   if (colorR(c2) < 50) errors.push('clampColor-lo-R: ' + colorR(c2));

   // Inverted range should not crash
   const c3 = clampColor(white, 200, 100);
   if (typeof c3 !== 'number') errors.push('clampColor-inverted-not-number');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('192 CLAMP COLOR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const colors = [
      rgba8(255, 20, 20, 255), rgba8(20, 200, 20, 255),
      rgba8(20, 80, 255, 255), rgba8(220, 180, 40, 255),
   ];
   const ranges = [[0,255], [0,150], [50,200], [80,180], [120,120]];

   for (let ri = 0; ri < ranges.length; ri++) {
      const [lo, hi] = ranges[ri];
      for (let ci = 0; ci < colors.length; ci++) {
         const c = clampColor(colors[ci], lo, hi);
         const x = 20 + ci * 76;
         const y = 50 + ri * 28;
         rectfill(x, y, x + 60, y + 22, c);
      }
      print(lo + '-' + hi, 330, 55 + ri * 28, rgba8(140, 180, 220, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
