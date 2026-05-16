// Conformance cart 369: drawEllipseArc, fillEllipseArc, drawStarburst2, colorMix2.

let errors = [];

export function init() {
   if (typeof drawEllipseArc !== 'function') { errors.push('drawEllipseArc-missing'); return; }
   if (typeof fillEllipseArc !== 'function') { errors.push('fillEllipseArc-missing'); return; }
   if (typeof drawStarburst2 !== 'function') { errors.push('drawStarburst2-missing'); return; }
   if (typeof colorMix2      !== 'function') { errors.push('colorMix2-missing');      return; }

   // colorMix2: mid blend
   const m = colorMix2(rgba8(255, 0, 0, 255), rgba8(0, 0, 255, 255), 0.5);
   const mr = (m >>> 24) & 0xFF;
   const mb = (m >>> 8)  & 0xFF;
   if (Math.abs(mr - 127) > 5) errors.push('mix2-r:' + mr);
   if (Math.abs(mb - 127) > 5) errors.push('mix2-b:' + mb);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('369 ELLIPSE ARC STARBURST', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Ellipse arcs — different orientations
   for (let i = 0; i < 6; i++) {
      const startA = (i / 6) * Math.PI * 2;
      const endA   = startA + Math.PI;
      drawEllipseArc(160, 160, 70, 50, startA, endA, colorFromHSL(i * 60, 0.8, 0.6));
   }
   fillEllipseArc(370, 160, 80, 50, -Math.PI / 6, Math.PI + Math.PI / 6, rgba8(100, 180, 255, 160));
   drawEllipseArc(370, 160, 80, 50, -Math.PI / 6, Math.PI + Math.PI / 6, rgba8(180, 220, 255, 220));

   // Starbursts
   drawStarburst2(160, 310, 60, 8,  rgba8(255, 200, 60, 255));
   drawStarburst2(310, 310, 55, 16, rgba8(100, 220, 255, 255));
   drawStarburst2(460, 310, 50, 24, rgba8(180, 255, 100, 255));
   drawStarburst2(580, 310, 45, 6,  rgba8(255, 100, 200, 255));

   // colorMix2 gradient
   const c1 = rgba8(255, 60, 60, 255), c2 = rgba8(60, 60, 255, 255);
   for (let i = 0; i < 20; i++) {
      rectfill(440 + i * 9, 120, 447 + i * 9, 160, colorMix2(c1, c2, i / 19));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
