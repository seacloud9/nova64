// Conformance cart 680: setInstanceColor, getInstanceTransform, setInstanceVisible,
// setInstanceScale, setInstanceRotation, removeInstancedMesh, instanceCount

let errors = [];

export function init() {
   const needed = ['setInstanceColor','getInstanceTransform','setInstanceVisible',
                   'setInstanceScale','setInstanceRotation','removeInstancedMesh','instanceCount'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const mesh = createInstancedMesh('cube', 4);
   if (!mesh) { errors.push('instanced-zero'); return; }

   if (instanceCount(mesh) !== 4) errors.push('count-bad:' + instanceCount(mesh));

   setInstanceTransform(mesh, 0, [1,0,0,0, 0,1,0,0, 0,0,1,0, -3,0,-5,1]);
   setInstanceTransform(mesh, 1, [1,0,0,0, 0,1,0,0, 0,0,1,0, -1,0,-5,1]);
   setInstanceTransform(mesh, 2, [1,0,0,0, 0,1,0,0, 0,0,1,0,  1,0,-5,1]);
   setInstanceTransform(mesh, 3, [1,0,0,0, 0,1,0,0, 0,0,1,0,  3,0,-5,1]);

   setInstanceColor(mesh, 0, rgba8(255, 80, 80, 255));
   setInstanceColor(mesh, 1, rgba8(80, 255, 80, 255));
   setInstanceColor(mesh, 2, rgba8(80, 80, 255, 255));
   setInstanceColor(mesh, 3, rgba8(255, 255, 80, 255));

   setInstanceVisible(mesh, 2, false);

   setInstanceScale(mesh, 0, 0.5, 0.5, 0.5);
   setInstanceRotation(mesh, 1, 0.3, 0.6, 0.0);

   const tm = getInstanceTransform(mesh, 0);
   if (!Array.isArray(tm) || tm.length !== 16) errors.push('get-transform-bad');

   // destroy and confirm
   removeInstancedMesh(mesh);
   const cnt2 = instanceCount(mesh);
   if (cnt2 !== 0) errors.push('after-remove-count:' + cnt2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('680 INSTANCED EXT', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('instance color/vis/scale', 4, 24, rgba8(160, 220, 255, 200));
   }
}
