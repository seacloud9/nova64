// Conformance cart 391: batch 28 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawRoundedPoly', 'fillRoundedPoly', 'drawBezierCurve', 'bezierPoint',
                   'drawKaleidoscope', 'screenPixelate2', 'colorVibrancy', 'drawSpokePie',
                   'fillSpokePie', 'drawCounterDial', 'screenInvert2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   printBold('391 BATCH 28', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bezier curve S-shape
   drawBezierCurve(20, 180, 100, 60, 200, 300, 280, 180, rgba8(100, 200, 255, 255));
   drawBezierCurve(20, 180, 100, 300, 200, 60, 280, 180, rgba8(255, 160, 60, 200));

   // bezierPoint dots on curve
   for (let t = 0; t <= 1; t += 0.1) {
      const p = bezierPoint(20, 180, 100, 60, 200, 300, 280, 180, t);
      circfill(p[0], p[1], 3, rgba8(255, 255, 80, 220));
   }

   // Rounded polygons
   const star5 = [];
   for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 - Math.PI / 2;
      star5.push(360 + Math.cos(a) * 60, 180 + Math.sin(a) * 60);
   }
   fillRoundedPoly(star5, 12, rgba8(180, 80, 255, 200));
   drawRoundedPoly(star5, 12, rgba8(220, 140, 255, 255));

   // Kaleidoscope
   drawKaleidoscope(530, 140, 70, 8, rgba8(80, 200, 255, 200));

   // Spoke pies and dials
   fillSpokePie(100, 310, 45, 6, rgba8(255, 140, 60, 200), rgba8(40, 20, 10, 255));
   drawSpokePie(100, 310, 45, 6, rgba8(255, 200, 100, 200));
   drawCounterDial(220, 310, 45, 75, 100, rgba8(100, 200, 255, 255));
   drawCounterDial(330, 310, 45, 50, 100, rgba8(180, 255, 80, 255));

   // colorVibrancy swatches
   const dulls = [rgba8(140, 90, 90, 255), rgba8(90, 130, 90, 255), rgba8(90, 90, 160, 255)];
   for (let i = 0; i < dulls.length; i++) {
      rectfill(430 + i * 40, 275, 467 + i * 40, 295, dulls[i]);
      rectfill(430 + i * 40, 298, 467 + i * 40, 318, colorVibrancy(dulls[i], 0.8));
   }

   // Pixelate panel
   rectfill(430, 325, 620, 355, rgba8(10, 20, 60, 255));
   circfill(480, 340, 12, rgba8(255, 100, 60, 255));
   circfill(540, 340, 10, rgba8(60, 200, 255, 255));
   setClip(430, 325, 190, 30);
   screenPixelate2(6);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
