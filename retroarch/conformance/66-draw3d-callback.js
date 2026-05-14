// Conformance cart 66: draw3d explicit callback.
// draw3d() with no args must not throw.
// draw3d(fn) must invoke the callback synchronously.
// Objects created in the callback render in the scene.

let errors = [];
let callbackInvoked = false;

export function init() {
   if (typeof draw3d !== 'function')
      throw new Error('draw3d() binding missing');

   // Namespace check
   if (typeof nova64.scene.draw3d !== 'function')
      errors.push('nova64.scene.draw3d-missing');

   clearScene();
   setCameraPosition(0, 2, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(70, 90, 130, 255), 1.0);

   // Call with no args — must not throw
   draw3d();

   // Call with callback — callback must be invoked synchronously
   draw3d(function () {
      callbackInvoked = true;
      // Objects created inside callback participate in the scene
      createCube(rgba8(200, 200, 60, 255), [-1.5, 0, -3]);
   });

   if (!callbackInvoked)
      errors.push('draw3d-callback-not-invoked');

   // Call with non-function arg — must not throw
   draw3d(null);
   draw3d(42);
   draw3d('noop');

   // Create main scene geometry
   createCube(rgba8(60, 160, 200, 255), [1.5, 0, -3]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('66 DRAW3D CALLBACK', 4, 4, rgba8(200, 200, 60, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
