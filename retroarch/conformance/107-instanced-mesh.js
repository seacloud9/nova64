// Conformance cart 107: instanced mesh rendering.
// createInstancedMesh(geometry, count) -> handle
// setInstanceTransform(mesh, i, mat16) sets per-instance model matrix
// getInstanceCount(mesh) -> int
// draw3d() renders all instances

let errors = [];
let mesh = 0;
const COUNT = 8;

export function init() {
   if (typeof createInstancedMesh !== 'function') errors.push('createInstancedMesh-missing');
   if (typeof setInstanceTransform !== 'function') errors.push('setInstanceTransform-missing');
   if (typeof getInstanceCount !== 'function')     errors.push('getInstanceCount-missing');
   if (errors.length > 0) return;

   mesh = createInstancedMesh('cube', COUNT);
   if (!mesh) { errors.push('createInstancedMesh-returned-0'); return; }

   if (getInstanceCount(mesh) !== COUNT) {
      errors.push('getInstanceCount-wrong: ' + getInstanceCount(mesh));
      return;
   }

   // Place 8 cubes in a ring around Z=-5
   for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * 2.5;
      const y = Math.sin(angle) * 2.5;
      // Identity matrix with translation in column 3
      const mat = [
         1, 0, 0, 0,
         0, 1, 0, 0,
         0, 0, 1, 0,
         x, y, -5, 1
      ];
      setInstanceTransform(mesh, i, mat);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 15, 25, 255));
   print('107 INSTANCED', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   setMeshColor(mesh, rgba8(80, 180, 255, 255));
   draw3d();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
