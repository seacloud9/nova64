// Conformance cart 644: angleVec3, reflectVec3, projectVec3,
//                        clamp01, bilinear, smootherstep.

let errors = [];

export function init() {
   const needed = ['angleVec3','reflectVec3','projectVec3',
                   'clamp01','bilinear','smootherstep'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // angleVec3 — angle between X and Y axis = PI/2
   const ang = angleVec3(1,0,0, 0,1,0);
   if (Math.abs(ang - Math.PI/2) > 0.001) errors.push('angleVec3-90deg');
   // parallel vectors → angle = 0
   const ang0 = angleVec3(1,0,0, 1,0,0);
   if (Math.abs(ang0) > 0.001) errors.push('angleVec3-0deg');

   // reflectVec3 — reflect (0,1,0) off floor normal (0,-1,0) → (0,-1,0)...
   // actually reflect (0,-1,0) off normal (0,1,0) → (0,1,0)
   const rv = reflectVec3(0,-1,0, 0,1,0);
   if (Math.abs(rv.x)>0.001||Math.abs(rv.y-1)>0.001||Math.abs(rv.z)>0.001)
      errors.push('reflectVec3-value');

   // projectVec3 — project (3,4,0) onto unit X = (3,0,0)
   const pv = projectVec3(3,4,0, 1,0,0);
   if (Math.abs(pv.x-3)>0.001||Math.abs(pv.y)>0.001||Math.abs(pv.z)>0.001)
      errors.push('projectVec3-value');

   // clamp01
   if (Math.abs(clamp01(0.5)-0.5)>0.0001) errors.push('clamp01-mid');
   if (Math.abs(clamp01(-1)-0)>0.0001)    errors.push('clamp01-low');
   if (Math.abs(clamp01(2)-1)>0.0001)     errors.push('clamp01-high');

   // smootherstep
   if (Math.abs(smootherstep(0))  >0.0001) errors.push('smootherstep-0');
   if (Math.abs(smootherstep(1)-1)>0.0001) errors.push('smootherstep-1');
   const sm = smootherstep(0.5);
   if (sm < 0.4 || sm > 0.6) errors.push('smootherstep-mid');

   // bilinear — corners of a unit square with values 0,1,0,1 → at (0.5,0.5) = 0.5
   const bl = bilinear(0, 1, 0, 1, 0.5, 0.5);
   if (Math.abs(bl - 0.5) > 0.001) errors.push('bilinear-value');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('644 VEC3 ADVANCED', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // reflectVec3 visualization (2D: reflect off horizontal floor)
   const rcx = 120, rcy = 200;
   line(rcx-60, rcy, rcx+60, rcy, rgba8(180,180,180,200));
   // incident: pointing down-right
   const inc = {x:0.707, y:-0.707};
   line(rcx-Math.floor(inc.x*50), rcy+Math.floor(inc.y*50), rcx, rcy, rgba8(255,100,80,255));
   const ref = reflectVec3(inc.x, inc.y, 0, 0, 1, 0);
   line(rcx, rcy, rcx+Math.floor(ref.x*50), rcy-Math.floor(ref.y*50), rgba8(80,255,120,255));
   print('reflectVec3', 60, 215, rgba8(180,180,220,180));

   // smootherstep curve
   for (let i = 0; i < 80; i++) {
      const tv = i / 79;
      const sv = smootherstep(tv);
      pset(280 + i * 3, 260 - Math.floor(sv * 80), hslColor(Math.floor(tv*220), 0.8, 0.5, 220));
   }
   print('smootherstep', 280, 270, rgba8(180,180,220,180));

   // bilinear heatmap (4x4 cells)
   for (let xi = 0; xi < 20; xi++) {
      for (let yi = 0; yi < 20; yi++) {
         const u = xi / 19, v = yi / 19;
         const bl = bilinear(0, 255, 0, 128, u, v);
         pset(460 + xi * 5, 60 + yi * 5, rgba8(Math.floor(bl), Math.floor(bl * 0.5), 80, 220));
      }
   }
   print('bilinear', 460, 170, rgba8(180,180,220,180));

   // clamp01 strip
   for (let i = 0; i < 30; i++) {
      const raw = (i / 29) * 2 - 0.5;
      const cl = clamp01(raw);
      rectfill(4 + i*9, 295, 12 + i*9, 310, rgba8(Math.floor(cl*255), 100, 80, 220));
   }
   print('clamp01', 4, 315, rgba8(180,180,220,180));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
