// Conformance cart 181: drawArc(cx,cy,r,startDeg,endDeg,color) / fillArc(...).

let errors = [];

export function init() {
   if (typeof drawArc  !== 'function') { errors.push('drawArc-missing');  return; }
   if (typeof fillArc  !== 'function') { errors.push('fillArc-missing');  return; }
   // Degenerate: zero radius, zero span — must not crash
   drawArc(100, 100, 0, 0, 360, rgba8(255, 255, 255, 255));
   fillArc(100, 100, 0, 0, 360, rgba8(255, 255, 255, 255));
   drawArc(100, 100, 20, 45, 45, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('181 DRAW ARC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Pie chart
   const slices = [
      { start:   0, end:  90, fc: rgba8(255, 80, 80, 255), lc: rgba8(255, 160, 160, 255) },
      { start:  90, end: 210, fc: rgba8(80, 200, 80, 255), lc: rgba8(160, 255, 160, 255) },
      { start: 210, end: 360, fc: rgba8(80, 120, 255, 255), lc: rgba8(160, 200, 255, 255) },
   ];
   for (const s of slices) {
      fillArc(160, 150, 70, s.start, s.end, s.fc);
      drawArc(160, 150, 70, s.start, s.end, s.lc);
   }

   // Arcs at different radii
   for (let i = 0; i < 5; i++) {
      const r = 20 + i * 12;
      drawArc(160, 150, r, -30, 30 + i * 20, rgba8(200, 200, 200, 255));
   }

   print('pie chart + arcs', 8, 230, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
