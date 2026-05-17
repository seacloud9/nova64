// Conformance cart 740: Batch 59 — 3D collision math core tests.
// sphereVsSphere, sphereVsAABB, pointInAABB3D, closestPointOnAABB3D,
// closestPointOnSeg3D, distToSeg3D, meshesOverlap, castRaySphere3D,
// overlapDepth3D, planeVsSphere, getMeshRadius, meshOverlapOffset

let errors = [];

export function init() {
   const needed = ['sphereVsSphere','sphereVsAABB','pointInAABB3D',
                   'closestPointOnAABB3D','closestPointOnSeg3D','distToSeg3D',
                   'meshesOverlap','meshOverlapOffset','castRaySphere3D',
                   'overlapDepth3D','planeVsSphere','getMeshRadius'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   // sphereVsSphere
   if (!sphereVsSphere(0,0,0,1, 1,0,0,1)) errors.push('svs-hit');
   if (sphereVsSphere(0,0,0,1, 5,0,0,1)) errors.push('svs-miss');

   // sphereVsAABB
   if (!sphereVsAABB(0.5,0.5,0.5,0.2, 0,0,0,1,1,1)) errors.push('svaabb-hit');
   if (sphereVsAABB(5,5,5,0.4, 0,0,0,1,1,1)) errors.push('svaabb-miss');

   // pointInAABB3D
   if (!pointInAABB3D(0.5,0.5,0.5, 0,0,0,1,1,1)) errors.push('pia-in');
   if (pointInAABB3D(2,2,2, 0,0,0,1,1,1)) errors.push('pia-out');

   // closestPointOnAABB3D
   const cp = closestPointOnAABB3D(2,0.5,0.5, 0,0,0,1,1,1);
   if (!Array.isArray(cp)||Math.abs(cp[0]-1)>0.01) errors.push('cpaabb');

   // closestPointOnSeg3D
   const cs = closestPointOnSeg3D(0,1,0, 0,0,0,2,0,0);
   if (!Array.isArray(cs)||Math.abs(cs[0]-0)>0.01||Math.abs(cs[1])>0.01) errors.push('cpseg:'+JSON.stringify(cs));

   // distToSeg3D
   const ds = distToSeg3D(0,1,0, 0,0,0,2,0,0);
   if (Math.abs(ds-1)>0.01) errors.push('dseg:'+ds.toFixed(3));

   // meshesOverlap / meshOverlapOffset
   const a = createSphere(1.0, rgba8(200,100,80,255));
   const b = createSphere(1.0, rgba8(80,200,100,255));
   setPosition(a, 0,0,0); setPosition(b, 1,0,0);
   if (!meshesOverlap(a,b)) errors.push('moverlap');
   const off = meshOverlapOffset(a,b);
   if (!Array.isArray(off)) errors.push('moffset-arr');

   // castRaySphere3D
   const t = castRaySphere3D(0,0,-5, 0,0,1, 0,0,0, 1);
   if (t<0) errors.push('ray-miss:'+t);
   const t2 = castRaySphere3D(5,5,-5, 0,0,1, 0,0,0, 1);
   if (t2>=0) errors.push('ray-hit-bad:'+t2);

   // overlapDepth3D
   const od = overlapDepth3D(0,0,0,1, 0.5,0,0,1);
   if (od<0.5) errors.push('odepth:'+od.toFixed(3));

   // planeVsSphere
   if (!planeVsSphere(0,1,0,0, 0,0.5,0,1)) errors.push('pvs-hit');
   if (planeVsSphere(0,1,0,0, 0,5,0,1))   errors.push('pvs-miss');

   // getMeshRadius
   const r = getMeshRadius(a);
   if (r<=0) errors.push('radius:'+r);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('740 BATCH 59', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('3D collision math', 4, 24, rgba8(200,200,255,200));
}
