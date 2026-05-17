// Conformance cart 727: Batch 56 showcase — 3D debug drawing.
// drawLine3D, drawPoint3D, debugText3D, drawBounds3D, drawAxis3D,
// screenToWorld, getSceneAABB, getNearestMesh, getMeshCenter,
// isPointInBounds, countVisibleMeshes, drawCircle3D

let errors = [];
let t = 0;
let meshes3d = [];

export function init() {
   const needed = ['drawLine3D','drawPoint3D','debugText3D','drawBounds3D',
                   'drawAxis3D','screenToWorld','getSceneAABB','getNearestMesh',
                   'getMeshCenter','isPointInBounds','countVisibleMeshes','drawCircle3D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 4, 10], [0, 0, 0]);
   setLightDirection(1, 2, 0.5);

   const shapes = [
      () => createCube(1.2, rgba8(80, 140, 220, 200)),
      () => createSphere(0.7, rgba8(220, 100, 60, 200)),
      () => createCylinder(0.4, 1.5, rgba8(60, 200, 140, 200)),
      () => createTorus(0.8, 0.2, rgba8(200, 80, 220, 200)),
      () => createCone(0.5, 1.2, rgba8(220, 200, 60, 200)),
   ];
   for (let i = 0; i < shapes.length; i++) {
      const m = shapes[i]();
      const angle = (i / shapes.length) * Math.PI * 2;
      setPosition(m, Math.cos(angle) * 3, 0, Math.sin(angle) * 3);
      meshes3d.push(m);
   }

   const aabb = getSceneAABB();
   if (!aabb || !aabb.min || !aabb.max) errors.push('aabb-fail');

   const near = getNearestMesh(0, 0, 0);
   if (!near) errors.push('nearest-fail');
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   for (let i = 0; i < meshes3d.length; i++) {
      setRotation(meshes3d[i], 0, t * 0.5 + i * 0.8, 0);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('727 BATCH 56', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));

   // Draw world axes
   drawAxis3D(0, 0, 0, 2.0);

   // Draw bounds for each mesh
   for (let i = 0; i < meshes3d.length; i++) {
      drawBounds3D(meshes3d[i], rgba8(120, 200, 255, 100));
   }

   // Orbit rings
   drawCircle3D(0, 0, 0, 3.0, rgba8(80, 140, 255, 80), 32);
   drawCircle3D(0, 1, 0, 2.0, rgba8(255, 120, 80, 60), 24);

   // Lines between meshes
   for (let i = 0; i < meshes3d.length; i++) {
      const a = getMeshCenter(meshes3d[i]);
      const b = getMeshCenter(meshes3d[(i+1) % meshes3d.length]);
      if (a && b) drawLine3D(a[0],a[1],a[2],b[0],b[1],b[2], hslColor(i*72,0.8,0.6,120));
   }

   // Debug labels
   debugText3D('center', 0, 1.5, 0, rgba8(200, 220, 255, 200));
   drawPoint3D(0, 0, 0, 5, rgba8(255, 255, 80, 200));

   const vis = countVisibleMeshes();
   print('visible: ' + vis, 4, 24, rgba8(160, 200, 255, 180));

   const wp = screenToWorld(320, 180, 0);
   if (wp) print('world: ' + wp.x.toFixed(1) + ',' + wp.z.toFixed(1), 4, 34, rgba8(140, 180, 220, 160));
}
