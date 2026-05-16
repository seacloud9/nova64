// Conformance cart 379: batch 27 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawSweep', 'fillSweep', 'drawLissajous', 'screenMirror', 'colorMix2',
                   'drawEllipseArc', 'fillEllipseArc', 'drawStarburst2', 'clampXY',
                   'screenSepia2', 'colorFromHex', 'easeElastic2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   printBold('379 BATCH 27', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Pie from fillSweep
   const slices = [0.3, 0.2, 0.25, 0.25];
   const hexCols = ['#FF4455', '#44AAFF', '#44FF88', '#FFAA22'];
   let ang = 0;
   for (let i = 0; i < slices.length; i++) {
      const span = slices[i] * Math.PI * 2;
      fillSweep(100, 190, 75, ang, ang + span, colorFromHex(hexCols[i]));
      ang += span;
   }
   drawSweep(100, 190, 75, 0, Math.PI * 2, rgba8(255, 255, 255, 80));

   // Lissajous
   drawLissajous(300, 190, 70, 55, 3, 2, 0, rgba8(100, 220, 255, 255));
   drawLissajous(300, 190, 50, 40, 5, 4, Math.PI / 3, rgba8(255, 160, 60, 180));

   // Ellipse arcs
   for (let i = 0; i < 4; i++) {
      fillEllipseArc(490, 140, 70, 50, i * Math.PI / 2, (i + 1) * Math.PI / 2,
                     colorMix2(colorFromHex('#FF4444'), colorFromHex('#4444FF'), i / 3));
   }
   drawEllipseArc(490, 140, 70, 50, 0, Math.PI * 2, rgba8(255, 255, 255, 120));

   // Starburst
   drawStarburst2(490, 300, 55, 16, rgba8(255, 220, 60, 220));

   // easeElastic2 strip
   for (let i = 0; i < 180; i++) {
      const t = i / 180;
      const ev = easeElastic2(t);
      pset(20 + i, 320 - (ev * 40) | 0, colorMix2(colorFromHex('#FF4466'), colorFromHex('#4466FF'), t));
   }

   // colorMix2 gradient bar
   for (let i = 0; i < 20; i++) {
      rectfill(210 + i * 14, 305, 223 + i * 14, 335, colorMix2(
         colorFromHex('#FF8800'), colorFromHex('#0088FF'), i / 19));
   }

   // Sepia strip
   for (let ys = 340; ys < 356; ys++) {
      for (let xv = 20; xv < 420; xv++) {
         const t = (xv - 20) / 400;
         pset(xv, ys, rgba8((t * 200 + 40) | 0, 140, (200 - t * 120) | 0, 255));
      }
   }
   setClip(20, 340, 200, 16);
   screenSepia2(1.0);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
