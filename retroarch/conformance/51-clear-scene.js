// Conformance cart 51: clearScene API.
// Tests that clearScene() removes all meshes and that getMesh returns null
// for handles obtained before the clear.

let errors = [];
let handles = [];

export function init() {
   if (typeof clearScene !== 'function')
      errors.push('clearScene-missing');
   if (typeof nova64.scene.clearScene !== 'function')
      errors.push('nova64.scene.clearScene-missing');

   // Create three meshes
   const h1 = createCube(rgba8(200, 100, 100, 255), [-2, 0, -5]);
   const h2 = createSphere(rgba8(100, 200, 100, 255), [0, 0, -5]);
   const h3 = createCube(rgba8(100, 100, 200, 255), [2, 0, -5]);
   if (!h1 || !h2 || !h3) { errors.push('create-failed'); return; }
   handles = [h1, h2, h3];

   const before = get3DStats();
   if (before.meshes !== 3) errors.push('pre-clear-meshes:' + before.meshes);

   // Clear everything
   clearScene();

   const after = get3DStats();
   if (after.meshes !== 0) errors.push('post-clear-meshes:' + after.meshes);
   if (after.triangles !== 0) errors.push('post-clear-triangles:' + after.triangles);

   // getMesh on old handles must return null
   for (const h of handles) {
      if (getMesh(h) !== null) errors.push('getMesh-after-clear:' + h);
   }

   // Can create new meshes after clear
   const fresh = createCube(rgba8(220, 200, 180, 255), [0, 0, -5]);
   if (!fresh) errors.push('create-after-clear-failed');

   const after2 = get3DStats();
   if (after2.meshes !== 1) errors.push('meshes-after-recreate:' + after2.meshes);

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(50, 50, 70, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   print('51 CLEARSCENE', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
