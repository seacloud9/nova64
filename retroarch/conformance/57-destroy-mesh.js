// Conformance cart 57: destroyMesh / removeMesh.
// Tests that destroyed mesh handles are invalidated: getMesh returns null,
// get3DStats reflects reduced count, and removeMesh is an alias for destroyMesh.

let errors = [];
let alive = 0;

export function init() {
   if (typeof destroyMesh !== 'function')
      throw new Error('destroyMesh() binding missing');
   if (typeof removeMesh !== 'function')
      throw new Error('removeMesh() binding missing');

   // Namespace checks
   if (typeof nova64.scene.destroyMesh !== 'function')
      errors.push('nova64.scene.destroyMesh-missing');
   if (typeof nova64.scene.removeMesh !== 'function')
      errors.push('nova64.scene.removeMesh-missing');

   clearScene();

   const a = createCube(rgba8(200, 80, 80, 255), [0, 0, 0]);
   const b = createCube(rgba8(80, 200, 80, 255), [2, 0, 0]);
   const c = createSphere(1.0, rgba8(80, 80, 200, 255), [4, 0, 0]);

   const before = get3DStats().meshes;
   if (before !== 3) errors.push('before-destroy-expected-3-got-' + before);

   // Destroy by destroyMesh
   destroyMesh(a);
   const afterA = get3DStats().meshes;
   if (afterA !== 2) errors.push('after-destroyMesh-expected-2-got-' + afterA);

   // getMesh on destroyed handle returns null
   const ghostInfo = getMesh(a);
   if (ghostInfo !== null) errors.push('getMesh-after-destroy-not-null');

   // Destroy by alias removeMesh
   removeMesh(b);
   const afterB = get3DStats().meshes;
   if (afterB !== 1) errors.push('after-removeMesh-expected-1-got-' + afterB);

   // Surviving mesh still queryable
   const cInfo = getMesh(c);
   if (!cInfo) errors.push('surviving-mesh-getMesh-returned-null');

   alive = c;

   // Setup visual
   setCameraPosition(0, 2, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(60, 80, 120, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 15, 255));
   print('57 DESTROY MESH', 4, 4, rgba8(255, 160, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
