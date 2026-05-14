// Conformance cart 71: setCamera2D(x, y, zoom, rotation) and getCamera2D().

let errors = [];

export function init() {
   if (typeof setCamera2D !== 'function')
      throw new Error('setCamera2D() binding missing');
   if (typeof getCamera2D !== 'function')
      throw new Error('getCamera2D() binding missing');
   if (typeof clearCamera2D !== 'function')
      throw new Error('clearCamera2D() binding missing');

   if (typeof nova64.draw.getCamera2D !== 'function')
      errors.push('nova64.draw.getCamera2D-missing');

   setCamera2D(12, -8, 1.5, 0.25);
   const cam = getCamera2D();
   if (!cam || cam.x !== 12 || cam.y !== -8)
      errors.push('camera-offset');
   if (Math.abs(cam.zoom - 1.5) > 0.001)
      errors.push('camera-zoom');
   if (Math.abs(cam.rotation - 0.25) > 0.001)
      errors.push('camera-rotation');
   clearCamera2D();
   const reset = getCamera2D();
   if (!reset || reset.x !== 0 || reset.y !== 0 || reset.zoom !== 1 || reset.rotation !== 0)
      errors.push('camera-clear');

   const caps = getBackendCapabilities();
   if (caps.camera2DTransform !== true)
      errors.push('caps.camera2DTransform');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 14, 22, 255));

   setCamera2D(0, 0, 1.25, 0.32);
   rectGradient(180, 80, 180, 60, rgba8(40, 180, 240, 255), rgba8(240, 80, 160, 255), true);
   line(120, 190, 420, 190, rgba8(255, 255, 120, 255), 5);
   trifill(250, 120, 310, 220, 190, 220, rgba8(80, 255, 150, 255));
   oval(310, 150, 100, 40, rgba8(255, 255, 255, 255));
   print('CAMERA', 250, 162, rgba8(30, 30, 40, 255), 'center');
   clearCamera2D();

   print('71 CAMERA2D TRANSFORM', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
