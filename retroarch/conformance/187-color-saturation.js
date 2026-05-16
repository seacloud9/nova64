// Conformance cart 187: colorDesaturate / colorSaturate.

let errors = [];

export function init() {
   if (typeof colorDesaturate !== 'function') { errors.push('colorDesaturate-missing'); return; }
   if (typeof colorSaturate   !== 'function') { errors.push('colorSaturate-missing');   return; }

   const red = rgba8(255, 0, 0, 255);

   // Fully desaturate red → should be gray
   const gray = colorDesaturate(red, 1.0);
   if (typeof gray !== 'number') errors.push('colorDesaturate-not-number');
   if (Math.abs(colorR(gray) - colorG(gray)) > 5) errors.push('colorDesaturate-not-gray R=' + colorR(gray) + ' G=' + colorG(gray));

   // Zero desaturation → color unchanged
   const same = colorDesaturate(red, 0.0);
   if (colorR(same) !== 255 || colorG(same) > 5) errors.push('colorDesaturate-0: R=' + colorR(same));

   // colorSaturate must return a number
   const sat = colorSaturate(gray, 1.0);
   if (typeof sat !== 'number') errors.push('colorSaturate-not-number');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('187 COLOR SATURATION', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const colors = [
      rgba8(255, 60, 60, 255), rgba8(60, 200, 80, 255),
      rgba8(60, 120, 255, 255), rgba8(255, 180, 40, 255),
   ];
   const steps = 5;
   for (let ci = 0; ci < colors.length; ci++) {
      for (let i = 0; i < steps; i++) {
         const t = i / (steps - 1);
         const c = colorDesaturate(colors[ci], t);
         const x = 20 + ci * 70 + i * 12;
         rectfill(x, 50, x + 10, 80, c);
      }
      // Resaturate the desaturated version
      const desat = colorDesaturate(colors[ci], 0.8);
      for (let i = 0; i < steps; i++) {
         const t = i / (steps - 1);
         const c = colorSaturate(desat, t * 2);
         const x = 20 + ci * 70 + i * 12;
         rectfill(x, 85, x + 10, 115, c);
      }
   }
   print('desat / resat', 20, 120, rgba8(160, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
