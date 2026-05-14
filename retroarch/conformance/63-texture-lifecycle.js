// Conformance cart 63: createTexture / setMeshTexture / destroyTexture lifecycle.
// In software mode the harness has no bundled assets, so createTexture("x.png")
// returns handle 0. Tests verify graceful failure without crash and that
// setMeshTexture / destroyTexture handle invalid inputs safely.

let errors = [];
let mesh = 0;

export function init() {
   if (typeof createTexture !== 'function')
      throw new Error('createTexture() binding missing');
   if (typeof setMeshTexture !== 'function')
      throw new Error('setMeshTexture() binding missing');
   if (typeof destroyTexture !== 'function')
      throw new Error('destroyTexture() binding missing');

   // Namespace checks
   if (typeof nova64.scene.createTexture !== 'function')
      errors.push('nova64.scene.createTexture-missing');
   if (typeof nova64.scene.setMeshTexture !== 'function')
      errors.push('nova64.scene.setMeshTexture-missing');
   if (typeof nova64.scene.destroyTexture !== 'function')
      errors.push('nova64.scene.destroyTexture-missing');

   clearScene();
   mesh = createCube(rgba8(100, 180, 100, 255), [0, 0, -4]);

   // createTexture with nonexistent asset => handle 0 (graceful failure)
   const tex = createTexture('nonexistent.png');
   if (typeof tex !== 'number')
      errors.push('createTexture-not-number: ' + typeof tex);
   if (tex !== 0)
      errors.push('createTexture-nonexistent-expected-0: ' + tex);

   // setMeshTexture with handle 0 => false
   const r1 = setMeshTexture(mesh, 0);
   if (r1 !== false)
      errors.push('setMeshTexture-handle0-expected-false: ' + r1);

   // setMeshTexture with invalid mesh => false
   const r2 = setMeshTexture(9999, 0);
   if (r2 !== false)
      errors.push('setMeshTexture-badmesh-expected-false: ' + r2);

   // destroyTexture with handle 0 => false (no crash)
   const r3 = destroyTexture(0);
   if (r3 !== false)
      errors.push('destroyTexture-handle0-expected-false: ' + r3);

   // destroyTexture with out-of-range handle => false (no crash)
   const r4 = destroyTexture(9999);
   if (r4 !== false)
      errors.push('destroyTexture-outofrange-expected-false: ' + r4);

   // Verify getBackendCapabilities reports textures=false in software mode
   const caps = getBackendCapabilities();
   if (caps.textures !== false)
      errors.push('caps.textures-should-be-false-in-software: ' + caps.textures);

   setCameraPosition(0, 2, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(80, 100, 140, 255), 1.0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 15, 10, 255));
   print('63 TEXTURE LIFECYCLE', 4, 4, rgba8(100, 180, 100, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
