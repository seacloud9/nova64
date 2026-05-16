// Conformance cart 225: colorSepia(c).

let errors = [];

export function init() {
   if (typeof colorSepia !== 'function') { errors.push('colorSepia-missing'); return; }

   const white = rgba8(255, 255, 255, 255);
   const s = colorSepia(white);
   // sepia of white: r≈240, g≈220, b≈175
   if (colorR(s) < 230) errors.push('sepia-white-R: ' + colorR(s));
   if (colorG(s) < 200) errors.push('sepia-white-G: ' + colorG(s));
   if (colorB(s) > 200) errors.push('sepia-white-B: ' + colorB(s));
   // sepia should always have R > G > B
   const c2 = colorSepia(rgba8(120, 80, 200, 255));
   if (colorR(c2) < colorG(c2)) errors.push('sepia-R<G');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('225 COLOR SEPIA', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Show palette before and after sepia
   const palette = [
      rgba8(220, 80,  80,  255), rgba8(80,  200, 80,  255),
      rgba8(80,  80,  220, 255), rgba8(220, 200, 60,  255),
      rgba8(200, 80,  200, 255), rgba8(60,  200, 220, 255),
   ];
   for (let i = 0; i < palette.length; i++) {
      const x = 20 + i * 96;
      rectfill(x, 50, x + 80, 110, palette[i]);
      rectfill(x, 120, x + 80, 180, colorSepia(palette[i]));
   }
   print('original', 8, 115, rgba8(140, 180, 220, 255));
   print('sepia',    8, 185, rgba8(140, 180, 220, 255));

   // Grayscale → sepia
   for (let i = 0; i < 16; i++) {
      const v = i * 16;
      const c = rgba8(v, v, v, 255);
      const sw = colorSepia(c);
      rectfill(20 + i * 36, 210, 50 + i * 36, 250, c);
      rectfill(20 + i * 36, 258, 50 + i * 36, 298, sw);
   }
   print('gray → sepia', 8, 305, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
