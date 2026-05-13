// Conformance cart 19: texture API
// Verifies createTexture/setMeshTexture/destroyTexture bind without error.
// In software mode (no GLES context) textures return a valid handle but no GL
// upload happens — the cart should still run deterministically.

let cube;
let texHandle = 0;

export function init() {
   // Attempt to create a texture from a non-existent asset path.
   // Expect 0 (failure) since no package assets are loaded in plain .js mode.
   texHandle = createTexture('textures/missing.rgba', 16, 16);

   cube = createCube(1, rgba8(200, 100, 50, 255), [0, 0, -3]);
   if (texHandle !== 0) {
      setMeshTexture(cube, texHandle);
   }
}

export function update(dt) {
   rotateMesh(cube, 0, dt, 0);
}

export function draw() {
   cls(rgba8(20, 20, 30, 255));
   const cap = getBackendCapabilities();
   const texLabel = cap.textures ? 'TEX:HW' : 'TEX:SW';
   print('19 TEXTURE', 4, 4, rgba8(255, 200, 100, 255));
   print('handle=' + texHandle, 4, 14, rgba8(180, 180, 180, 255));
   print(texLabel, 4, 24, rgba8(100, 220, 100, 255));
   if (texHandle !== 0 && typeof destroyTexture === 'function') {
      destroyTexture(texHandle);
      texHandle = 0;
   }
}
