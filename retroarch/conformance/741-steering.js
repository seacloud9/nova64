// Conformance cart 741: Batch 60 — AI steering vectors.
// seekVec3, fleeVec3, arriveVec3, pursueVec3, evadeVec3,
// faceToward3D, orbitPoint3D, moveToward3D, springFollow3D,
// formationPos3D, wanderAngle3D, separateFromMeshes

let errors = [];

export function init() {
   const needed = ['seekVec3','fleeVec3','arriveVec3','pursueVec3','evadeVec3',
                   'faceToward3D','orbitPoint3D','moveToward3D','springFollow3D',
                   'formationPos3D','wanderAngle3D','separateFromMeshes'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   // seekVec3 — should point toward target
   const sv = seekVec3(0,0,0, 1,0,0, 2.0);
   if (!Array.isArray(sv)||sv[0]<1.5) errors.push('seek:'+sv);

   // fleeVec3 — should point away from threat
   const fv = fleeVec3(0,0,0, 1,0,0, 2.0);
   if (!Array.isArray(fv)||fv[0]>-1.5) errors.push('flee:'+fv);

   // arriveVec3 — within slowRadius should be slower
   const av = arriveVec3(0,0,0, 1,0,0, 4.0, 3.0);
   if (!Array.isArray(av)) errors.push('arrive-arr');
   else if (av[0]>=4.0) errors.push('arrive-slow:'+av[0].toFixed(2));

   // pursueVec3 — returns array
   const pv = pursueVec3(0,0,0, 5,0,0, -1,0,0, 2.0);
   if (!Array.isArray(pv)) errors.push('pursue-arr');

   // evadeVec3 — returns array, opposite of pursue
   const ev = evadeVec3(0,0,0, 5,0,0, -1,0,0, 2.0);
   if (!Array.isArray(ev)) errors.push('evade-arr');

   // faceToward3D
   setCamera([0,4,10],[0,0,0]);
   const m = createCube(0.5, rgba8(100,180,255,255));
   setPosition(m, 0,0,-3);
   faceToward3D(m, 3, 0, -3, 0.016, 10.0);
   // just check no crash

   // orbitPoint3D
   const op = orbitPoint3D(0,0,0, Math.PI/2, 2.0, 1.0);
   if (!Array.isArray(op)||Math.abs(op[1]-1.0)>0.01) errors.push('orbit:'+op);

   // moveToward3D
   const mt = moveToward3D(0,0,0, 5,0,0, 1.0);
   if (!Array.isArray(mt)||Math.abs(mt[0]-1.0)>0.01) errors.push('mt3d:'+mt);

   // springFollow3D — returns 6-element array
   const sf = springFollow3D(0,0,0, 5,0,0, 0,0,0, 8, 4, 0.016);
   if (!Array.isArray(sf)||sf.length<6) errors.push('spring-len:'+sf.length);

   // formationPos3D — 4 units in a circle
   const fp = formationPos3D(0,0,0, 0, 4, 3.0, 0);
   if (!Array.isArray(fp)||Math.abs(fp[0]-3.0)>0.1) errors.push('form:'+fp);

   // wanderAngle3D — returns float
   const wa = wanderAngle3D(m, 0.5, 0.016);
   if (typeof wa !== 'number') errors.push('wander-type');

   // separateFromMeshes — returns vec3
   const sep = separateFromMeshes(m, 5.0);
   if (!Array.isArray(sep)) errors.push('sep-arr');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('741 BATCH 60', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('AI steering vectors', 4, 24, rgba8(200,200,255,200));
}
