// Conformance cart 404: drawMatrixRain, screenQuantize, colorFromCMYK, colorFromYUV.

let errors = [];

export function init() {
   if (typeof drawMatrixRain  !== 'function') { errors.push('drawMatrixRain-missing');  return; }
   if (typeof screenQuantize  !== 'function') { errors.push('screenQuantize-missing');  return; }
   if (typeof colorFromCMYK   !== 'function') { errors.push('colorFromCMYK-missing');   return; }
   if (typeof colorFromYUV    !== 'function') { errors.push('colorFromYUV-missing');    return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 10, 4, 255));
   print('404 MATRIX QUANTIZE CMYK YUV', 4, 4, rgba8(0, 220, 60, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Matrix rain
   drawMatrixRain(20, 30, 180, 300, 0.5, rgba8(0, 200, 60, 200));

   // CMYK color swatches
   const cmyk1 = colorFromCMYK(0, 1, 1, 0);   // red
   const cmyk2 = colorFromCMYK(1, 0, 1, 0);   // green
   const cmyk3 = colorFromCMYK(1, 1, 0, 0);   // blue
   rectfill(220, 30, 280, 70, cmyk1);
   rectfill(220, 80, 280, 120, cmyk2);
   rectfill(220, 130, 280, 170, cmyk3);

   // YUV colors
   const yuv1 = colorFromYUV(0.5, -0.2, 0.4);
   const yuv2 = colorFromYUV(0.7, 0.1, -0.3);
   rectfill(300, 30, 360, 70, yuv1);
   rectfill(300, 80, 360, 120, yuv2);

   // Quantize demonstration
   drawMatrixRain(380, 30, 200, 200, 0.4, rgba8(60, 180, 255, 200));
   screenQuantize(4);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
