// Conformance cart 406: screenTilt, drawWireBox, fillWireBox.

let errors = [];

export function init() {
   if (typeof screenTilt   !== 'function') { errors.push('screenTilt-missing');   return; }
   if (typeof drawWireBox  !== 'function') { errors.push('drawWireBox-missing');  return; }
   if (typeof fillWireBox  !== 'function') { errors.push('fillWireBox-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 8, 18, 255));
   print('406 TILT WIREBOX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Wire boxes
   drawWireBox(60, 80, 0, 100, 80, 50, rgba8(80, 180, 255, 255));
   drawWireBox(220, 100, 20, 80, 60, 40, rgba8(255, 160, 60, 220));
   fillWireBox(360, 80, 0, 100, 80, 50, rgba8(100, 220, 100, 220));
   fillWireBox(500, 100, 10, 80, 60, 30, rgba8(255, 100, 200, 200));

   // Tilt effect on left portion
   setClip(20, 40, 310, 280);
   screenTilt(0.08);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
