// Conformance cart 65: getBackendCapabilities full field validation.
// Verifies all expected capability fields exist with correct types.
// In software mode: hardwareGLES=false, softwareFallback=true,
// textures=false, postProcessing=false. All "always-on" caps are true.

let errors = [];

export function init() {
   if (typeof getBackendCapabilities !== 'function')
      throw new Error('getBackendCapabilities() binding missing');

   const caps = getBackendCapabilities();

   if (typeof caps !== 'object' || caps === null)
      throw new Error('getBackendCapabilities() did not return object');

   // "backend" field must be a string
   if (typeof caps.backend !== 'string')
      errors.push('caps.backend-not-string: ' + typeof caps.backend);
   if (caps.backend.length === 0)
      errors.push('caps.backend-empty-string');

   // Software mode flags
   if (caps.hardwareGLES !== false)
      errors.push('hardwareGLES-expected-false: ' + caps.hardwareGLES);
   if (caps.softwareFallback !== true)
      errors.push('softwareFallback-expected-true: ' + caps.softwareFallback);
   if (caps.textures !== false)
      errors.push('textures-expected-false-in-software: ' + caps.textures);
   if (caps.postProcessing !== false)
      errors.push('postProcessing-expected-false-in-software: ' + caps.postProcessing);
   // The core has a static glTF/GLB loader (geometry + base-color texture).
   if (caps.models !== true)
      errors.push('models-expected-true: ' + caps.models);

   // Always-on capabilities
   const alwaysOn = [
      'primitives', 'meshOpacity', 'meshShadowFlags', 'pointLights',
      'fogState', 'emissive', 'meshAlpha', 'orthographicCamera',
      'skyColor', 'meshRoughness', 'meshMetalness', 'meshUVTransform',
      'meshShadeContrast', 'meshBlend'
   ];
   for (const key of alwaysOn) {
      if (caps[key] !== true)
         errors.push(key + '-expected-true: ' + caps[key]);
   }

   // Namespace check
   if (typeof nova64.scene.getBackendCapabilities !== 'function')
      errors.push('nova64.scene.getBackendCapabilities-missing');

   // Build simple visual
   clearScene();
   createCube(rgba8(120, 80, 200, 255), [0, 0, -4]);
   setCameraPosition(0, 2, 5);
   setCameraTarget(0, 0, -4);
   setAmbientLight(rgba8(80, 60, 100, 255), 1.2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 8, 20, 255));
   print('65 BACKEND CAPS', 4, 4, rgba8(120, 80, 200, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
