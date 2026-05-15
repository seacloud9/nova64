// Conformance cart 115: Camera shake.
// addCameraShake(intensity, duration); stopCameraShake().
// Visual confirms rendering runs without crash; shake APIs exist.

let errors = [];
let cube = 0;
let elapsed = 0;
let shakeApplied = false;

export function init() {
   if (typeof addCameraShake !== 'function')  { errors.push('addCameraShake-missing'); return; }
   if (typeof stopCameraShake !== 'function') { errors.push('stopCameraShake-missing'); return; }

   cube = createCube(rgba8(200, 100, 60, 255));
   setCameraOrbit(0, 0, 0, 6, 30, 20);
}

export function update(dt) {
   if (errors.length > 0) return;
   elapsed += dt;

   // At 0.2s trigger a brief shake
   if (!shakeApplied && elapsed >= 0.2) {
      addCameraShake(0.15, 0.4);
      shakeApplied = true;
   }

   // At 1.0s stop shake early — should not crash
   if (shakeApplied && elapsed >= 1.0) {
      stopCameraShake();
   }
}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('115 CAMERA SHAKE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   draw3d(rgba8(10, 12, 20, 255));
   const phase = elapsed < 1.0 ? 'shaking' : 'stopped';
   print(phase, 4, 14, rgba8(80, 255, 120, 255));
   print('ok', 200, 14, rgba8(80, 255, 120, 255));
}
