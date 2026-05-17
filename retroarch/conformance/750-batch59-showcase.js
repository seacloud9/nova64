// Conformance cart 750: Batch 59 showcase — 3D collision math visual demo.
// sphereVsSphere, sphereVsAABB, meshesOverlap, castRaySphere3D,
// overlapDepth3D, planeVsSphere, getMeshRadius, closestPointOnSeg3D

let errors = [];
let t = 0;
let balls = [], targets = [];
const N = 6;

export function init() {
   const needed = ['sphereVsSphere','sphereVsAABB','meshesOverlap','meshOverlapOffset',
                   'castRaySphere3D','overlapDepth3D','getMeshRadius','closestPointOnSeg3D'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,5,12],[0,0,0]);
   setLightDirection(1,2,1);

   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.5, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle)*3, 0, Math.sin(angle)*3-3);
      balls.push(m);
   }

   // Static target sphere
   const tgt = createSphere(0.7, rgba8(255,220,80,200));
   setPosition(tgt, 0, 0, -3);
   targets.push(tgt);
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   for (let i = 0; i < balls.length; i++) {
      const angle = (i / N) * Math.PI * 2 + t * 0.6;
      const dist = 2.5 + Math.sin(t * 1.2 + i) * 0.8;
      setPosition(balls[i], Math.cos(angle)*dist, Math.sin(t*0.8+i)*0.3, Math.sin(angle)*dist-3);
   }
   // Separate overlapping balls
   for (let i = 0; i < balls.length; i++) {
      for (let j = i+1; j < balls.length; j++) {
         const off = meshOverlapOffset(balls[i], balls[j]);
         if (off && (Math.abs(off[0])+Math.abs(off[1])+Math.abs(off[2]))>0.01) {
            // push slightly apart (visual only)
         }
      }
   }
}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('750 BATCH 59', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('3D collision math', 4, 24, rgba8(200,200,255,200));

   // Show overlap counts
   let hits = 0;
   for (let i = 0; i < balls.length; i++) {
      if (targets.length && meshesOverlap(balls[i], targets[0])) hits++;
   }
   print('target hits: ' + hits, 4, 34, rgba8(160,200,255,180));

   // Ray from camera toward origin
   const rayT = castRaySphere3D(0,5,12, 0,-0.38,-0.92, 0,0,-3, 0.7);
   print('ray t: ' + (rayT>=0?rayT.toFixed(2):'miss'), 4, 44, rgba8(160,200,255,160));

   const r = getMeshRadius(balls[0]);
   print('ball r: ' + r.toFixed(2), 4, 54, rgba8(140,180,220,140));
}
