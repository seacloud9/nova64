// Conformance cart 204: drawNoise(x,y,w,h, density, color).

let errors = [];

export function init() {
   if (typeof drawNoise !== 'function') { errors.push('drawNoise-missing'); return; }
   // Degenerate: must not crash
   drawNoise(0, 0, 0, 0, 0.5, rgba8(255,255,255,255));
   drawNoise(0, 0, 100, 100, 0, rgba8(255,255,255,255));
   drawNoise(0, 0, 100, 100, 1.5, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('204 DRAW NOISE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Different densities
   const densities = [0.05, 0.15, 0.30, 0.60, 0.90];
   for (let i = 0; i < densities.length; i++) {
      const x0 = 20 + i * 118;
      rectfill(x0, 50, x0 + 110, 160, rgba8(14, 22, 40, 255));
      rect(x0, 50, x0 + 110, 160, rgba8(60, 80, 140, 255));
      drawNoise(x0, 50, 110, 110, densities[i], rgba8(160, 200, 255, 255));
      print(toFixed(densities[i], 2), x0 + 2, 163, rgba8(140, 180, 220, 255));
   }

   // Color noise
   drawNoise(20, 180, 580, 60, 0.2, rgba8(255, 100, 60, 150));
   drawNoise(20, 180, 580, 60, 0.1, rgba8(60, 200, 255, 150));

   print('noise densities', 8, 255, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
