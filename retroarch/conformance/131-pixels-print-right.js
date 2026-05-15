// Conformance cart 131: setPixels, getPixels, printRight.

let errors = [];

export function init() {
   if (typeof setPixels   !== 'function') { errors.push('setPixels-missing');   return; }
   if (typeof getPixels   !== 'function') { errors.push('getPixels-missing');   return; }
   if (typeof printRight  !== 'function') { errors.push('printRight-missing');  return; }

   // setPixels: write a 2x2 block of known colors
   const red   = rgba8(255, 0, 0, 255);
   const green = rgba8(0, 255, 0, 255);
   setPixels(10, 10, 2, 2, [red, green, green, red]);

   // getPixels: read back and verify
   const px = getPixels(10, 10, 2, 2);
   if (!Array.isArray(px) || px.length !== 4)
      { errors.push('getPixels length: ' + (px ? px.length : 'null')); return; }
   if (px[0] !== red)   errors.push('px[0] not red: ' + px[0].toString(16));
   if (px[1] !== green) errors.push('px[1] not green: ' + px[1].toString(16));
   if (px[3] !== red)   errors.push('px[3] not red: ' + px[3].toString(16));

   // printRight: should not crash
   printRight('right', 200, 50, rgba8(255, 255, 255, 255));

   // setPixels with empty array should not crash
   setPixels(0, 0, 10, 10, []);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('131 PIXELS + PRINT RIGHT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a checkerboard via setPixels
   const w = 32, h = 32;
   const data = [];
   for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
         data.push((x + y) % 2 === 0 ? rgba8(200, 100, 60, 255) : rgba8(40, 60, 100, 255));
   setPixels(40, 60, w, h, data);

   // Right-aligned text column
   line(300, 40, 300, 140, rgba8(60, 60, 100, 255));
   printRight('right-align', 300, 50, rgba8(200, 220, 255, 255));
   printRight('text', 300, 62, rgba8(180, 200, 255, 255));
   printRight('test', 300, 74, rgba8(160, 180, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
