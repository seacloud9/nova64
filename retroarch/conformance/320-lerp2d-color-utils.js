// Conformance cart 320: lerp2D, colorAnalogous, colorSplit.

let errors = [];

export function init() {
   if (typeof lerp2D         !== 'function') { errors.push('lerp2D-missing');         return; }
   if (typeof colorAnalogous !== 'function') { errors.push('colorAnalogous-missing'); return; }
   if (typeof colorSplit     !== 'function') { errors.push('colorSplit-missing');     return; }

   // lerp2D
   const pt = lerp2D(0, 0, 100, 200, 0.5);
   if (Math.abs(pt[0] - 50) > 0.5) errors.push('lerp2D-x:' + pt[0]);
   if (Math.abs(pt[1] - 100) > 0.5) errors.push('lerp2D-y:' + pt[1]);

   // colorSplit
   const c = rgba8(200, 150, 100, 255);
   const sp = colorSplit(c);
   if (sp[0] !== 200) errors.push('split-r:' + sp[0]);
   if (sp[1] !== 150) errors.push('split-g:' + sp[1]);
   if (sp[2] !== 100) errors.push('split-b:' + sp[2]);
   if (sp[3] !== 255) errors.push('split-a:' + sp[3]);

   // colorAnalogous returns 2 elements
   const ana = colorAnalogous(rgba8(200, 100, 50, 255), 30);
   if (!Array.isArray(ana) || ana.length < 2) errors.push('analogous-len');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('320 LERP2D COLOR UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // lerp2D: interpolated path
   const pts = [[50, 80], [200, 300], [400, 120], [580, 280]];
   for (let i = 0; i < pts.length - 1; i++) {
      for (let t = 0; t <= 1; t += 0.02) {
         const p = lerp2D(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], t);
         pset(p[0], p[1], colorFromHSL(i * 80 + t * 60, 0.8, 0.6));
      }
   }

   // colorAnalogous: show base + two analogous
   const baseColors = [rgba8(220, 60, 60, 255), rgba8(60, 180, 60, 255), rgba8(60, 80, 220, 255)];
   for (let i = 0; i < baseColors.length; i++) {
      const xv = 40 + i * 180;
      rectfill(xv, 310, xv + 50, 350, baseColors[i]);
      const ana = colorAnalogous(baseColors[i], 40);
      rectfill(xv + 55, 310, xv + 100, 350, ana[0]);
      rectfill(xv + 105, 310, xv + 150, 350, ana[1]);
   }

   // colorSplit: decompose and display channels
   const testColor = rgba8(180, 120, 80, 200);
   const sp = colorSplit(testColor);
   rectfill(460, 60, 510, 100, rgba8(sp[0], 0, 0, 255));
   rectfill(460, 105, 510, 145, rgba8(0, sp[1], 0, 255));
   rectfill(460, 150, 510, 190, rgba8(0, 0, sp[2], 255));
   rectfill(460, 195, 510, 235, rgba8(sp[0], sp[1], sp[2], 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
