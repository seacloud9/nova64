// Conformance cart 347: screenPixelSort, colorShift2, drawDiamond2.

let errors = [];

export function init() {
   if (typeof screenPixelSort !== 'function') { errors.push('screenPixelSort-missing'); return; }
   if (typeof colorShift2     !== 'function') { errors.push('colorShift2-missing');     return; }
   if (typeof drawDiamond2    !== 'function') { errors.push('drawDiamond2-missing');    return; }

   // colorShift2: shift hue by 180 should change red to cyan-ish
   const red  = rgba8(255, 0, 0, 255);
   const comp = colorShift2(red, 180, 1, 1);
   const cr = (comp >>> 24) & 0xFF;
   if (cr > 50) errors.push('shift2-r:' + cr);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('347 PIXSORT SHIFT2 DIAMOND', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // colorShift2: hue rotation series
   const base = rgba8(220, 60, 60, 255);
   for (let i = 0; i < 12; i++) {
      const shifted = colorShift2(base, i * 30, 1.0, 1.0);
      rectfill(20 + i * 45, 40, 63 + i * 45, 90, shifted);
   }

   // colorShift2: saturation series
   for (let i = 0; i < 8; i++) {
      const shifted = colorShift2(base, 0, i / 7, 1.0);
      rectfill(20 + i * 45, 100, 63 + i * 45, 150, shifted);
   }

   // drawDiamond2: various shapes
   drawDiamond2(80,  230, 40, 60, rgba8(100, 200, 255, 255));
   drawDiamond2(200, 230, 60, 40, rgba8(255, 180, 60,  255));
   drawDiamond2(320, 230, 50, 50, rgba8(180, 255, 100, 255));
   drawDiamond2(430, 230, 30, 70, rgba8(255, 100, 200, 255));

   // Pixel sort on gradient area
   for (let ys = 270; ys < 350; ys++) {
      for (let xv = 20; xv < 300; xv++) {
         const t = (xv - 20) / 280;
         pset(xv, ys, rgba8((80 + t * 160) | 0, (40 + t * 180) | 0, 200, 255));
      }
   }
   setClip(20, 270, 280, 80);
   screenPixelSort(0.4);
   clearClip();
   print('sorted', 25, 355, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
