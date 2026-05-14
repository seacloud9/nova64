// Conformance cart 103: directional shadow maps.
// Verifies setShadowQuality API, shadowMaps capability flag,
// and that a lit scene with cast/receive shadow flags renders correctly.

let errors = [];
let sphere = 0;
let plane = 0;

export function init() {
   // API presence checks
   if (typeof setShadowQuality !== 'function')
      errors.push('setShadowQuality-missing');
   if (typeof nova64.scene.setShadowQuality !== 'function')
      errors.push('nova64.scene.setShadowQuality-missing');

   const caps = getBackendCapabilities();
   if (typeof caps.shadowMaps !== 'boolean')
      errors.push('caps.shadowMaps-not-boolean: ' + typeof caps.shadowMaps);

   // setShadowQuality accepts string levels
   if (errors.length === 0) {
      try {
         setShadowQuality('high');
         setShadowQuality('medium');
         setShadowQuality('low');
         setShadowQuality('off');
         setShadowQuality('medium');  // restore
      } catch (e) {
         errors.push('setShadowQuality-threw: ' + e.message);
      }
   }

   // Build scene: sphere above a flat plane
   sphere = createSphere(rgba8(220, 80, 60, 255), [0, 1.2, -3]);
   plane  = createCube(rgba8(160, 160, 140, 255), [0, -0.55, -3]);
   if (!sphere) { errors.push('createSphere-falsy'); return; }
   if (!plane)  { errors.push('createCube-falsy');   return; }

   setScale(plane, 6, 0.1, 6);

   setCastShadow(sphere, true);
   setReceiveShadow(plane, true);

   // Verify round-trips
   const sm = getMesh(sphere);
   const pm = getMesh(plane);
   if (!sm || sm.castShadow !== true)
      errors.push('sphere.castShadow-not-true: ' + (sm && sm.castShadow));
   if (!pm || pm.receiveShadow !== true)
      errors.push('plane.receiveShadow-not-true: ' + (pm && pm.receiveShadow));

   setCameraPosition(0, 3, 4);
   setCameraTarget(0, 0, -3);
   setAmbientLight(rgba8(60, 60, 80, 255), 0.8);
   setLightDirection(-0.4, -0.9, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(20, 20, 30, 255));
   print('103 SHADOW MAP', 4, 4, rgba8(220, 180, 100, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
