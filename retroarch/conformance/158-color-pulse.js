// Conformance cart 158: colorPulse(c, speed, minBrightness) — oscillating brightness.

let errors = [];

export function init() {
   if (typeof colorPulse !== 'function') { errors.push('colorPulse-missing'); return; }

   // Result should be a color (number)
   const r = colorPulse(rgba8(255, 255, 255, 255), 1.0, 0.2);
   if (typeof r !== 'number') errors.push('colorPulse-not-number');

   // Resulting R channel should be in [0, 255]
   if (colorR(r) < 0 || colorR(r) > 255) errors.push('colorPulse-range');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('158 COLOR PULSE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // 5 circles pulsing at different speeds
   const speeds = [0.5, 1.0, 2.0, 3.0, 5.0];
   const colors = [
      rgba8(255, 80, 80, 255), rgba8(80, 255, 80, 255),
      rgba8(80, 160, 255, 255), rgba8(255, 200, 60, 255), rgba8(200, 80, 255, 255)
   ];
   for (let i = 0; i < 5; i++) {
      const c = colorPulse(colors[i], speeds[i], 0.15);
      circfill(50 + i * 56, 140, 20, c);
   }
   printCentered('pulses at x0.5 x1 x2 x3 x5', 160, 170, rgba8(180, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
