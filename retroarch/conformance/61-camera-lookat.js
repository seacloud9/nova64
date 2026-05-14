// Conformance cart 61: setCameraLookAt.
// Tests that setCameraLookAt(direction) sets camera.target = camera.position + direction.
// Also confirms setCameraPerspective restores after orthographic.

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
   if (typeof setCameraLookAt !== 'function')
      throw new Error('setCameraLookAt() binding missing');

   // Namespace check
   if (typeof nova64.camera.setCameraLookAt !== 'function')
      errors.push('nova64.camera.setCameraLookAt-missing');

   // Place camera at a known position
   setCameraPosition(2, 3, 5);

   // Point it along a known direction
   setCameraLookAt(0, -1, -2);
   const target = getCameraTarget();
   // target should be position + direction = [2+0, 3-1, 5-2] = [2, 2, 3]
   if (!vecApprox(target, 2, 2, 3))
      errors.push('setCameraLookAt-target-wrong: ' + JSON.stringify(target));

   // Switch to ortho then back to perspective
   setCameraOrthographic(8.0);
   setCameraPerspective();

   // After perspective restore, camera position should be unchanged
   const pos2 = getCameraPosition();
   if (!vecApprox(pos2, 2, 3, 5))
      errors.push('camera-pos-changed-after-perspective-restore: ' + JSON.stringify(pos2));

   // Final scene setup
   setCameraPosition(0, 2, 8);
   setCameraLookAt(0, -0.2, -1);
   setCameraFOV(60);
   setAmbientLight(rgba8(50, 60, 100, 255));
   setLightDirection(-0.4, -0.8, -0.3);

   clearScene();
   cube = createCube(rgba8(120, 200, 160, 255), [0, 0, 0]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 18, 255));
   print('61 LOOKAT', 4, 4, rgba8(120, 200, 160, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
