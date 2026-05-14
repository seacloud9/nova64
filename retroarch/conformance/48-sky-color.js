// Conformance cart 48: sky/background color API.
// Tests setSkyColor / clearSkyColor existence and visual output.

let errors = [];

export function init() {
   if (typeof setSkyColor !== 'function')
      throw new Error('setSkyColor() binding missing');
   if (typeof clearSkyColor !== 'function')
      throw new Error('clearSkyColor() binding missing');
   if (typeof nova64.scene.setSkyColor !== 'function')
      errors.push('nova64.scene.setSkyColor-missing');
   if (typeof nova64.scene.clearSkyColor !== 'function')
      errors.push('nova64.scene.clearSkyColor-missing');

   const caps = getBackendCapabilities();
   if (!caps.skyColor)
      errors.push('caps.skyColor-false');

   // setSkyColor with one arg (top only) should not throw
   try {
      setSkyColor(rgba8(20, 80, 160, 255));
   } catch (e) {
      errors.push('setSkyColor-1-threw');
   }

   // setSkyColor with two args should not throw
   try {
      setSkyColor(rgba8(20, 80, 160, 255), rgba8(5, 15, 40, 255));
   } catch (e) {
      errors.push('setSkyColor-2-threw');
   }

   // clearSkyColor should not throw
   try {
      clearSkyColor();
   } catch (e) {
      errors.push('clearSkyColor-threw');
   }

   // Re-enable sky for visual output
   setSkyColor(rgba8(15, 60, 130, 255), rgba8(4, 10, 30, 255));

   setCameraPosition(0, 1, 5);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(30, 60, 120, 255));
   setLightDirection(-0.5, -0.7, -0.3);
   createCube(rgba8(200, 200, 80, 255), [0, 0, 0]);
}

export function update(dt) {}

export function draw() {
   // No cls() — sky color should be visible as GLES clear
   cls(rgba8(0, 0, 0, 0)); // transparent — let GLES background show
   print('48 SKY COLOR', 4, 4, rgba8(220, 240, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
