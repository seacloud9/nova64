// Conformance cart 358: screenFlipH, screenFlipV, screenReflect, screenThermal.

let errors = [];

export function init() {
   if (typeof screenFlipH  !== 'function') { errors.push('screenFlipH-missing');  return; }
   if (typeof screenFlipV  !== 'function') { errors.push('screenFlipV-missing');  return; }
   if (typeof screenReflect !== 'function') { errors.push('screenReflect-missing'); return; }
   if (typeof screenThermal !== 'function') { errors.push('screenThermal-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('358 FLIP THERMAL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Left: gradient that gets flipped horizontal
   for (let ys = 40; ys < 160; ys++) {
      for (let xv = 20; xv < 200; xv++) {
         const t = (xv - 20) / 180;
         pset(xv, ys, rgba8((t * 255) | 0, 100, (200 - t * 150) | 0, 255));
      }
   }
   setClip(20, 40, 180, 120);
   screenFlipH();
   clearClip();
   print('flipH', 25, 165, rgba8(160, 160, 200, 200));

   // Middle: gradient flipped vertical
   for (let ys = 40; ys < 160; ys++) {
      for (let xv = 230; xv < 410; xv++) {
         const t = (ys - 40) / 120;
         pset(xv, ys, rgba8(100, (t * 255) | 0, (200 - t * 100) | 0, 255));
      }
   }
   setClip(230, 40, 180, 120);
   screenFlipV();
   clearClip();
   print('flipV', 235, 165, rgba8(160, 160, 200, 200));

   // Right: thermal on scene
   rectfill(440, 40, 620, 160, rgba8(10, 10, 40, 255));
   circfill(500, 100, 35, rgba8(255, 100, 50, 255));
   circfill(570, 90,  25, rgba8(200, 200, 60, 255));
   setClip(440, 40, 180, 120);
   screenThermal();
   clearClip();
   print('thermal', 445, 165, rgba8(160, 160, 200, 200));

   // Reflect demo
   for (let ys = 200; ys < 340; ys++) {
      for (let xv = 20; xv < 200; xv++) {
         const t = (xv - 20) / 180;
         pset(xv, ys, rgba8((t * 200 + 55) | 0, 100, 200, 255));
      }
   }
   setClip(20, 200, 180, 140);
   screenReflect(0);
   clearClip();
   print('reflect', 25, 345, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
