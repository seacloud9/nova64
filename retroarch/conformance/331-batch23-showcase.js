// Conformance cart 331: batch 23 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['lerp2D', 'colorAnalogous', 'colorSplit', 'drawComet', 'fillComet',
                   'drawRainbow', 'drawHelix', 'fillProgressBar', 'fillSpiral',
                   'drawWave', 'screenDither', 'drawGlow'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 12, 255));
   printBold('331 BATCH 23', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Star field
   for (let i = 0; i < 50; i++) {
      pset((i * 211) % 620 + 10, (i * 137) % 340 + 10,
           rgba8(200, 220, 255, (i % 3 === 0) ? 200 : 80));
   }

   // Rainbow arc
   drawRainbow(160, 340, 130, 18, 180);

   // Comets
   fillComet(20, 60, 240, 100, 9, rgba8(255, 200, 80, 255));
   fillComet(20, 140, 200, 165, 7, rgba8(100, 200, 255, 220));

   // Helix
   drawHelix(340, 150, 28, 4, 100, rgba8(180, 255, 100, 255));

   // Spiral
   fillSpiral(480, 165, 55, 3, rgba8(255, 120, 200, 200));

   // Analogous color row
   const base = rgba8(200, 80, 40, 255);
   const ana = colorAnalogous(base, 40);
   rectfill(20, 260, 70, 290, base);
   rectfill(75, 260, 125, 290, ana[0]);
   rectfill(130, 260, 180, 290, ana[1]);

   // colorSplit display
   const sp = colorSplit(rgba8(160, 100, 220, 255));
   rectfill(195, 260, 225, 290, rgba8(sp[0], 0, 0, 255));
   rectfill(230, 260, 260, 290, rgba8(0, sp[1], 0, 255));
   rectfill(265, 260, 295, 290, rgba8(0, 0, sp[2], 255));

   // lerp2D interpolated dots
   for (let t = 0; t <= 1; t += 0.05) {
      const p = lerp2D(320, 260, 560, 290, t);
      pset(p[0], p[1], colorFromHSL(t * 200, 0.8, 0.6));
   }

   // Progress bars
   for (let i = 0; i < 4; i++) {
      fillProgressBar(20, 300 + i * 12, 180, 9, (i + 1) / 4,
                      colorFromHSL(i * 30 + 60, 0.8, 0.5), rgba8(20, 20, 40, 255));
   }

   // Waves
   for (let i = 0; i < 3; i++) {
      drawWave(320, 315 + i * 12, 300, 8, 3 + i, i * 0.6,
               colorFromHSL(i * 70 + 20, 0.8, 0.55));
   }

   // Glows on top
   drawGlow(580, 80, 40, rgba8(255, 160, 60, 255));
   drawGlow(560, 220, 35, rgba8(80, 200, 255, 255));

   // Dither a clip region
   setClip(550, 60, 80, 80);
   screenDither(3);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
