// Conformance cart 126: colorLerp2D — bilinear color interpolation.
// colorLerp2D(c00, c10, c01, c11, tx, ty)

let errors = [];

export function init() {
   if (typeof colorLerp2D !== 'function') { errors.push('colorLerp2D-missing'); return; }

   // Corners: tx=0, ty=0 → c00
   const c00 = rgba8(255, 0, 0, 255);
   const c10 = rgba8(0, 255, 0, 255);
   const c01 = rgba8(0, 0, 255, 255);
   const c11 = rgba8(255, 255, 0, 255);

   const r00 = colorLerp2D(c00, c10, c01, c11, 0, 0);
   if (((r00 >> 24) & 0xff) < 240 || ((r00 >> 16) & 0xff) > 10)
      errors.push('corner 0,0 not red: ' + ((r00 >> 24) & 0xff));

   const r10 = colorLerp2D(c00, c10, c01, c11, 1, 0);
   if (((r10 >> 16) & 0xff) < 240 || ((r10 >> 24) & 0xff) > 10)
      errors.push('corner 1,0 not green: ' + ((r10 >> 16) & 0xff));

   // Center: should be average of all four
   const rc = colorLerp2D(c00, c10, c01, c11, 0.5, 0.5);
   const rr = (rc >> 24) & 0xff;
   const rg = (rc >> 16) & 0xff;
   const rb = (rc >>  8) & 0xff;
   if (Math.abs(rr - 128) > 5 || Math.abs(rg - 128) > 5)
      errors.push('center not ~128,128: got ' + rr + ',' + rg + ',' + rb);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('126 COLOR LERP 2D', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bilinear gradient quad
   const c00 = rgba8(255, 0,   0,   255);  // red TL
   const c10 = rgba8(0,   255, 0,   255);  // green TR
   const c01 = rgba8(0,   0,   255, 255);  // blue BL
   const c11 = rgba8(255, 255, 0,   255);  // yellow BR
   const w = 200, h = 140;
   const ox = 60, oy = 60;
   for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
         pset(ox + x, oy + y, colorLerp2D(c00, c10, c01, c11, x / (w - 1), y / (h - 1)));
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
