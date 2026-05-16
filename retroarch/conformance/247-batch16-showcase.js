// Conformance cart 247: batch 16 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawThickLine', 'drawArrowFilled', 'drawCheck',
                   'triangleWave', 'squareWave', 'sawWave',
                   'screenEdgeDetect', 'screenEmboss', 'screenSharpen',
                   'drawCloud', 'screenNightVision', 'colorFromHSL'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   printBold('247 BATCH 16', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // HSL color wheel
   const cx2 = 80, cy2 = 120, r = 60;
   for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const a2 = (i + 1) / 24 * Math.PI * 2;
      const c = colorFromHSL(i * 15, 0.85, 0.55);
      trifill(cx2, cy2, cx2 + Math.cos(a)*r, cy2 + Math.sin(a)*r,
              cx2 + Math.cos(a2)*r, cy2 + Math.sin(a2)*r, c);
   }

   // Thick lines compass rose
   const cx3 = 240, cy3 = 120;
   for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const c = colorFromHSL(i * 45, 0.8, 0.6);
      drawThickLine(cx3, cy3, cx3 + Math.cos(a)*55, cy3 + Math.sin(a)*55, 5, c);
   }

   // Filled arrows showing flow
   drawArrowFilled(330, 80,  430, 80,  10, 18, rgba8(100, 200, 255, 255));
   drawArrowFilled(430, 80,  430, 180, 10, 18, rgba8(255, 160, 60,  255));
   drawArrowFilled(430, 180, 330, 180, 10, 18, rgba8(180, 255, 100, 255));
   drawArrowFilled(330, 180, 330, 80,  10, 18, rgba8(255, 100, 180, 255));

   // Wave function display (mini)
   for (let i = 0; i <= 120; i++) {
      const t = i / 120 * 4;
      pset(480 + i, 80 - (triangleWave(t) * 30) | 0, rgba8(100, 200, 255, 255));
      pset(480 + i, 115 - (squareWave(t) * 30) | 0,  rgba8(255, 160, 60,  255));
      pset(480 + i, 150 - (sawWave(t) * 30) | 0,     rgba8(180, 255, 100, 255));
   }

   // Checklist
   const items2 = ['thick line', 'filled arrow', 'checkmark', 'wave funcs'];
   for (let i = 0; i < 4; i++) {
      rectfill(20, 215 + i*26, 34, 229 + i*26, rgba8(30, 40, 80, 255));
      rect(20, 215 + i*26, 34, 229 + i*26, rgba8(100, 130, 200, 255));
      drawCheck(27, 222 + i*26, 9, rgba8(80, 220, 100, 255));
      print(items2[i], 42, 217 + i*26, rgba8(200, 220, 255, 255));
   }

   // Clouds
   drawCloud(380, 270, 40, rgba8(200, 215, 240, 255));
   drawCloud(520, 280, 30, rgba8(180, 200, 230, 200));

   // Apply mild sharpen to right half
   setClip(320, 200, 320, 160);
   screenSharpen(1.5);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
