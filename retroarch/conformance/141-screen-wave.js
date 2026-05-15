// Conformance cart 141: screenWave(amplitude, frequency, phase) — horizontal scanline shift.

let errors = [];

export function init() {
   if (typeof screenWave !== 'function') { errors.push('screenWave-missing'); }
   screenWave(0, 0, 0);
   screenWave(100, 100, 100);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('141 SCREEN WAVE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw vertical stripes, then apply wave
   for (let x = 40; x < 280; x += 20) {
      const c = ((x - 40) / 20) % 2 === 0 ? rgba8(80, 150, 255, 255) : rgba8(255, 120, 60, 255);
      rectfill(x, 50, x + 18, 200, c);
   }
   screenWave(6, 0.08, 0);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
