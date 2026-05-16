// Conformance cart 175: pointInRect / pointInCirc / rectIntersects / circIntersects.

let errors = [];

export function init() {
   if (typeof pointInRect    !== 'function') { errors.push('pointInRect-missing');    return; }
   if (typeof pointInCirc    !== 'function') { errors.push('pointInCirc-missing');    return; }
   if (typeof rectIntersects !== 'function') { errors.push('rectIntersects-missing'); return; }
   if (typeof circIntersects !== 'function') { errors.push('circIntersects-missing'); return; }

   // pointInRect
   if (!pointInRect(5, 5, 0, 0, 10, 10)) errors.push('pointInRect-inside');
   if (pointInRect(15, 5, 0, 0, 10, 10)) errors.push('pointInRect-outside');
   if (pointInRect(10, 5, 0, 0, 10, 10)) errors.push('pointInRect-edge-right');

   // pointInCirc
   if (!pointInCirc(0, 0, 0, 0, 5)) errors.push('pointInCirc-center');
   if (!pointInCirc(3, 4, 0, 0, 5)) errors.push('pointInCirc-on-edge');
   if (pointInCirc(4, 4, 0, 0, 5)) errors.push('pointInCirc-outside');

   // rectIntersects
   if (!rectIntersects(0,0,10,10, 5,5,10,10)) errors.push('rectIntersects-overlap');
   if (rectIntersects(0,0,5,5, 6,0,5,5))     errors.push('rectIntersects-adjacent');

   // circIntersects
   if (!circIntersects(0,0,5, 8,0,5)) errors.push('circIntersects-overlap');
   if (circIntersects(0,0,3, 10,0,3)) errors.push('circIntersects-far');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('175 GEOMETRY TESTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw interactive demo: mouse-like cursor at fixed position
   const mx = 160, my = 140;
   const rx = 100, ry = 110, rw = 80, rh = 50;
   const cx2 = 240, cy2 = 140, cr = 35;

   const inR = pointInRect(mx, my, rx, ry, rw, rh);
   const inC = pointInCirc(mx, my, cx2, cy2, cr);

   rect(rx, ry, rx+rw, ry+rh, inR ? rgba8(80, 255, 80, 255) : rgba8(80, 100, 180, 255));
   circ(cx2, cy2, cr, inC ? rgba8(80, 255, 80, 255) : rgba8(80, 100, 180, 255));
   circfill(mx, my, 3, rgba8(255, 200, 60, 255));

   print('rect:' + (inR ? 'IN' : 'OUT') + ' circ:' + (inC ? 'IN' : 'OUT'),
         8, 200, rgba8(180, 220, 255, 255));

   const ri = rectIntersects(rx,ry,rw,rh, cx2-cr,cy2-cr,cr*2,cr*2);
   print('rect+circ bbox intersect: ' + ri, 8, 212, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
