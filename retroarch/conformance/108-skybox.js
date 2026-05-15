// Conformance cart 108: equirectangular skybox.
// setSkybox(texHandle) sets an equirectangular panoramic texture as the
// background. clearSkybox() reverts to gradient. caps.skybox is true on GLES.
//
// Package provides sky/panorama.rgba (64x32 RGBA gradient panorama).

let errors = [];
let cube = 0;
let skyTex = 0;
let caps;

export function init() {
   caps = getBackendCapabilities();

   if (typeof setSkybox !== 'function')   errors.push('setSkybox-missing');
   if (typeof clearSkybox !== 'function') errors.push('clearSkybox-missing');
   if (!caps || typeof caps.skybox !== 'boolean') errors.push('caps-skybox-missing');
   if (errors.length > 0) return;

   cube = createCube();
   setPosition(cube, 0, 0, -3);
   setMeshColor(cube, rgba8(255, 200, 80, 255));

   // Load the bundled panorama texture
   skyTex = createTexture('sky/panorama.rgba', 64, 32);
   if (caps.skybox && skyTex) {
      setSkybox(skyTex);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('108 SKYBOX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   draw3d();

   // clearSkybox should not crash
   clearSkybox();
   // re-set to verify idempotent
   if (caps.skybox && skyTex) setSkybox(skyTex);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
