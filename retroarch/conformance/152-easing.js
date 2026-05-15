// Conformance cart 152: standalone easing — easeIn/Out/InOut/Bounce/Elastic.

let errors = [];

export function init() {
   if (typeof easeIn      !== 'function') { errors.push('easeIn-missing'); return; }
   if (typeof easeOut     !== 'function') { errors.push('easeOut-missing'); return; }
   if (typeof easeInOut   !== 'function') { errors.push('easeInOut-missing'); return; }
   if (typeof easeBounce  !== 'function') { errors.push('easeBounce-missing'); return; }
   if (typeof easeElastic !== 'function') { errors.push('easeElastic-missing'); return; }

   // All must return 0 at t=0 and 1 at t=1
   if (Math.abs(easeIn(0))      > 0.001) errors.push('easeIn-0');
   if (Math.abs(easeIn(1) - 1)  > 0.001) errors.push('easeIn-1');
   if (Math.abs(easeOut(0))     > 0.001) errors.push('easeOut-0');
   if (Math.abs(easeOut(1) - 1) > 0.001) errors.push('easeOut-1');
   if (Math.abs(easeInOut(0))   > 0.001) errors.push('easeInOut-0');
   if (Math.abs(easeInOut(1) - 1) > 0.001) errors.push('easeInOut-1');
   if (Math.abs(easeBounce(1) - 1) > 0.01)  errors.push('easeBounce-1');
   if (Math.abs(easeElastic(1) - 1) > 0.01) errors.push('easeElastic-1');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('152 EASING', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw easing curves
   const x0 = 30, y0 = 200, cw = 270, ch = 130;
   const fns = [easeIn, easeOut, easeInOut, easeBounce, easeElastic];
   const cols = [
      rgba8(255, 80, 80, 255), rgba8(80, 255, 80, 255),
      rgba8(80, 160, 255, 255), rgba8(255, 200, 60, 255), rgba8(200, 80, 255, 255)
   ];
   for (let fi = 0; fi < fns.length; fi++) {
      let px = -1, py = -1;
      for (let i = 0; i <= 60; i++) {
         const t = i / 60;
         const v = fns[fi](t);
         const sx = x0 + Math.round(t * cw);
         const sy = y0 - Math.round(v * ch);
         if (px >= 0) line(px, py, sx, sy, cols[fi]);
         px = sx; py = sy;
      }
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
