// Conformance cart 392: vectorNormalize, vectorDot, vectorCross.

let errors = [];

export function init() {
   if (typeof vectorNormalize !== 'function') { errors.push('vectorNormalize-missing'); return; }
   if (typeof vectorDot       !== 'function') { errors.push('vectorDot-missing');       return; }
   if (typeof vectorCross     !== 'function') { errors.push('vectorCross-missing');     return; }

   // normalize: (3,4) -> (0.6, 0.8)
   const n = vectorNormalize(3, 4);
   if (Math.abs(n[0] - 0.6) > 0.01) errors.push('norm-x:' + n[0]);
   if (Math.abs(n[1] - 0.8) > 0.01) errors.push('norm-y:' + n[1]);

   // dot: perpendicular = 0
   const d = vectorDot(1, 0, 0, 1);
   if (Math.abs(d) > 0.01) errors.push('dot-perp:' + d);

   // dot: parallel = 1
   const d2 = vectorDot(1, 0, 1, 0);
   if (Math.abs(d2 - 1) > 0.01) errors.push('dot-par:' + d2);

   // cross: (1,0) x (0,1) = 1
   const cv = vectorCross(1, 0, 0, 1);
   if (Math.abs(cv - 1) > 0.01) errors.push('cross:' + cv);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('392 VECTOR MATH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Visual: normalized vector arrows from a grid of angles
   const cx = 200, cy = 200;
   for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const vx = Math.cos(ang) * 50, vy = Math.sin(ang) * 50;
      const nv = vectorNormalize(vx, vy);
      const scale = 60;
      line(cx, cy, cx + nv[0] * scale, cy + nv[1] * scale,
           colorFromHSL(i * 22, 0.8, 0.6));
      circfill(cx + nv[0] * scale, cy + nv[1] * scale, 3,
               colorFromHSL(i * 22, 0.8, 0.7));
   }

   // Dot product: show angle between two vectors
   const vecs = [[1, 0], [0.7, 0.7], [0, 1], [-0.5, 0.866]];
   for (let i = 0; i < vecs.length; i++) {
      const dv = vectorDot(1, 0, vecs[i][0], vecs[i][1]);
      const col = dv > 0 ? rgba8(80, 255, 120, 255) : rgba8(255, 80, 80, 255);
      line(420, 200, 420 + vecs[i][0] * 80, 200 + vecs[i][1] * 80, col);
   }
   print('dot product', 380, 295, rgba8(160, 160, 200, 200));

   // Cross product: show signed area
   for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI;
      const cv2 = vectorCross(1, 0, Math.cos(ang), Math.sin(ang));
      const h = (cv2 * 50) | 0;
      rectfill(430 + i * 22, 330 - (h > 0 ? h : 0),
               450 + i * 22, 330 + (h < 0 ? -h : 0),
               cv2 > 0 ? rgba8(80, 200, 255, 255) : rgba8(255, 80, 80, 255));
   }
   print('cross product', 430, 345, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
