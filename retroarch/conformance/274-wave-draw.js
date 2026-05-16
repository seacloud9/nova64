// Conformance cart 274: drawSineWave, drawSquiggle.

let errors = [];

export function init() {
   if (typeof drawSineWave !== 'function') { errors.push('drawSineWave-missing'); return; }
   if (typeof drawSquiggle !== 'function') { errors.push('drawSquiggle-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('274 WAVE DRAW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Multiple sine waves
   drawSineWave(20, 80,  600, 30, 1.0, 0,            rgba8(100, 200, 255, 255));
   drawSineWave(20, 120, 600, 20, 2.0, 0,            rgba8(255, 180, 60,  255));
   drawSineWave(20, 160, 600, 25, 3.0, Math.PI/2,    rgba8(180, 255, 100, 255));
   drawSineWave(20, 200, 600, 15, 4.5, Math.PI,      rgba8(255, 100, 200, 255));

   // Interference pattern
   for (let x = 0; x <= 600; x++) {
      const t = x / 600 * Math.PI * 4;
      const y = Math.sin(t)*20 + Math.sin(t*2.3)*10;
      pset(20+x, 240+y|0, rgba8(200, 220, 255, 200));
   }

   // Squiggles
   drawSquiggle(20,  295, 620, 295, 8, 4, rgba8(100, 200, 255, 255));
   drawSquiggle(20,  320, 400, 320, 5, 6, rgba8(255, 180, 60,  220));
   drawSquiggle(20,  340, 500, 360, 10, 3, rgba8(180, 100, 255, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
