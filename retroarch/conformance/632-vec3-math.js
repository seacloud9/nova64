// Conformance cart 632: addVec3, subVec3, scaleVec3, normVec3,
//                        dotVec3, magVec3, crossVec3, lerpVec3, rotateVec2.

let errors = [];

export function init() {
   const needed = ['addVec3','subVec3','scaleVec3','normVec3',
                   'dotVec3','magVec3','crossVec3','lerpVec3','rotateVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // addVec3
   const a = addVec3(1,2,3, 4,5,6);
   if (Math.abs(a.x-5)>0.001||Math.abs(a.y-7)>0.001||Math.abs(a.z-9)>0.001)
      errors.push('addVec3-value');

   // subVec3
   const s = subVec3(5,7,9, 4,5,6);
   if (Math.abs(s.x-1)>0.001||Math.abs(s.y-2)>0.001||Math.abs(s.z-3)>0.001)
      errors.push('subVec3-value');

   // scaleVec3
   const sc = scaleVec3(1,2,3, 2);
   if (Math.abs(sc.x-2)>0.001||Math.abs(sc.y-4)>0.001||Math.abs(sc.z-6)>0.001)
      errors.push('scaleVec3-value');

   // magVec3
   const m = magVec3(3,4,0);
   if (Math.abs(m-5)>0.001) errors.push('magVec3-value');

   // normVec3
   const n = normVec3(3,4,0);
   const nm = Math.sqrt(n.x*n.x+n.y*n.y+n.z*n.z);
   if (Math.abs(nm-1)>0.001) errors.push('normVec3-unit');

   // dotVec3
   const d = dotVec3(1,0,0, 0,1,0);
   if (Math.abs(d)>0.001) errors.push('dotVec3-perp');
   const d2 = dotVec3(1,0,0, 1,0,0);
   if (Math.abs(d2-1)>0.001) errors.push('dotVec3-parallel');

   // crossVec3
   const cr = crossVec3(1,0,0, 0,1,0);
   if (Math.abs(cr.x)>0.001||Math.abs(cr.y)>0.001||Math.abs(cr.z-1)>0.001)
      errors.push('crossVec3-value');

   // lerpVec3
   const l = lerpVec3(0,0,0, 10,10,10, 0.5);
   if (Math.abs(l.x-5)>0.001||Math.abs(l.y-5)>0.001||Math.abs(l.z-5)>0.001)
      errors.push('lerpVec3-value');

   // rotateVec2
   const rv = rotateVec2(1, 0, Math.PI / 2);
   if (Math.abs(rv.x)>0.001||Math.abs(rv.y-1)>0.001) errors.push('rotateVec2-value');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('632 VEC3 MATH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // 3D axes projected to 2D
   const cx = 200, cy = 180;
   const scale = 70;
   // x axis (red)
   const xp = {x: cx + scale, y: cy};
   line(cx, cy, xp.x, xp.y, rgba8(255,80,80,255));
   // y axis (green)
   const yp = {x: cx, y: cy - scale};
   line(cx, cy, yp.x, yp.y, rgba8(80,255,80,255));
   // z axis (blue) isometric
   const zp = {x: cx - Math.floor(scale*0.5), y: cy + Math.floor(scale*0.5)};
   line(cx, cy, zp.x, zp.y, rgba8(80,160,255,255));

   // lerpVec3 sweep
   for (let i = 0; i < 30; i++) {
      const tv = i / 29;
      const lv = lerpVec3(50, 300, 0, 550, 300, 0, tv);
      pset(Math.floor(lv.x), Math.floor(lv.y) - Math.floor(Math.sin(tv*Math.PI)*40),
           hslColor(Math.floor(tv*360), 0.8, 0.5, 220));
   }

   // rotateVec2 ring
   for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const rv = rotateVec2(60, 0, ang);
      pset(400 + Math.floor(rv.x), 200 + Math.floor(rv.y), hslColor(i*15, 0.8, 0.6, 220));
   }

   // crossVec3 indicator
   const cr = crossVec3(1,0,0, 0,1,0);
   print('cross z=' + cr.z.toFixed(1), 4, 240, rgba8(180,180,220,200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
