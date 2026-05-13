// Conformance cart 36: 2D camera transform
// setCamera2D(x, y) offsets all 2D draw calls; clearCamera2D() resets.

let errors = [];

export function init() {
   if (typeof setCamera2D   !== 'function') throw new Error('setCamera2D missing');
   if (typeof clearCamera2D !== 'function') throw new Error('clearCamera2D missing');
}

export function update() {}

export function draw() {
   cls(rgba8(10, 14, 24, 255));

   // Without camera: draw a red rect at (20, 20)
   rect(20, 20, 40, 20, rgba8(200, 60, 60, 255), true);

   // With camera offset (100, 50): rect at world (20,20) → screen (-80,-30) → clipped off
   setCamera2D(100, 50);
   rect(20, 20, 40, 20, rgba8(255, 0, 0, 255), true);  // should be off-screen

   // With camera offset: draw at world (120, 70) → screen (20, 20) → should be green
   rect(120, 70, 40, 20, rgba8(60, 200, 60, 255), true);

   // clearCamera2D restores origin
   clearCamera2D();
   rect(20, 50, 40, 20, rgba8(60, 100, 220, 255), true); // blue at screen (20, 50)

   // Print label at world-space position (after clear, world == screen)
   print('36 CAMERA2D', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length > 0)
      print('FAIL: ' + errors[0], 4, 14, rgba8(255, 60, 60, 255));
   else
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
