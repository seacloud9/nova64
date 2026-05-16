// Conformance cart 220: colorLuminance(c).

let errors = [];

export function init() {
   if (typeof colorLuminance !== 'function') { errors.push('colorLuminance-missing'); return; }

   const white = rgba8(255, 255, 255, 255);
   const black = rgba8(0, 0, 0, 255);
   if (colorLuminance(white) < 250) errors.push('white-lum: ' + colorLuminance(white));
   if (colorLuminance(black) > 5)   errors.push('black-lum: ' + colorLuminance(black));
   // Green should be brighter than blue (BT.601)
   const grn = rgba8(0, 255, 0, 255);
   const blu = rgba8(0, 0, 255, 255);
   if (colorLuminance(grn) <= colorLuminance(blu)) errors.push('green-not-brighter');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('220 COLOR LUMINANCE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Show a palette of colors with their luminance values
   const palette = [
      rgba8(255, 0,   0,   255), rgba8(0, 255,   0,   255),
      rgba8(0,   0,   255, 255), rgba8(255, 255,   0,   255),
      rgba8(0,   255, 255, 255), rgba8(255,   0, 255,   255),
      rgba8(255, 255, 255, 255), rgba8(128, 128, 128,   255),
   ];
   for (let i = 0; i < palette.length; i++) {
      const x = 20 + (i % 4) * 140;
      const y = 50 + Math.floor(i / 4) * 60;
      rectfill(x, y, x + 100, y + 30, palette[i]);
      const lum = colorLuminance(palette[i]);
      print('' + lum, x + 4, y + 34, rgba8(160, 200, 240, 255));
   }

   // Luminance bar — gradient from black to white
   for (let x = 0; x < 576; x++) {
      const v = (x / 576 * 255) | 0;
      const c = rgba8(v, v, v, 255);
      const lum = colorLuminance(c);
      vline(20 + x, 195, 225, rgba8(lum, lum, lum, 255));
   }
   print('grayscale luminance', 8, 230, rgba8(160, 200, 240, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
