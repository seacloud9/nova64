// Conformance cart 487: batch 36 combined showcase.

let errors = [];

export function init() {
   const needed = ['lerpColor', 'ease', 'arc', 'bezier', 'noiseMap', 'flowField',
                   'colorMode', 'color', 'drawGradient', 'drawRadialGradient',
                   'drawSkyGradient', 'hexColor'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   // Sky gradient base
   drawSkyGradient(rgba8(5, 5, 30, 255), rgba8(30, 80, 140, 255));

   printBold('487 BATCH 36', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Noise terrain via noiseMap
   noiseSeed(88);
   const terrain = noiseMap(580, 1, 0.02, 0, 0);
   for (let tx = 0; tx < 580; tx++) {
      const h = Math.floor(terrain[tx] * 80);
      drawGradient(20 + tx, 280 - h, 1, h, rgba8(60, 180, 60, 220), rgba8(30, 80, 30, 220), 1);
   }

   // Flow field visualization
   const field = flowField(12, 8, 0.2, 0);
   for (let fy = 0; fy < 8; fy++) {
      for (let fx = 0; fx < 12; fx++) {
         const angle = field[fy * 12 + fx];
         const ox = 22 + fx * 48;
         const oy = 30 + fy * 28;
         const c = lerpColor(rgba8(80, 180, 255, 180), rgba8(255, 80, 120, 180), fy / 7);
         line(ox, oy, Math.floor(ox + Math.cos(angle) * 14), Math.floor(oy + Math.sin(angle) * 14), c);
      }
   }

   // Bezier arch structure
   bezier(60, 320, 80, 180, 280, 180, 300, 320, rgba8(200, 160, 80, 200));
   bezier(300, 320, 320, 180, 520, 180, 540, 320, rgba8(160, 200, 80, 200));

   // Arc rings
   for (let ri = 0; ri < 5; ri++) {
      arc(420, 200, 20 + ri * 15, 20 + ri * 15, TWO_PI * (ri * 0.1), TWO_PI * (0.8 + ri * 0.04),
          lerpColor(hexColor('#FF4488', 220), hexColor('#44BBFF', 220), ri / 4));
   }

   // HSB color strip via colorMode
   colorMode('HSB');
   for (let i = 0; i < 20; i++) {
      const eased = ease(i / 19, 'sineInOut');
      rectfill(20 + i * 14, 330, 32 + i * 14, 355, color(i * 18, 0.9, 0.4 + eased * 0.6, 220));
   }
   colorMode('RGB');

   // Radial gradient sun
   drawRadialGradient(530, 80, 50, rgba8(255, 240, 160, 255), rgba8(255, 120, 40, 0));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
