// Conformance cart 205: batch 12 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['printItalic', 'printUnderline', 'drawProgressBar', 'gridSnap',
                   'colorMatrix', 'neonGlow', 'barChart', 'drawMeter',
                   'percentStr', 'toFixed', 'colorMix3', 'drawNoise'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   printBold('205 BATCH 12', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Noise texture (background)
   drawNoise(0, 0, 640, 360, 0.03, rgba8(40, 60, 100, 180));

   // Neon circles
   neonGlow(100, 100, 30, rgba8(255, 80, 120, 255), 8);
   neonGlow(180, 100, 24, rgba8(60, 200, 255, 255), 6);

   // Progress + meter
   const prog = Math.sin(t * 0.5) * 0.5 + 0.5;
   drawProgressBar(20, 140, 200, 10, prog, rgba8(80, 200, 100, 255), rgba8(20, 30, 50, 255));
   drawMeter(20, 156, 200, 10, Math.sin(t * 1.2) * 50 + 50, 0, 100,
      rgba8(255, 160, 60, 255), rgba8(20, 30, 50, 255));
   print(percentStr(prog), 228, 140, rgba8(180, 220, 255, 255));

   // Text styles
   printItalic(   'Italic: ' + toFixed(t, 2), 20, 175, rgba8(255, 220, 80, 255));
   printUnderline('Underline: ' + toFixed(t * 2, 1) + 's', 20, 190, rgba8(200, 240, 255, 255));

   // Color mix triangle (small)
   for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4 - i; j++) {
         const k = 4 - i - j;
         const c = colorMix3(rgba8(255,60,60,255), i, rgba8(60,200,60,255), j, rgba8(60,60,255,255), k);
         rectfill(400 + i * 14 + j * 7, 130 + j * 12, 412 + i * 14 + j * 7, 140 + j * 12, c);
      }
   }

   // Grid snap dot
   const rawX = 280 + Math.sin(t * 0.7) * 80;
   circfill(gridSnap(rawX, 12), 230, 5, rgba8(80, 220, 255, 255));
   circfill(rawX, 230, 2, rgba8(255, 80, 60, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
