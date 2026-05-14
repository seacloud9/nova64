// Conformance cart 47: orthographic camera.
// Tests setCameraOrthographic / setCameraPerspective API existence and state.

let errors = [];
let cube = 0;

export function init() {
   if (typeof setCameraOrthographic !== 'function')
      throw new Error('setCameraOrthographic() binding missing');
   if (typeof setCameraPerspective !== 'function')
      throw new Error('setCameraPerspective() binding missing');
   if (typeof nova64.camera.setCameraOrthographic !== 'function')
      errors.push('nova64.camera.setCameraOrthographic-missing');
   if (typeof nova64.camera.setCameraPerspective !== 'function')
      errors.push('nova64.camera.setCameraPerspective-missing');

   // Capability check
   const caps = getBackendCapabilities();
   if (!caps.orthographicCamera)
      errors.push('caps.orthographicCamera-false');

   // Switch to ortho — must not throw
   try {
      setCameraOrthographic(10.0, 5.625);
   } catch (e) {
      errors.push('setCameraOrthographic-threw');
   }

   // Back to perspective — must not throw
   try {
      setCameraPerspective();
   } catch (e) {
      errors.push('setCameraPerspective-threw');
   }

   // Re-enable ortho for the visual render
   setCameraOrthographic(6.0);
   setCameraPosition(0, 0, 5);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(40, 40, 80, 255));
   setLightDirection(-0.4, -0.8, -0.3);

   cube = createCube(rgba8(80, 160, 255, 255), [0, 0, 0]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 18, 255));
   print('47 ORTHO CAM', 4, 4, rgba8(80, 200, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
