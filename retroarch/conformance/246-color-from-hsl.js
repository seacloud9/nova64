// Conformance cart 246: colorFromHSL(h, s, l).

let errors = [];

export function init() {
   if (typeof colorFromHSL !== 'function') { errors.push('colorFromHSL-missing'); return; }

   // Red: H=0, S=1, L=0.5
   const red = colorFromHSL(0, 1.0, 0.5);
   if (colorR(red) < 240) errors.push('red-R: ' + colorR(red));
   if (colorG(red) > 20)  errors.push('red-G: ' + colorG(red));

   // White: S=0, L=1
   const white = colorFromHSL(0, 0, 1.0);
   if (colorR(white) < 250) errors.push('white-R: ' + colorR(white));

   // Black: L=0
   const black = colorFromHSL(0, 0, 0);
   if (colorR(black) > 5) errors.push('black-R: ' + colorR(black));

   // Green: H=120
   const green = colorFromHSL(120, 1.0, 0.5);
   if (colorG(green) < 240) errors.push('green-G: ' + colorG(green));
   if (colorR(green) > 20)  errors.push('green-R: ' + colorR(green));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('246 COLOR FROM HSL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hue sweep at S=1, L=0.5
   for (let i = 0; i < 36; i++) {
      const h = i * 10;
      rectfill(20 + i * 16, 50, 34 + i * 16, 100, colorFromHSL(h, 1.0, 0.5));
   }
   print('hue 0-360', 20, 106, rgba8(140, 180, 220, 255));

   // Saturation sweep (H=200, L=0.5)
   for (let i = 0; i < 10; i++) {
      const s = i / 9;
      rectfill(20 + i * 58, 120, 72 + i * 58, 160, colorFromHSL(200, s, 0.5));
   }
   print('saturation 0-1', 20, 166, rgba8(140, 180, 220, 255));

   // Lightness sweep (H=120, S=0.8)
   for (let i = 0; i < 10; i++) {
      const l = i / 9;
      rectfill(20 + i * 58, 180, 72 + i * 58, 220, colorFromHSL(120, 0.8, l));
   }
   print('lightness 0-1', 20, 226, rgba8(140, 180, 220, 255));

   // Rainbow pastels (S=0.7, L=0.7)
   for (let i = 0; i < 12; i++) {
      circfill(50 + i * 48, 280, 18, colorFromHSL(i * 30, 0.7, 0.7));
   }
   print('pastels', 8, 310, rgba8(160, 200, 240, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
