// Conformance cart 380: drawBezierCurve, bezierPoint, drawRoundedPoly, fillRoundedPoly.

let errors = [];

export function init() {
   if (typeof drawBezierCurve  !== 'function') { errors.push('drawBezierCurve-missing');  return; }
   if (typeof bezierPoint      !== 'function') { errors.push('bezierPoint-missing');      return; }
   if (typeof drawRoundedPoly  !== 'function') { errors.push('drawRoundedPoly-missing');  return; }
   if (typeof fillRoundedPoly  !== 'function') { errors.push('fillRoundedPoly-missing');  return; }

   // bezierPoint: at t=0 returns start
   const pt = bezierPoint(10, 20, 50, 100, 150, 100, 200, 20, 0);
   if (Math.abs(pt[0] - 10) > 1) errors.push('bezier-t0-x:' + pt[0]);
   if (Math.abs(pt[1] - 20) > 1) errors.push('bezier-t0-y:' + pt[1]);

   // bezierPoint: at t=1 returns end
   const pt2 = bezierPoint(10, 20, 50, 100, 150, 100, 200, 20, 1);
   if (Math.abs(pt2[0] - 200) > 1) errors.push('bezier-t1-x:' + pt2[0]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('380 BEZIER POLY', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bezier curves
   drawBezierCurve(40, 200, 100, 60, 200, 60, 260, 200, rgba8(100, 200, 255, 255));
   drawBezierCurve(40, 200, 100, 340, 200, 340, 260, 200, rgba8(255, 160, 60, 255));
   drawBezierCurve(300, 100, 350, 280, 450, 280, 500, 100, rgba8(180, 255, 100, 255));
   drawBezierCurve(300, 300, 450, 100, 150, 100, 300, 300, rgba8(255, 80, 200, 200));

   // bezierPoint: dot along curve
   for (let t = 0; t <= 1; t += 0.1) {
      const p = bezierPoint(300, 100, 350, 280, 450, 280, 500, 100, t);
      circfill(p[0], p[1], 3, rgba8(255, 255, 80, 255));
   }

   // Rounded polygon
   const hexPts = [];
   for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      hexPts.push(540 + Math.cos(a) * 60, 200 + Math.sin(a) * 60);
   }
   fillRoundedPoly(hexPts, 10, rgba8(80, 120, 200, 200));
   drawRoundedPoly(hexPts, 10, rgba8(140, 180, 255, 255));

   // Triangle
   const triPts = [580, 100, 620, 160, 540, 160];
   fillRoundedPoly(triPts, 6, rgba8(200, 100, 60, 200));
   drawRoundedPoly(triPts, 6, rgba8(255, 160, 100, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
