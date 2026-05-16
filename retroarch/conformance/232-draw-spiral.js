// Conformance cart 232: drawSpiral(cx,cy,r1,r2,turns,color).

let errors = [];

export function init() {
   if (typeof drawSpiral !== 'function') { errors.push('drawSpiral-missing'); return; }
   drawSpiral(0, 0, 0, 0, 1, rgba8(100,100,100,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('232 DRAW SPIRAL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Basic spiral
   drawSpiral(120, 160, 0, 80, 4, rgba8(100, 200, 255, 255));
   print('4 turns', 82, 250, rgba8(140, 180, 220, 255));

   // Tight spiral from center
   drawSpiral(320, 160, 5, 70, 6, rgba8(255, 160, 60, 255));
   print('6 turns', 282, 250, rgba8(140, 180, 220, 255));

   // Ring spiral (doesn't start at center)
   drawSpiral(520, 160, 30, 80, 3, rgba8(180, 255, 100, 255));
   print('ring 3t', 486, 250, rgba8(140, 180, 220, 255));

   // Multi-color spiral
   const colors2 = [
      rgba8(255,60,60,255), rgba8(255,200,60,255), rgba8(60,220,60,255),
      rgba8(60,160,255,255), rgba8(200,60,255,255),
   ];
   for (let i = 0; i < 5; i++) {
      const t1 = i * 0.8, t2 = (i + 1) * 0.8;
      drawSpiral(200, 330, t1 * 12, t2 * 12, 0.5, colors2[i]);
   }
   print('segmented', 165, 348, rgba8(140, 180, 220, 255));

   // Simple expanding spiral
   drawSpiral(440, 320, 0, 50, 5, rgba8(200, 100, 255, 255));
   print('5t', 428, 348, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
