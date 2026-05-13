// Conformance cart 22: emissive color and alpha/blend
// Verifies setMeshEmissive and setMeshAlpha apply without error and affect
// the software render output deterministically.

let cube;
let sphere;
let plane;
let ghostCube;

export function init() {
   setAmbientLight(rgba8(20, 20, 30, 255), 0.8);
   setLightDirection(-0.6, -1, -0.5);

   // Bright emissive cube — should look like it glows
   cube = createCube(1, rgba8(30, 30, 30, 255), [-1.5, 0.5, -3]);
   setMeshEmissive(cube, rgba8(255, 120, 40, 255), 1.2);

   // Normal sphere as reference
   sphere = createSphere(0.6, rgba8(80, 160, 255, 255), [0, 0, -3]);

   // Semi-transparent cube sitting in front of the plane
   ghostCube = createCube(0.8, rgba8(200, 220, 255, 255), [1.5, 0.3, -2.5]);
   setMeshAlpha(ghostCube, 0.45);

   // Ground plane
   plane = createPlane(4, 3, rgba8(60, 80, 60, 255));
   setPosition(plane, 0, -1, -3);

   // Verify emissive state via getMesh
   if (typeof getMesh === 'function') {
      const m = getMesh(cube);
      if (Math.abs(m.emissiveIntensity - 1.2) > 0.05)
         throw new Error('emissiveIntensity mismatch: ' + m.emissiveIntensity);
   }

   // Verify opacity
   if (typeof getMesh === 'function') {
      const g = getMesh(ghostCube);
      if (Math.abs(g.opacity - 0.45) > 0.01)
         throw new Error('opacity mismatch: ' + g.opacity);
   }
}

export function update(dt) {
   rotateMesh(cube, 0, dt * 0.6, 0);
   rotateMesh(sphere, dt * 0.4, 0, 0);
}

export function draw() {
   cls(rgba8(12, 14, 22, 255));
   const cap = getBackendCapabilities();
   print('22 MATERIAL', 4, 4, rgba8(255, 220, 80, 255));
   print('emissive=' + cap.emissive, 4, 14, rgba8(255, 160, 80, 255));
   print('alpha=' + cap.meshAlpha, 4, 24, rgba8(160, 220, 255, 255));
   print('hw=' + cap.hardwareGLES, 4, 34, rgba8(180, 180, 180, 255));
}
