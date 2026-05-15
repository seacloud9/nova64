// Conformance cart 168: colorInvert / colorGrayscaleVal / colorToHSV.

let errors = [];

export function init() {
   if (typeof colorInvert      !== 'function') { errors.push('colorInvert-missing');      return; }
   if (typeof colorGrayscaleVal !== 'function') { errors.push('colorGrayscaleVal-missing'); return; }
   if (typeof colorToHSV       !== 'function') { errors.push('colorToHSV-missing');       return; }

   const white = rgba8(255, 255, 255, 255);
   const black = rgba8(0, 0, 0, 255);

   // colorInvert
   const inv = colorInvert(white);
   if (typeof inv !== 'number') errors.push('colorInvert-not-number');
   if (colorR(inv) !== 0 || colorG(inv) !== 0 || colorB(inv) !== 0) errors.push('colorInvert-white: R=' + colorR(inv));

   // colorGrayscaleVal
   const gray = colorGrayscaleVal(white);
   if (typeof gray !== 'number') errors.push('colorGrayscaleVal-not-number');
   if (gray < 250) errors.push('colorGrayscaleVal-white: ' + gray);
   const grayBlack = colorGrayscaleVal(black);
   if (grayBlack > 5) errors.push('colorGrayscaleVal-black: ' + grayBlack);

   // colorToHSV
   const hsv = colorToHSV(rgba8(255, 0, 0, 255));
   if (typeof hsv !== 'object' || hsv === null) errors.push('colorToHSV-not-object');
   else {
      if (typeof hsv.h !== 'number') errors.push('colorToHSV-no-h');
      if (Math.abs(hsv.h) > 2)       errors.push('colorToHSV-h-red: ' + hsv.h);
      if (Math.abs(hsv.s - 1.0) > 0.02) errors.push('colorToHSV-s-red: ' + hsv.s);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('168 COLOR INSPECT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const colors = [
      rgba8(255, 80, 80, 255), rgba8(80, 200, 80, 255),
      rgba8(80, 120, 255, 255), rgba8(255, 200, 60, 255), rgba8(200, 80, 255, 255)
   ];
   const y0 = 50;
   for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const inv = colorInvert(c);
      const g = colorGrayscaleVal(c);
      rectfill(20 + i * 60, y0,      60 + i * 60, y0 + 20, c);
      rectfill(20 + i * 60, y0 + 24, 60 + i * 60, y0 + 44, inv);
      rectfill(20 + i * 60, y0 + 48, 60 + i * 60, y0 + 68, rgba8(g, g, g, 255));
   }
   print('orig / invert / gray', 20, y0 + 80, rgba8(160, 200, 240, 255));

   const hsv = colorToHSV(colors[0]);
   print('red HSV h=' + hsv.h.toFixed(0) + ' s=' + hsv.s.toFixed(2) + ' v=' + hsv.v.toFixed(2),
         8, y0 + 94, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
