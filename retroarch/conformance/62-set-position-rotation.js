// Conformance cart 62: setPosition and setRotation absolute setters.
// Verifies that setPosition overwrites position (absolute) while
// moveMesh accumulates (delta), and likewise setRotation vs rotateMesh.

let errors = [];
let cube = 0;

function approx(a, b) {
   return Math.abs(a - b) <= 0.02;
}

function vecApprox(arr, x, y, z) {
   if (!Array.isArray(arr) || arr.length < 3) return false;
   return approx(arr[0], x) && approx(arr[1], y) && approx(arr[2], z);
}

export function init() {
   if (typeof setPosition !== 'function')
      throw new Error('setPosition() binding missing');
   if (typeof setRotation !== 'function')
      throw new Error('setRotation() binding missing');

   // Namespace checks
   if (typeof nova64.scene.setPosition !== 'function')
      errors.push('nova64.scene.setPosition-missing');
   if (typeof nova64.scene.setRotation !== 'function')
      errors.push('nova64.scene.setRotation-missing');

   clearScene();
   cube = createCube(rgba8(180, 100, 60, 255), [0, 0, 0]);

   // --- setPosition absolute ---
   setPosition(cube, 3.0, 1.5, -6.0);
   const p1 = getPosition(cube);
   if (!vecApprox(p1, 3.0, 1.5, -6.0))
      errors.push('setPosition-xyz: ' + JSON.stringify(p1));

   // Calling again should overwrite, not accumulate
   setPosition(cube, -2.0, 0.5, -4.0);
   const p2 = getPosition(cube);
   if (!vecApprox(p2, -2.0, 0.5, -4.0))
      errors.push('setPosition-overwrite: ' + JSON.stringify(p2));

   // moveMesh adds delta on top of absolute position
   moveMesh(cube, 1.0, 0.0, 0.0);
   const p3 = getPosition(cube);
   if (!vecApprox(p3, -1.0, 0.5, -4.0))
      errors.push('moveMesh-after-setPosition: ' + JSON.stringify(p3));

   // --- setRotation absolute ---
   setRotation(cube, 0.5, 1.0, 0.25);
   const r1 = getRotation(cube);
   if (!vecApprox(r1, 0.5, 1.0, 0.25))
      errors.push('setRotation-xyz: ' + JSON.stringify(r1));

   // Overwrite rotation
   setRotation(cube, 0.0, 0.3, 0.0);
   const r2 = getRotation(cube);
   if (!vecApprox(r2, 0.0, 0.3, 0.0))
      errors.push('setRotation-overwrite: ' + JSON.stringify(r2));

   // rotateMesh adds delta on top
   rotateMesh(cube, 0.0, 0.7, 0.0);
   const r3 = getRotation(cube);
   if (!vecApprox(r3, 0.0, 1.0, 0.0))
      errors.push('rotateMesh-after-setRotation: ' + JSON.stringify(r3));

   // Reset for visual
   setPosition(cube, 0, 0, -4);
   setRotation(cube, 0.2, 0.4, 0);
   setCameraPosition(0, 2, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(80, 100, 140, 255), 1.0);
   setLightDirection(-0.5, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('62 SET POSITION ROTATION', 4, 4, rgba8(180, 100, 60, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
