// Conformance cart 465: noiseSeed, noiseDetail.

let errors = [];

export function init() {
   if (typeof noiseSeed   !== 'function') { errors.push('noiseSeed-missing');   return; }
   if (typeof noiseDetail !== 'function') { errors.push('noiseDetail-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 8, 20, 255));
   print('465 NOISE CONTROL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Seeded noise — deterministic strip (seed 42)
   noiseSeed(42);
   noiseDetail(1, 0.5);
   for (let x = 0; x < 300; x++) {
      const n = noise(x * 0.04);
      const v = Math.floor(n * 220);
      pset(20 + x, 30, rgba8(v, v + 30, 255, 255));
   }

   // Same seed again — must produce identical strip
   noiseSeed(42);
   for (let x = 0; x < 300; x++) {
      const n = noise(x * 0.04);
      const v = Math.floor(n * 220);
      pset(20 + x, 38, rgba8(v, v + 30, 255, 255));
   }

   // Different seed — visually different
   noiseSeed(999);
   for (let x = 0; x < 300; x++) {
      const n = noise(x * 0.04);
      const v = Math.floor(n * 220);
      pset(20 + x, 46, rgba8(255, v, v + 20, 255));
   }

   // noiseDetail with 4 octaves
   noiseSeed(7);
   noiseDetail(4, 0.5);
   for (let x = 0; x < 580; x++) {
      for (let y = 0; y < 80; y++) {
         const n = noise(x * 0.02, y * 0.02);
         const v = Math.floor(n * 255);
         pset(20 + x, 70 + y, rgba8(v, Math.floor(v * 0.6), 255 - v, 255));
      }
   }

   // Reset to defaults
   noiseDetail(1, 0.5);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
