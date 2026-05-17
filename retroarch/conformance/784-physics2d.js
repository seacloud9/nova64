// Conformance cart 784: Batch 63 — 2D physics bodies.
// createBody, destroyBody, setBodyVel, getBodyVel, setBodyGravity,
// updateBodies, getBodyPos, setBodyPos, bodiesCollide,
// resolveBodyCollision, setBodyRestitution, applyForce

let errors = [];

export function init() {
   const needed = ['createBody','destroyBody','setBodyVel','getBodyVel',
                   'setBodyGravity','updateBodies','getBodyPos','setBodyPos',
                   'bodiesCollide','resolveBodyCollision','setBodyRestitution','applyForce'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   // createBody + getBodyPos
   const a = createBody(10, 20, 8, 8, 1.0);
   const b = createBody(10, 20, 8, 8, 1.0); // same position — will collide
   if (a <= 0) errors.push('create-a');
   const pa = getBodyPos(a);
   if (!Array.isArray(pa) || Math.abs(pa[0]-10)>0.1) errors.push('pos-a:'+pa);

   // setBodyPos
   setBodyPos(b, 14, 20);
   const pb = getBodyPos(b);
   if (Math.abs(pb[0]-14)>0.1) errors.push('setpos:'+pb[0]);

   // setBodyVel / getBodyVel
   setBodyVel(a, 3.0, -1.5);
   const va = getBodyVel(a);
   if (!Array.isArray(va) || Math.abs(va[0]-3.0)>0.1) errors.push('vel:'+va);

   // setBodyGravity
   setBodyGravity(a, 0, 100);

   // applyForce (dt=0.016)
   setBodyVel(b, 0, 0);
   applyForce(b, 100, 0, 0.016);
   const vb = getBodyVel(b);
   if (vb[0] < 0.5) errors.push('force:'+vb[0].toFixed(3));

   // updateBodies
   updateBodies(0.016);
   const pa2 = getBodyPos(a);
   if (Math.abs(pa2[0]-pa[0]-3.0*0.016) > 0.1) errors.push('update-x:'+pa2[0].toFixed(3));

   // bodiesCollide — overlap
   setBodyPos(a, 0,0); setBodyPos(b, 5,0); // width=8, so half=4+4=8 > dist=5
   if (!bodiesCollide(a,b)) errors.push('collide-hit');
   setBodyPos(b, 20,0);
   if (bodiesCollide(a,b)) errors.push('collide-miss');

   // resolveBodyCollision
   setBodyPos(a,0,0); setBodyPos(b,6,0);
   setBodyVel(a,2,0); setBodyVel(b,-2,0);
   setBodyRestitution(a,0.5); setBodyRestitution(b,0.5);
   resolveBodyCollision(a,b); // should push apart

   // destroyBody
   destroyBody(a);
   const pa3 = getBodyPos(a);
   if (pa3[0] !== 0) errors.push('destroy');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('784 BATCH 63', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('2D physics bodies', 4, 24, rgba8(200,200,255,200));
}
