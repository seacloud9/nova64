// Conformance cart 184: splinePoint(points, t) — Catmull-Rom spline evaluation.

let errors = [];

export function init() {
   if (typeof splinePoint !== 'function') { errors.push('splinePoint-missing'); return; }

   const pts = [50, 100, 120, 60, 200, 140, 280, 80, 350, 120];
   const p0 = splinePoint(pts, 0.0);
   const p1 = splinePoint(pts, 1.0);

   if (typeof p0 !== 'object' || p0 === null) { errors.push('splinePoint-not-object'); return; }
   if (typeof p0.x !== 'number') errors.push('splinePoint-no-x');
   if (typeof p0.y !== 'number') errors.push('splinePoint-no-y');

   // t=0 should be near first point
   if (Math.abs(p0.x - 50) > 5) errors.push('splinePoint-t0-x: ' + p0.x);
   // t=1 should be near last point
   if (Math.abs(p1.x - 350) > 5) errors.push('splinePoint-t1-x: ' + p1.x);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('184 SPLINE POINT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const pts = [50, 160, 120, 80, 200, 200, 280, 100, 370, 180];

   // Draw control points
   for (let i = 0; i < pts.length; i += 2) {
      circfill(pts[i], pts[i+1], 3, rgba8(100, 140, 200, 255));
   }

   // Draw spline
   let prev = null;
   const steps = 80;
   for (let i = 0; i <= steps; i++) {
      const p = splinePoint(pts, i / steps);
      if (prev) {
         line(prev.x, prev.y, p.x, p.y, rgba8(255, 180, 60, 255));
      }
      prev = p;
   }

   print('Catmull-Rom spline', 8, 230, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
