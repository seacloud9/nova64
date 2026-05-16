// Conformance cart 228: batch 14 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['colorShift', 'colorLuminance', 'easeBack', 'easeSine',
                   'drawHexCell', 'fillHexCell', 'drawXMark', 'fillXMark',
                   'drawChevron', 'colorSepia', 'colorVibrance', 'screenHSV'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   printBold('228 BATCH 14', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hex grid (top-left)
   const hr = 18;
   const dxRow = hr * Math.sqrt(3);
   const dyCol = hr * 1.5;
   for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
         const cx2 = 28 + col * dxRow + (row % 2) * (dxRow / 2);
         const cy2 = 35 + row * dyCol;
         const baseC = rgba8(60 + col * 20, 80 + row * 20, 160, 255);
         fillHexCell(cx2, cy2, hr - 2, colorShift(baseC, row * col * 12));
         drawHexCell(cx2, cy2, hr - 2, rgba8(100, 140, 200, 180));
      }
   }

   // Easing curves (top-right)
   const oxe = 360, oye = 170, we = 240, he = 120;
   rect(oxe, oye - he - 5, oxe + we, oye + 5, rgba8(30, 40, 60, 255));
   let ppx = -1, ppy = -1;
   for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const vb = easeBack(t), vs = easeSine(t);
      const x = oxe + (t * we) | 0;
      const yb = oye - (vb * he) | 0;
      const ys = oye - (vs * he) | 0;
      if (ppx >= 0) {
         line(ppx, ppy,     x, yb, rgba8(255, 160, 60, 255));
         line(ppx, ppy + 0, x, ys, rgba8(80, 200, 255, 255));
      }
      ppx = x; ppy = yb;
   }

   // Sepia + vibrance strips (middle-right)
   const base = rgba8(160, 100, 60, 255);
   for (let i = 0; i < 6; i++) {
      const c = colorShift(base, i * 60);
      rectfill(360 + i * 40, 50, 396 + i * 40, 90, c);
      rectfill(360 + i * 40, 94, 396 + i * 40, 130, colorSepia(c));
      rectfill(360 + i * 40, 134, 396 + i * 40, 170, colorVibrance(c, 1.5));
   }
   print('orig/sepia/vibrance', 362, 175, rgba8(140, 180, 220, 255));

   // Chevrons + X marks (bottom-left)
   for (let i = 0; i < 4; i++) {
      drawChevron(40 + i * 60, 250, 14, i, rgba8(100, 200, 255, 255));
      fillXMark(40 + i * 60, 290, 12, 3, rgba8(255, 160, 60, 255));
   }

   // Luminance demo
   const lCols = [rgba8(255,60,60,255), rgba8(60,220,60,255), rgba8(60,60,255,255),
                  rgba8(255,255,60,255), rgba8(200,200,200,255), rgba8(80,80,80,255)];
   for (let i = 0; i < 6; i++) {
      const lum = colorLuminance(lCols[i]);
      const x = 300 + i * 54;
      rectfill(x, 240, x + 48, 270, lCols[i]);
      print('' + lum, x + 4, 273, rgba8(160, 200, 240, 255));
   }

   // Apply mild HSV shift to entire image
   screenHSV(10, 1.05, 1.0);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
