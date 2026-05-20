// Conformance cart 681: setInstanceTransforms batched matrix upload.

let errors = [];
let mesh = 0;

export function init() {
   if (typeof createInstancedMesh !== 'function') errors.push('createInstancedMesh-missing');
   if (typeof setInstanceTransforms !== 'function') errors.push('setInstanceTransforms-missing');
   if (typeof getInstanceTransform !== 'function') errors.push('getInstanceTransform-missing');
   if (errors.length) return;

   mesh = createInstancedMesh('cube', 3);
   if (!mesh) { errors.push('mesh-zero'); return; }

   setInstanceTransforms(mesh, 0, [
      1,0,0,0, 0,1,0,0, 0,0,1,0, -2,0,-5,1,
      1,0,0,0, 0,2,0,0, 0,0,1,0,  0,0,-5,1,
      1,0,0,0, 0,1,0,0, 0,0,1,0,  2,0,-5,1,
   ]);

   const mid = getInstanceTransform(mesh, 1);
   if (!Array.isArray(mid) || mid.length !== 16) errors.push('get-transform-bad');
   if (Math.abs(mid[5] - 2) > 0.001 || Math.abs(mid[12]) > 0.001) {
      errors.push('batched-transform-bad');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('681 INSTANCE BATCH', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 16, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 28, rgba8(255, 120, 120, 255));
      return;
   }
   setMeshColor(mesh, rgba8(80, 220, 255, 255));
   draw3d();
   print('ok', 4, 16, rgba8(80, 255, 120, 255));
}
