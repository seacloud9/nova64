// Conformance cart 194: splinePoint + drawCubicBezier combined visual.

let errors = [];

export function init() {
   if (typeof splinePoint     !== 'function') { errors.push('splinePoint-missing');     return; }
   if (typeof drawCubicBezier !== 'function') { errors.push('drawCubicBezier-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('194 SPLINE SHOWCASE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Catmull-Rom path (top)
   const cpts = [
      50, 180, 100, 80, 180, 200, 260, 60, 340, 160, 420, 80, 500, 180, 580, 100
   ];
   // Control points
   for (let i = 0; i < cpts.length; i += 2) {
      circfill(cpts[i], cpts[i+1], 3, rgba8(60, 90, 160, 255));
   }
   // Draw spline
   let prev = null;
   for (let i = 0; i <= 120; i++) {
      const p = splinePoint(cpts, i / 120);
      if (prev) line(prev.x, prev.y, p.x, p.y, rgba8(100, 200, 255, 255));
      prev = p;
   }
   // Moving dot on spline
   const sp = splinePoint(cpts, (t * 0.2) % 1.0);
   circfill(sp.x, sp.y, 5, rgba8(255, 220, 60, 255));

   // Cubic bezier (bottom half)
   const progress = (Math.sin(t * 0.8) * 0.5 + 0.5);
   const cx0 = 80 + progress * 100;
   const cx1 = 540 - progress * 100;
   drawCubicBezier(60, 300, cx0, 240, cx1, 340, 580, 300,
      rgba8(255, 120, 60, 255), 64);
   circfill(60, 300, 4, rgba8(200, 200, 255, 255));
   circfill(580, 300, 4, rgba8(200, 200, 255, 255));
   circ(cx0, 240, 4, rgba8(100, 100, 200, 200));
   circ(cx1, 340, 4, rgba8(100, 100, 200, 200));
   line(60, 300, cx0, 240, rgba8(60, 60, 120, 255));
   line(580, 300, cx1, 340, rgba8(60, 60, 120, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
