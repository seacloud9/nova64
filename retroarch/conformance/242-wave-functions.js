// Conformance cart 242: triangleWave, squareWave, sawWave.

let errors = [];

export function init() {
   if (typeof triangleWave !== 'function') { errors.push('triangleWave-missing'); return; }
   if (typeof squareWave   !== 'function') { errors.push('squareWave-missing'); return; }
   if (typeof sawWave      !== 'function') { errors.push('sawWave-missing'); return; }

   if (Math.abs(triangleWave(0)) > 0.01)    errors.push('tri(0): ' + triangleWave(0));
   if (Math.abs(triangleWave(0.5) - 1) > 0.01) errors.push('tri(0.5): ' + triangleWave(0.5));
   if (Math.abs(triangleWave(1)) > 0.01)    errors.push('tri(1): ' + triangleWave(1));
   if (squareWave(0) !== 1)  errors.push('sq(0): ' + squareWave(0));
   if (squareWave(0.5) !== 0) errors.push('sq(0.5): ' + squareWave(0.5));
   if (Math.abs(sawWave(0)) > 0.01)    errors.push('saw(0): ' + sawWave(0));
   if (Math.abs(sawWave(0.75) - 0.75) > 0.01) errors.push('saw(0.75): ' + sawWave(0.75));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('242 WAVE FUNCTIONS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const W = 560, H = 100, ox = 40;

   // Triangle wave
   let py2 = -1;
   for (let i = 0; i <= W; i++) {
      const t = i / W * 4;
      const y = (80 + H) - (triangleWave(t) * H) | 0;
      if (py2 >= 0) line(ox + i - 1, py2, ox + i, y, rgba8(100, 200, 255, 255));
      py2 = y;
   }
   print('triangle', 610, 110, rgba8(100, 200, 255, 255));
   hline(ox, ox + W, 80 + H, rgba8(40, 50, 80, 255));

   // Square wave
   py2 = -1;
   for (let i = 0; i <= W; i++) {
      const t = i / W * 4;
      const y = (210 + H) - (squareWave(t) * H) | 0;
      if (py2 >= 0) line(ox + i - 1, py2, ox + i, y, rgba8(255, 160, 60, 255));
      py2 = y;
   }
   print('square', 610, 240, rgba8(255, 160, 60, 255));
   hline(ox, ox + W, 210 + H, rgba8(40, 50, 80, 255));

   // Sawtooth wave
   py2 = -1;
   for (let i = 0; i <= W; i++) {
      const t = i / W * 4;
      const y = (340 + H) - (sawWave(t) * H) | 0;
      if (py2 >= 0) line(ox + i - 1, py2, ox + i, y, rgba8(180, 255, 100, 255));
      py2 = y;
   }
   print('sawtooth', 610, 370, rgba8(180, 255, 100, 255));
   hline(ox, ox + W, 340 + H, rgba8(40, 50, 80, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
