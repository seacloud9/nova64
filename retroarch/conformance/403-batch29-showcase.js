// Conformance cart 403: batch 29 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['vectorNormalize', 'vectorDot', 'vectorCross', 'drawScatter',
                   'drawBarChart', 'drawPieChart', 'screenOldTV', 'colorHarmony',
                   'drawFibonacci', 'drawPenrose', 'drawSandDune', 'fillSandDune'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   printBold('403 BATCH 29', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Fibonacci spiral
   drawFibonacci(130, 170, 80, rgba8(100, 220, 255, 220));

   // Penrose
   drawPenrose(310, 170, 70, rgba8(255, 180, 60, 220));

   // Color harmony swatches
   const base = rgba8(200, 80, 60, 255);
   const harm = colorHarmony(base, 0);
   rectfill(430, 30, 480, 60, base);
   for (let i = 0; i < 3; i++) {
      rectfill(430, 65 + i * 35, 480, 95 + i * 35, harm[i]);
   }

   // Vector arrows
   for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const nv = vectorNormalize(Math.cos(ang), Math.sin(ang));
      line(560, 170, 560 + nv[0] * 50, 170 + nv[1] * 50, colorFromHSL(i * 45, 0.8, 0.6));
   }

   // Bar chart
   drawBarChart(20, 270, 200, 80, [40, 70, 55, 90, 35, 80], rgba8(80, 160, 255, 255));

   // Pie chart
   drawPieChart(360, 310, 55, [25, 30, 20, 25],
                [rgba8(255, 80, 80, 220), rgba8(80, 200, 80, 220),
                 rgba8(80, 80, 255, 220), rgba8(255, 200, 60, 220)]);

   // Scatter
   const pts = [];
   for (let i = 0; i < 40; i++) {
      pts.push(450 + Math.cos(i * 0.4) * 70, 310 + Math.sin(i * 0.3) * 45);
   }
   drawScatter(pts, rgba8(100, 255, 200, 200));

   // Sand dunes
   fillSandDune(20, 355, 600, 30, 3, rgba8(200, 170, 70, 200));
   drawSandDune(20, 355, 600, 30, 3, rgba8(255, 220, 120, 180));

   // Old TV effect on spiral area
   setClip(20, 20, 250, 230);
   screenOldTV(0.6);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
