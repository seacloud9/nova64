// Conformance cart 368: drawSweep, fillSweep, drawLissajous.

let errors = [];

export function init() {
   if (typeof drawSweep     !== 'function') { errors.push('drawSweep-missing');     return; }
   if (typeof fillSweep     !== 'function') { errors.push('fillSweep-missing');     return; }
   if (typeof drawLissajous !== 'function') { errors.push('drawLissajous-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('368 SWEEP LISSAJOUS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Pie chart of sweep slices
   const slices = [0.25, 0.35, 0.20, 0.20];
   const cols2  = [rgba8(255, 80, 80, 220), rgba8(80, 200, 80, 220),
                  rgba8(80, 120, 255, 220), rgba8(255, 200, 60, 220)];
   let ang = 0;
   for (let i = 0; i < slices.length; i++) {
      const span = slices[i] * Math.PI * 2;
      fillSweep(150, 200, 80, ang, ang + span, cols2[i]);
      drawSweep(150, 200, 80, ang, ang + span, rgba8(255, 255, 255, 120));
      ang += span;
   }

   // Lissajous curves
   drawLissajous(380, 150, 70, 70, 3, 2, 0,             rgba8(100, 220, 255, 255));
   drawLissajous(520, 150, 60, 60, 5, 4, Math.PI / 4,   rgba8(255, 160, 60,  255));
   drawLissajous(380, 290, 60, 50, 4, 3, Math.PI / 6,   rgba8(180, 255, 80,  255));
   drawLissajous(510, 290, 55, 55, 7, 5, Math.PI / 3,   rgba8(255, 80, 200,  220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
