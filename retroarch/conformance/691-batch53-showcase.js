// Conformance cart 691: Batch 53 combined showcase.
// setInstanceColor, getInstanceTransform, setInstanceVisible, setInstanceScale,
// setInstanceRotation, removeInstancedMesh, instanceCount,
// createLODMesh, setLODDistance, removeLODMesh, updateLODs, finalizeInstances

let errors = [];
let t = 0;
let mesh;
const COUNT = 12;

export function init() {
   const needed = ['setInstanceColor','getInstanceTransform','setInstanceVisible',
                   'setInstanceScale','setInstanceRotation','removeInstancedMesh',
                   'instanceCount','createLODMesh','setLODDistance',
                   'removeLODMesh','updateLODs','finalizeInstances'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   mesh = createInstancedMesh('sphere', COUNT);
   if (!mesh) { errors.push('instanced-fail'); return; }
   if (instanceCount(mesh) !== COUNT) errors.push('count-fail');

   for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * 3;
      const z = Math.sin(angle) * 3 - 5;
      setInstanceTransform(mesh, i, [1,0,0,0, 0,1,0,0, 0,0,1,0, x,0,z,1]);
      setInstanceColor(mesh, i, hslColor(Math.floor((i / COUNT) * 360), 0.85, 0.55, 255));
      setInstanceScale(mesh, i, 0.4 + (i % 3) * 0.2, 0.4 + (i % 3) * 0.2, 0.4 + (i % 3) * 0.2);
   }
   setInstanceVisible(mesh, 0, false);
   finalizeInstances(mesh);

   const tm = getInstanceTransform(mesh, 1);
   if (!tm || tm.length !== 16) errors.push('transform-bad');
}

export function update(dt) {
   t += dt;
   if (errors.length || !mesh) return;
   for (let i = 0; i < COUNT; i++) {
      setInstanceRotation(mesh, i, t * 0.4 + i * 0.2, t * 0.6, 0);
   }
   updateLODs();
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('691 BATCH 53', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('instanced ring', 4, 24, rgba8(160, 220, 255, 200));
   print('count: ' + COUNT, 4, 34, rgba8(140, 200, 255, 180));
}
