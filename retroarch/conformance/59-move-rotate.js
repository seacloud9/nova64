// Conformance cart 59: moveMesh and rotateMesh accumulation.
// Tests that moveMesh adds deltas to position and rotateMesh adds deltas
// to rotation. Also verifies getPosition() and getRotation() getters.

let errors = [];
let cube = 0;

function approx(a, b, eps) {
   return Math.abs(a - b) <= (eps === undefined ? 0.02 : eps);
}

function vecApprox(arr, x, y, z) {
   if (!Array.isArray(arr) || arr.length < 3) return false;
   return approx(arr[0], x) && approx(arr[1], y) && approx(arr[2], z);
}

export function init() {
   if (typeof moveMesh !== 'function')
      throw new Error('moveMesh() binding missing');
   if (typeof rotateMesh !== 'function')
      throw new Error('rotateMesh() binding missing');
   if (typeof getPosition !== 'function')
      throw new Error('getPosition() binding missing');
   if (typeof getRotation !== 'function')
      throw new Error('getRotation() binding missing');
   if (typeof setScale !== 'function')
      throw new Error('setScale() binding missing');

   // Namespace checks
   if (typeof nova64.scene.moveMesh !== 'function')
      errors.push('nova64.scene.moveMesh-missing');
   if (typeof nova64.scene.rotateMesh !== 'function')
      errors.push('nova64.scene.rotateMesh-missing');
   if (typeof nova64.scene.getPosition !== 'function')
      errors.push('nova64.scene.getPosition-missing');
   if (typeof nova64.scene.getRotation !== 'function')
      errors.push('nova64.scene.getRotation-missing');

   clearScene();

   // createCube places at [1, 0, 0]
   cube = createCube(rgba8(200, 160, 80, 255), [1, 0, 0]);

   // --- Position accumulation ---
   const p0 = getPosition(cube);
   if (!vecApprox(p0, 1, 0, 0))
      errors.push('initial-pos-wrong: ' + JSON.stringify(p0));

   moveMesh(cube, 2, 0, 0);
   const p1 = getPosition(cube);
   if (!vecApprox(p1, 3, 0, 0))
      errors.push('after-moveMesh(2,0,0)-expected-3: ' + JSON.stringify(p1));

   moveMesh(cube, 0, 1, -1);
   const p2 = getPosition(cube);
   if (!vecApprox(p2, 3, 1, -1))
      errors.push('after-moveMesh(0,1,-1)-wrong: ' + JSON.stringify(p2));

   // --- Rotation accumulation ---
   const r0 = getRotation(cube);
   if (!vecApprox(r0, 0, 0, 0))
      errors.push('initial-rot-wrong: ' + JSON.stringify(r0));

   rotateMesh(cube, 0.5, 0, 0);
   const r1 = getRotation(cube);
   if (!vecApprox(r1, 0.5, 0, 0))
      errors.push('after-rotateMesh(0.5,0,0): ' + JSON.stringify(r1));

   rotateMesh(cube, 0, 1.0, 0);
   const r2 = getRotation(cube);
   if (!vecApprox(r2, 0.5, 1.0, 0))
      errors.push('after-rotateMesh(0,1,0): ' + JSON.stringify(r2));

   // --- setScale ---
   setScale(cube, 2, 2, 2);
   const info = getMesh(cube);
   if (!info) { errors.push('getMesh-null'); return; }
   if (!vecApprox(info.scale, 2, 2, 2))
      errors.push('setScale-not-reflected: ' + JSON.stringify(info.scale));

   // Reset for visual
   setScale(cube, 1, 1, 1);
   moveMesh(cube, -3, -1, 1); // back near origin
   setCameraPosition(0, 3, 8);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(60, 80, 120, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 15, 255));
   print('59 MOVE ROTATE', 4, 4, rgba8(200, 160, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
