// Conformance cart 182: combined curves showcase — bezier, polyline, arc, flood fill.

let errors = [];

export function init() {
   const needed = ['drawBezier', 'polyline', 'drawArc', 'fillArc', 'floodFill',
                   'mapRange', 'inverseLerp', 'pingPong', 'vecLen', 'vecNorm'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('182 CURVES SHOWCASE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Bezier wave
   for (let i = 0; i < 6; i++) {
      const x0 = 10 + i * 50;
      const cy2 = 80 + pingPong(t * 0.8 + i * 0.3, 30) - 15;
      drawBezier(x0, 90, x0 + 25, cy2, x0 + 50, 90,
         colorHSV(i * 40, 200, 220, 255), 24);
   }

   // Polyline spiral
   const pts = [];
   for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 6;
      const r2 = 8 + i * 1.5;
      pts.push(160 + Math.round(Math.cos(a) * r2));
      pts.push(180 + Math.round(Math.sin(a) * r2));
   }
   polyline(pts, rgba8(100, 200, 255, 200));

   // Arc gauge
   const gauge = mapRange(Math.sin(t), -1, 1, -120, 120);
   fillArc(450, 180, 50, 180 + gauge, 180, rgba8(40, 100, 200, 255));
   drawArc(450, 180, 50, 60, 300, rgba8(100, 140, 220, 255));
   const lv = inverseLerp(-120, 120, gauge);
   print(Math.round(lv * 100) + '%', 434, 175, rgba8(200, 230, 255, 255));

   // Vec helpers display
   const n = vecNorm(Math.cos(t), Math.sin(t));
   const vx = 520 + Math.round(n.x * 30), vy = 100 + Math.round(n.y * 30);
   line(520, 100, vx, vy, rgba8(255, 200, 60, 255));
   print('len=' + vecLen(n.x * 30, n.y * 30).toFixed(1), 500, 140, rgba8(180, 220, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
