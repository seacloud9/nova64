// Conformance cart 125: drawSpline — Catmull-Rom smooth curve.
// drawSpline(points, color [, segmentsPerSegment [, closed]])

let errors = [];

export function init() {
   if (typeof drawSpline !== 'function') { errors.push('drawSpline-missing'); return; }

   // Single point should not crash
   drawSpline([50, 50], rgba8(255, 255, 255, 255));

   // Two points: straight line effectively
   drawSpline([10, 10, 100, 10], rgba8(255, 255, 255, 255));

   // Three points: curve
   drawSpline([50, 100, 160, 50, 270, 100], rgba8(255, 0, 0, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('125 SPLINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Open S-curve
   drawSpline([60, 200, 100, 120, 180, 180, 240, 100, 300, 160, 360, 80],
              rgba8(100, 200, 255, 255), 20);

   // Control points
   for (const [px, py] of [[60,200],[100,120],[180,180],[240,100],[300,160],[360,80]])
      circ(px, py, 3, rgba8(255, 120, 60, 255));

   // Closed loop
   drawSpline([160, 60, 220, 90, 200, 140, 120, 140, 100, 90],
              rgba8(180, 255, 120, 255), 16, true);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
