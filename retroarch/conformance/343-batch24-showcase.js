// Conformance cart 343: batch 24 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawDNA', 'fillDNA', 'drawVortex', 'drawMandala', 'screenHalftone',
                   'smoothstep2', 'drawLabel', 'drawTag', 'fillCloud',
                   'screenNoise', 'colorWheel', 'drawPulse'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   printBold('343 BATCH 24', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Sky with clouds
   rectfill(0, 30, 640, 160, rgba8(60, 100, 160, 255));
   fillCloud(120, 80,  180, 55, rgba8(220, 230, 245, 255));
   fillCloud(350, 65,  140, 50, rgba8(210, 220, 240, 255));
   fillCloud(540, 90,  120, 45, rgba8(200, 215, 235, 255));

   // DNA strands
   drawDNA(60,  260, 22, 3, 110, rgba8(100, 200, 255, 255));
   fillDNA(160, 260, 20, 4, 100, rgba8(255, 160, 60, 255));

   // Mandala
   drawMandala(300, 255, 65, 8, rgba8(180, 255, 100, 230));

   // Vortex
   drawVortex(440, 245, 50, 4, rgba8(200, 100, 255, 200));

   // Color wheel mini
   for (let ang = 0; ang < 360; ang += 3) {
      const a = ang * Math.PI / 180;
      const col = colorWheel(ang);
      for (let r = 12; r <= 30; r++) {
         pset(560 + Math.cos(a) * r | 0, 240 + Math.sin(a) * r | 0, col);
      }
   }

   // Pulse rings
   for (let i = 0; i < 4; i++) {
      drawPulse(560, 240, 50, i / 3, colorWheel(i * 90));
   }

   // Labels and tags
   drawLabel(20,  310, 'SCORE', rgba8(255, 220, 80, 255), rgba8(20, 20, 60, 255));
   drawLabel(20,  325, 'LEVEL', rgba8(100, 255, 160, 255), rgba8(10, 40, 20, 255));
   drawTag(100,  310, 'NEW',  rgba8(255, 255, 255, 255), rgba8(200, 60, 60, 255));
   drawTag(100,  325, 'HOT',  rgba8(255, 255, 255, 255), rgba8(200, 120, 20, 255));

   // smoothstep2 strip
   for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const sv = smoothstep2(0.1, 0.9, t);
      pset(220 + i, 345 - (sv * 30) | 0, colorWheel(t * 200));
   }

   // Halftone panel
   for (let ys = 310; ys < 350; ys++) {
      for (let xv = 430; xv < 610; xv++) {
         const t = (xv - 430) / 180;
         pset(xv, ys, rgba8((t * 255) | 0, 100, (200 - t * 100) | 0, 255));
      }
   }
   setClip(430, 310, 180, 40);
   screenHalftone(6);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
