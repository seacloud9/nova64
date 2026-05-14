// Conformance cart 60: fog API.
// Tests setFog and clearFog — confirms the API exists, doesn't throw, and
// produces a deterministic visual output with fog active.

let errors = [];
let cube = 0;

export function init() {
   if (typeof setFog !== 'function')
      throw new Error('setFog() binding missing');
   if (typeof clearFog !== 'function')
      throw new Error('clearFog() binding missing');

   // Namespace checks
   if (typeof nova64.scene.setFog !== 'function')
      errors.push('nova64.scene.setFog-missing');
   if (typeof nova64.scene.clearFog !== 'function')
      errors.push('nova64.scene.clearFog-missing');

   // setFog should not throw
   try {
      setFog(rgba8(100, 120, 160, 255), 3.0, 15.0);
   } catch (e) {
      errors.push('setFog-threw: ' + e.message);
   }

   // clearFog should not throw
   try {
      clearFog();
   } catch (e) {
      errors.push('clearFog-threw: ' + e.message);
   }

   // Re-enable fog for the visual render
   setFog(rgba8(80, 100, 140, 255), 4.0, 20.0);

   clearScene();
   setCameraPosition(0, 2, 1);
   setCameraTarget(0, 0, -8);
   setAmbientLight(rgba8(80, 100, 140, 255));
   setLightDirection(-0.3, -0.7, -0.5);

   // Row of cubes receding into the fog
   for (let i = 0; i < 6; i++) {
      createCube(rgba8(180, 160, 120, 255), [0, 0, -i * 3]);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(80, 100, 140, 255));
   print('60 FOG', 4, 4, rgba8(220, 230, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
