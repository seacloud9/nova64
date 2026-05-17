// Conformance cart 705: drawLine3D, drawPoint3D, debugText3D, drawBounds3D,
// drawAxis3D, screenToWorld, getSceneAABB, getNearestMesh,
// getMeshCenter, isPointInBounds, countVisibleMeshes, drawCircle3D

let errors = [];
let cube, sphere;

export function init() {
   const needed = ['drawLine3D','drawPoint3D','debugText3D','drawBounds3D',
                   'drawAxis3D','screenToWorld','getSceneAABB','getNearestMesh',
                   'getMeshCenter','isPointInBounds','countVisibleMeshes','drawCircle3D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 2, 8], [0, 0, 0]);

   cube   = createCube(1.5, rgba8(100, 160, 255, 200));
   setPosition(cube, -1.5, 0, 0);
   sphere = createSphere(0.6, rgba8(255, 160, 80, 200));
   setPosition(sphere, 1.5, 0, 0);

   const aabb = getSceneAABB();
   if (!aabb || !aabb.min) errors.push('aabb-bad');

   const near = getNearestMesh(0, 0, 0);
   if (!near) errors.push('nearest-zero');

   const center = getMeshCenter(cube);
   if (!Array.isArray(center)) errors.push('center-bad');

   const inB = isPointInBounds(cube, -1.5, 0, 0);
   if (inB !== true) errors.push('inBounds-fail:' + inB);

   const outB = isPointInBounds(cube, 10, 10, 10);
   if (outB !== false) errors.push('outBounds-fail');

   const vis = countVisibleMeshes();
   if (vis < 2) errors.push('visible-lt-2:' + vis);

   const wp = screenToWorld(320, 180, 0);
   if (!wp || typeof wp.x !== 'number') errors.push('screenToWorld-bad');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('705 DEBUG 3D', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));

   drawAxis3D(0, 0, 0, 1.5);
   drawBounds3D(cube,   rgba8(80, 200, 255, 180));
   drawBounds3D(sphere, rgba8(255, 180, 60, 180));
   drawLine3D(-3, 0, 0, 3, 0, 0, rgba8(255, 100, 100, 180));
   drawCircle3D(0, 0, 0, 2.5, rgba8(100, 200, 255, 140), 20);
   drawPoint3D(0, 1, 0, 4, rgba8(255, 255, 80, 220));
   debugText3D('origin', 0, 1.8, 0, rgba8(200, 220, 255, 200));
}
