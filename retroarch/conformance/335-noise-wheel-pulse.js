// Conformance cart 335: screenNoise, colorWheel, drawPulse.

let errors = [];

export function init() {
   if (typeof screenNoise !== 'function') { errors.push('screenNoise-missing'); return; }
   if (typeof colorWheel  !== 'function') { errors.push('colorWheel-missing');  return; }
   if (typeof drawPulse   !== 'function') { errors.push('drawPulse-missing');   return; }

   // colorWheel: 0 deg = red-ish, 120 = green-ish, 240 = blue-ish
   const r = colorWheel(0);
   const rv = (r >>> 24) & 0xFF;
   if (rv < 200) errors.push('wheel-red:' + rv);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('335 NOISE WHEEL PULSE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Color wheel disc
   const wcx = 120, wcy = 190;
   for (let ang = 0; ang < 360; ang += 1) {
      const col = colorWheel(ang);
      for (let r = 10; r <= 70; r += 2) {
         const a = ang * Math.PI / 180;
         pset(wcx + Math.cos(a) * r | 0, wcy + Math.sin(a) * r | 0, col);
      }
   }

   // Pulse rings at various t values
   for (let i = 0; i < 6; i++) {
      const t = i / 5;
      drawPulse(350, 190, 80, t, colorWheel(i * 60));
   }
   drawPulse(500, 190, 60, 0.3, rgba8(255, 200, 80,  255));
   drawPulse(500, 190, 60, 0.6, rgba8(100, 200, 255, 255));
   drawPulse(500, 190, 60, 0.9, rgba8(200, 100, 255, 255));

   // Noise on a gradient strip (deterministic seed-based noise)
   for (let ys = 300; ys < 350; ys++) {
      for (let xv = 20; xv < 280; xv++) {
         const t = (xv - 20) / 260;
         pset(xv, ys, rgba8((t * 200 + 30) | 0, 100, (200 - t * 150) | 0, 255));
      }
   }
   setClip(20, 300, 260, 50);
   screenNoise(0.3);
   clearClip();
   print('noise', 25, 355, rgba8(160, 160, 200, 200));

   // Non-noised reference
   for (let ys = 300; ys < 350; ys++) {
      for (let xv = 290; xv < 550; xv++) {
         const t = (xv - 290) / 260;
         pset(xv, ys, rgba8((t * 200 + 30) | 0, 100, (200 - t * 150) | 0, 255));
      }
   }
   print('clean', 295, 355, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
