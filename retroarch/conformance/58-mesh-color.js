// Conformance cart 58: setMeshColor and setMeshAlpha.
// Tests that color and alpha set via API round-trip through getMesh().

let errors = [];
let cube = 0;

function approx(a, b, eps) {
   return Math.abs(a - b) <= (eps === undefined ? 0.01 : eps);
}

export function init() {
   if (typeof setMeshColor !== 'function')
      throw new Error('setMeshColor() binding missing');
   if (typeof setMeshAlpha !== 'function')
      throw new Error('setMeshAlpha() binding missing');

   // Namespace checks
   if (typeof nova64.scene.setMeshColor !== 'function')
      errors.push('nova64.scene.setMeshColor-missing');
   if (typeof nova64.scene.setMeshAlpha !== 'function')
      errors.push('nova64.scene.setMeshAlpha-missing');

   clearScene();
   cube = createCube(rgba8(128, 64, 32, 255), [0, 0, 0]);

   // Initial color check
   const info0 = getMesh(cube);
   if (!info0) { errors.push('getMesh-returned-null'); return; }
   if (info0.color !== rgba8(128, 64, 32, 255))
      errors.push('initial-color-mismatch: ' + info0.color + ' vs ' + rgba8(128, 64, 32, 255));

   // Change color
   setMeshColor(cube, rgba8(200, 100, 50, 255));
   const info1 = getMesh(cube);
   if (info1.color !== rgba8(200, 100, 50, 255))
      errors.push('setMeshColor-not-reflected');

   // Set alpha via setMeshAlpha
   setMeshAlpha(cube, 0.5);
   const info2 = getMesh(cube);
   if (!approx(info2.opacity, 0.5))
      errors.push('setMeshAlpha-expected-0.5-got-' + info2.opacity);

   // Clamp below zero
   setMeshAlpha(cube, -0.5);
   const info3 = getMesh(cube);
   if (!approx(info3.opacity, 0.0))
      errors.push('setMeshAlpha-negative-clamp-got-' + info3.opacity);

   // Clamp above one
   setMeshAlpha(cube, 1.5);
   const info4 = getMesh(cube);
   if (!approx(info4.opacity, 1.0))
      errors.push('setMeshAlpha-over-clamp-got-' + info4.opacity);

   // Restore for visual
   setMeshAlpha(cube, 1.0);
   setMeshColor(cube, rgba8(80, 160, 240, 255));

   setCameraPosition(0, 2, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(60, 80, 120, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 20, 255));
   print('58 MESH COLOR', 4, 4, rgba8(80, 160, 240, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
