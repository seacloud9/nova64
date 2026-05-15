// Conformance cart 104: normal map API.
// Verifies setMeshNormalMap binding, normalMaps capability flag,
// and that the API round-trips correctly on mesh state.

let errors = [];
let sphere = 0;
let nmHandle = 0;

export function init() {
   if (typeof setMeshNormalMap !== 'function')
      errors.push('setMeshNormalMap-missing');
   if (typeof nova64.scene.setMeshNormalMap !== 'function')
      errors.push('nova64.scene.setMeshNormalMap-missing');

   const caps = getBackendCapabilities();
   if (typeof caps.normalMaps !== 'boolean')
      errors.push('caps.normalMaps-not-boolean: ' + typeof caps.normalMaps);

   // createTexture returns 0 in plain .js mode (no package asset);
   // that is the expected behavior — no error.
   nmHandle = createTexture('normals/missing.rgba', 16, 16);

   sphere = createSphere(rgba8(200, 160, 80, 255), [0, 0, -4]);
   if (!sphere) { errors.push('createSphere-falsy'); return; }

   // Assign and verify (setMeshNormalMap should return true for valid mesh even
   // when handle is 0 — the function only fails on invalid mesh handles).
   const ok = setMeshNormalMap(sphere, nmHandle);
   if (ok !== true)
      errors.push('setMeshNormalMap-returned-false');

   // Clearing normal map with 0 should also succeed
   const ok2 = setMeshNormalMap(sphere, 0);
   if (ok2 !== true)
      errors.push('setMeshNormalMap-clear-returned-false');

   // Invalid mesh handle should return false
   const bad = setMeshNormalMap(9999, 0);
   if (bad !== false)
      errors.push('setMeshNormalMap-invalid-mesh-not-false');

   // Re-apply for visual
   setMeshNormalMap(sphere, nmHandle);

   setCameraPosition(0, 1, 5);
   setCameraTarget(0, 0, -4);
   setAmbientLight(rgba8(60, 60, 80, 255), 0.8);
   setLightDirection(-0.5, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(20, 20, 30, 255));
   print('104 NORMAL MAP', 4, 4, rgba8(200, 160, 80, 255));
   const nmLabel = getBackendCapabilities().normalMaps ? 'normalMaps:true' : 'normalMaps:false';
   print(nmLabel, 4, 14, rgba8(160, 200, 160, 255));
   if (errors.length === 0) {
      print('ok', 4, 24, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 24, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 34, rgba8(255, 120, 120, 255));
   }
}
