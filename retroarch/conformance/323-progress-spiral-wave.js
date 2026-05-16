// Conformance cart 323: fillProgressBar, fillSpiral, drawWave.

let errors = [];

export function init() {
   if (typeof fillProgressBar !== 'function') { errors.push('fillProgressBar-missing'); return; }
   if (typeof fillSpiral      !== 'function') { errors.push('fillSpiral-missing');      return; }
   if (typeof drawWave        !== 'function') { errors.push('drawWave-missing');        return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('323 PROGRESS SPIRAL WAVE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Progress bars
   const levels = [0.1, 0.3, 0.55, 0.75, 0.9, 1.0];
   for (let i = 0; i < levels.length; i++) {
      fillProgressBar(20, 40 + i * 20, 200, 14, levels[i],
                      colorFromHSL(levels[i] * 120, 0.8, 0.5),
                      rgba8(30, 30, 50, 255));
      print((levels[i] * 100).toFixed(0) + '%', 228, 45 + i * 20, rgba8(180, 200, 255, 200));
   }

   // Spirals
   fillSpiral(350, 180, 70, 4, rgba8(100, 200, 255, 255));
   fillSpiral(490, 190, 55, 3, rgba8(255, 160, 60, 220));
   fillSpiral(580, 175, 40, 5, rgba8(180, 255, 100, 200));

   // Waves
   for (let i = 0; i < 5; i++) {
      drawWave(20, 270 + i * 16, 580, 18, 2 + i * 0.5, i * 0.4,
               colorFromHSL(i * 50, 0.8, 0.55));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
