// Conformance cart 180: vecLen / vecNorm / vecDot / vecCross / vecLerp.

let errors = [];

export function init() {
   if (typeof vecLen   !== 'function') { errors.push('vecLen-missing');   return; }
   if (typeof vecNorm  !== 'function') { errors.push('vecNorm-missing');  return; }
   if (typeof vecDot   !== 'function') { errors.push('vecDot-missing');   return; }
   if (typeof vecCross !== 'function') { errors.push('vecCross-missing'); return; }
   if (typeof vecLerp  !== 'function') { errors.push('vecLerp-missing');  return; }

   // vecLen
   const len = vecLen(3, 4);
   if (Math.abs(len - 5) > 1e-6) errors.push('vecLen-3-4: ' + len);

   // vecNorm
   const n = vecNorm(3, 0);
   if (typeof n !== 'object' || n === null) errors.push('vecNorm-not-object');
   else {
      if (Math.abs(n.x - 1) > 1e-6) errors.push('vecNorm-x: ' + n.x);
      if (Math.abs(n.y - 0) > 1e-6) errors.push('vecNorm-y: ' + n.y);
   }

   // vecDot
   const dot = vecDot(1, 0, 0, 1);
   if (Math.abs(dot - 0) > 1e-6) errors.push('vecDot-perp: ' + dot);
   const dot2 = vecDot(1, 0, 1, 0);
   if (Math.abs(dot2 - 1) > 1e-6) errors.push('vecDot-same: ' + dot2);

   // vecCross
   const cross = vecCross(1, 0, 0, 1);
   if (Math.abs(cross - 1) > 1e-6) errors.push('vecCross: ' + cross);

   // vecLerp
   const vl = vecLerp(0, 0, 10, 20, 0.5);
   if (typeof vl !== 'object') errors.push('vecLerp-not-object');
   else {
      if (Math.abs(vl.x - 5) > 1e-6) errors.push('vecLerp-x: ' + vl.x);
      if (Math.abs(vl.y - 10) > 1e-6) errors.push('vecLerp-y: ' + vl.y);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('180 VEC2', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const c = rgba8(180, 220, 255, 255);
   print('vecLen(3,4)=' + vecLen(3,4).toFixed(2), 8, 40, c);
   const n = vecNorm(3, 4);
   print('vecNorm(3,4)=(' + n.x.toFixed(2) + ',' + n.y.toFixed(2) + ')', 8, 52, c);
   print('vecDot(1,0,0,1)=' + vecDot(1,0,0,1).toFixed(1), 8, 64, c);
   print('vecCross(1,0,0,1)=' + vecCross(1,0,0,1).toFixed(1), 8, 76, c);

   // Lerp arrows visualized
   const t = nova64.time();
   const lp = (t * 0.4) % 1.0;
   const ax = 50, ay = 180, bx = 270, by = 100;
   const v = vecLerp(ax, ay, bx, by, lp);
   line(ax, ay, bx, by, rgba8(60, 80, 160, 255));
   circfill(v.x, v.y, 5, rgba8(255, 200, 60, 255));
   print('vecLerp t=' + lp.toFixed(2), 8, 218, c);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
