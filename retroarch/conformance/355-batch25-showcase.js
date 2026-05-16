// Conformance cart 355: batch 25 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawExplosion', 'fillExplosion', 'drawLightning', 'screenPixelSort',
                   'drawHexGrid', 'fillHexGrid', 'drawTriGrid', 'drawBorder', 'fillBorder',
                   'screenSobel', 'colorShift2', 'drawDiamond2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   printBold('355 BATCH 25', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hex grid background
   fillHexGrid(0, 20, 640, 360, 22, rgba8(60, 80, 120, 80), rgba8(8, 10, 25, 255));

   // Explosions with color shift
   const baseCol = rgba8(255, 180, 40, 255);
   fillExplosion(120, 160, 70, 10, baseCol);
   drawExplosion(120, 160, 70, 10, colorShift2(baseCol, 30, 1.2, 1.1));
   fillExplosion(320, 150, 55,  8, rgba8(200, 60, 255, 255));
   drawExplosion(320, 150, 55,  8, rgba8(240, 140, 255, 200));

   // Lightning
   drawLightning(20, 30, 180, 300, 7, rgba8(200, 220, 255, 220));
   drawLightning(440, 25, 580, 310, 8, rgba8(255, 220, 60, 220));

   // Triangle grid panel
   drawTriGrid(450, 40, 180, 130, 18, rgba8(100, 200, 255, 160));

   // Diamonds row
   for (let i = 0; i < 5; i++) {
      drawDiamond2(60 + i * 90, 290, 28, 40, colorShift2(rgba8(200, 100, 255, 255), i * 30, 1, 1));
   }

   // fillBorder panels
   fillBorder(200, 260, 100, 70, 5, rgba8(255, 180, 60, 255), rgba8(40, 25, 10, 255));
   fillBorder(310, 260, 100, 70, 4, rgba8(80, 200, 255, 255), rgba8(10, 25, 45, 255));

   // Sobel strip
   for (let ys = 220; ys < 260; ys++) {
      for (let xv = 200; xv < 420; xv++) {
         const t = (xv - 200) / 220;
         pset(xv, ys, rgba8((t * 220) | 0, 100, (200 - t * 150) | 0, 255));
      }
   }
   setClip(200, 220, 220, 40);
   screenSobel();
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
