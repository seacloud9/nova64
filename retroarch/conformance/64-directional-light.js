// Conformance cart 64: setAmbientLight / setLightDirection / setLightColor /
// setDirectionalLight / setShadingStyle. No getters exist for these, so tests verify the
// bindings exist, accept valid args, and return expected values (setDirectionalLight
// returns true). Visual shows a lit scene confirming no crash.

let errors = [];

export function init() {
   if (typeof setAmbientLight !== 'function')
      throw new Error('setAmbientLight() binding missing');
   if (typeof setLightDirection !== 'function')
      throw new Error('setLightDirection() binding missing');
   if (typeof setLightColor !== 'function')
      throw new Error('setLightColor() binding missing');
   if (typeof setDirectionalLight !== 'function')
      throw new Error('setDirectionalLight() binding missing');
   if (typeof setShadingStyle !== 'function')
      throw new Error('setShadingStyle() binding missing');

   // Namespace checks
   if (typeof nova64.light.setShadingStyle !== 'function')
      errors.push('nova64.light.setShadingStyle-missing');
   if (typeof nova64.scene.setAmbientLight !== 'function')
      errors.push('nova64.scene.setAmbientLight-missing');
   if (typeof nova64.scene.setLightDirection !== 'function')
      errors.push('nova64.scene.setLightDirection-missing');
   if (typeof nova64.scene.setLightColor !== 'function')
      errors.push('nova64.scene.setLightColor-missing');
   if (typeof nova64.scene.setDirectionalLight !== 'function')
      errors.push('nova64.scene.setDirectionalLight-missing');

   clearScene();

   // setAmbientLight(color, intensity) — no return value expected
   const r1 = setAmbientLight(rgba8(60, 80, 120, 255), 0.8);
   // no getter; just verify no throw

   // setLightDirection(x, y, z) — no return value
   setLightDirection(-0.4, -0.8, -0.3);

   // setLightColor(color) — no return value
   setLightColor(rgba8(255, 240, 220, 255));

   // setDirectionalLight([dx,dy,dz], color, intensity) — returns true
   const r2 = setDirectionalLight([-0.3, -0.9, -0.2], rgba8(255, 245, 200, 255), 1.2);
   if (r2 !== true)
      errors.push('setDirectionalLight-expected-true: ' + r2);

   // Edge cases: clamp intensity to [0, 8]
   setDirectionalLight([-1, 0, 0], rgba8(200, 200, 200, 255), 0.0);
   setDirectionalLight([0, -1, 0], rgba8(200, 200, 200, 255), 8.0);

   // setAmbientLight intensity clamp [0, 4]
   setAmbientLight(rgba8(80, 80, 80, 255), 0.0);
   setAmbientLight(rgba8(80, 80, 80, 255), 4.0);
   setShadingStyle('classic');
   nova64.light.setShadingStyle('three');

   // Build a visual scene
   setAmbientLight(rgba8(50, 60, 90, 255), 0.6);
   setDirectionalLight([-0.5, -0.8, -0.3], rgba8(255, 240, 200, 255), 1.5);
   for (let i = -2; i <= 2; i++) {
      const c = rgba8(100 + i * 30, 140, 200, 255);
      createCube(c, [i * 1.5, 0, -5]);
   }
   setCameraPosition(0, 2, 5);
   setCameraTarget(0, 0, -5);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('64 DIRECTIONAL LIGHT', 4, 4, rgba8(255, 200, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
