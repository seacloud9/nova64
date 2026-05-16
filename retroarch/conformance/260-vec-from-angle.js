// Conformance cart 260: vecFromAngle, closestPointOnLine, distToLine.

let errors = [];

export function init() {
   if (typeof vecFromAngle       !== 'function') { errors.push('vecFromAngle-missing');       return; }
   if (typeof closestPointOnLine !== 'function') { errors.push('closestPointOnLine-missing'); return; }
   if (typeof distToLine         !== 'function') { errors.push('distToLine-missing');         return; }

   // vecFromAngle(0) = {x:1, y:0}
   const v0 = vecFromAngle(0);
   if (Math.abs(v0.x - 1) > 0.01) errors.push('vfa-x: ' + v0.x);
   if (Math.abs(v0.y)     > 0.01) errors.push('vfa-y: ' + v0.y);

   // vecFromAngle(90) = {x:0, y:1}
   const v90 = vecFromAngle(90);
   if (Math.abs(v90.x)     > 0.01) errors.push('vfa90-x: ' + v90.x);
   if (Math.abs(v90.y - 1) > 0.01) errors.push('vfa90-y: ' + v90.y);

   // closestPointOnLine: point (0,0) on segment (10,10)-(20,10) → (10,10)
   const cp = closestPointOnLine(0, 0, 10, 10, 20, 10);
   if (Math.abs(cp.x - 10) > 0.1) errors.push('cpol-x: ' + cp.x);
   if (Math.abs(cp.y - 10) > 0.1) errors.push('cpol-y: ' + cp.y);

   // distToLine: point at (10, 20) from line (0,10)-(20,10) = 10
   const d = distToLine(10, 20, 0, 10, 20, 10);
   if (Math.abs(d - 10) > 0.1) errors.push('dtl: ' + d);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('260 VEC LINE UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // vecFromAngle compass wheel
   const cx = 120, cy = 180;
   for (let d = 0; d < 360; d += 15) {
      const v = vecFromAngle(d);
      const col = colorFromHSL(d, 0.85, 0.55);
      line(cx, cy, cx + v.x*70|0, cy + v.y*70|0, col);
   }

   // Closest point on line demo
   const lx1 = 250, ly1 = 120, lx2 = 450, ly2 = 240;
   line(lx1, ly1, lx2, ly2, rgba8(100, 150, 220, 255));

   const pts = [[300,80],[400,280],[350,160],[480,140]];
   for (const [px,py] of pts) {
      const cp = closestPointOnLine(px, py, lx1, ly1, lx2, ly2);
      line(px, py, cp.x|0, cp.y|0, rgba8(80, 220, 120, 180));
      circfill(px, py, 4, rgba8(255, 180, 60, 255));
      circfill(cp.x|0, cp.y|0, 3, rgba8(80, 220, 120, 255));
   }

   // Distance heatmap
   for (let x = 0; x < 640; x += 4) {
      for (let y = 260; y < 360; y += 4) {
         const d = distToLine(x, y, 100, 290, 540, 310);
         const intensity = Math.max(0, 1 - d / 60);
         rectfill(x, y, x+3, y+3, rgba8(intensity*80|0, intensity*180|0, intensity*255|0, 200));
      }
   }
   line(100, 290, 540, 310, rgba8(255, 220, 80, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
