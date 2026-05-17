// Conformance cart 693: createCustomMaterial, destroyMaterial, setMeshMaterial

let errors = [];

export function init() {
   const needed = ['createCustomMaterial','destroyMaterial','setMeshMaterial'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const mat = createCustomMaterial({ roughness: 0.3, metalness: 0.8 });
   if (mat !== 0) errors.push('mat-nonzero:' + mat);

   const m = createSphere(0.8, rgba8(200, 180, 255, 255));
   setPosition(m, 0, 0, -4);
   setMeshMaterial(m, mat);

   destroyMaterial(mat);
   destroyMaterial(99);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('693 MATERIAL', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('material stubs ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
