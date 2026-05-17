// Conformance cart 681: createLODMesh, setLODDistance, removeLODMesh,
// updateLODs, finalizeInstances (all stubs — just verify they exist and don't crash)

let errors = [];

export function init() {
   const needed = ['createLODMesh','setLODDistance','removeLODMesh',
                   'updateLODs','finalizeInstances'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const base = createCube(1, rgba8(180, 200, 240, 255));
   setPosition(base, 0, 0, -4);

   const lod = createLODMesh(base);
   // stub returns 0
   setLODDistance(lod, 0, 10.0);
   setLODDistance(lod, 1, 30.0);
   updateLODs();
   removeLODMesh(lod);

   const inst = createInstancedMesh('sphere', 3);
   setInstanceTransform(inst, 0, [1,0,0,0, 0,1,0,0, 0,0,1,0, -2,0,-4,1]);
   setInstanceTransform(inst, 1, [1,0,0,0, 0,1,0,0, 0,0,1,0,  0,0,-4,1]);
   setInstanceTransform(inst, 2, [1,0,0,0, 0,1,0,0, 0,0,1,0,  2,0,-4,1]);
   finalizeInstances(inst);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('681 LOD STUBS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('LOD stubs no-crash', 4, 24, rgba8(160, 220, 255, 200));
   }
}
