// Conformance cart 308: distanceXY, lineIntersect.

let errors = [];

export function init() {
   if (typeof distanceXY    !== 'function') { errors.push('distanceXY-missing');    return; }
   if (typeof lineIntersect !== 'function') { errors.push('lineIntersect-missing'); return; }

   // distanceXY: 3-4-5 triangle
   const d = distanceXY(0, 0, 3, 4);
   if (Math.abs(d - 5) > 0.01) errors.push('distanceXY-wrong:' + d);

   // lineIntersect: crossing diagonals
   const hit = lineIntersect(0, 0, 10, 10, 0, 10, 10, 0);
   if (!hit[2]) errors.push('lineIntersect-no-hit');
   if (Math.abs(hit[0] - 5) > 0.5) errors.push('lineIntersect-x:' + hit[0]);

   // lineIntersect: parallel lines
   const miss = lineIntersect(0, 0, 10, 0, 0, 5, 10, 5);
   if (miss[2]) errors.push('lineIntersect-false-hit');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('308 DISTANCE INTERSECT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Distance visualizer — concentric range rings
   const cx = 200, cy = 200;
   for (let r = 30; r <= 120; r += 30) {
      const col = colorFromHSL(r * 2, 0.8, 0.5);
      for (let a = 0; a < 360; a += 3) {
         const ang = a * Math.PI / 180;
         const px = cx + Math.cos(ang) * r;
         const py = cy + Math.sin(ang) * r;
         const d = distanceXY(cx, cy, px, py);
         const bright = Math.min(255, (d / 120) * 255);
         pset(px, py, rgba8(bright, bright >> 1, 255 - bright, 220));
      }
      print(Math.round(distanceXY(cx, cy, cx + r, cy)) + 'px', cx + r + 2, cy - 5, col);
   }

   // Line intersection demo
   const lines = [
      [350, 100, 500, 320], [350, 320, 500, 100],
      [360, 130, 490, 200], [410, 100, 440, 310],
   ];
   const cols = [rgba8(100, 200, 255, 255), rgba8(255, 150, 50, 255),
                 rgba8(100, 255, 150, 255), rgba8(255, 100, 200, 255)];
   for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      line(ln[0], ln[1], ln[2], ln[3], cols[i]);
   }
   for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
         const ln1 = lines[i], ln2 = lines[j];
         const res = lineIntersect(ln1[0], ln1[1], ln1[2], ln1[3],
                                   ln2[0], ln2[1], ln2[2], ln2[3]);
         if (res[2]) {
            circfill(res[0], res[1], 4, rgba8(255, 255, 80, 255));
         }
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
