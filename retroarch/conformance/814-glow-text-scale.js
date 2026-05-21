// Conformance cart 814: drawGlowText scale argument.

let errors = [];

export function init() {
   if (typeof drawGlowText !== 'function') {
      errors.push('drawGlowText-missing');
      return;
   }
   if (typeof drawGlowTextCentered !== 'function') {
      errors.push('drawGlowTextCentered-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('814 GLOW TEXT SCALE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   rect(40, 46, 560, 128, rgba8(55, 70, 110, 255), false);
   line(320, 42, 320, 188, rgba8(70, 90, 150, 255));
   drawGlowText('SCALE 1', 58, 64,
      rgba8(220, 240, 255, 255), rgba8(0, 90, 255, 120), 1);
   drawGlowText('SCALE 2', 58, 92,
      rgba8(255, 230, 90, 255), rgba8(255, 80, 0, 130), 2);
   drawGlowTextCentered('CENTERED X2', 320, 132,
      rgba8(80, 255, 210, 255), rgba8(0, 120, 255, 130), 2);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
