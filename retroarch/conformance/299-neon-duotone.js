// Conformance cart 299: drawNeonLine, screenDuotone, gradientCircle.

let errors = [];

export function init() {
   if (typeof drawNeonLine   !== 'function') { errors.push('drawNeonLine-missing');   return; }
   if (typeof screenDuotone  !== 'function') { errors.push('screenDuotone-missing');  return; }
   if (typeof gradientCircle !== 'function') { errors.push('gradientCircle-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 8, 255));
   print('299 NEON DUOTONE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Gradient circles
   gradientCircle(100, 180, 80, rgba8(200, 40, 100, 255), rgba8(40, 20, 80, 0),   0);
   gradientCircle(260, 180, 70, rgba8(40, 180, 240, 255), rgba8(10, 40, 80, 0),  90);
   gradientCircle(410, 180, 75, rgba8(220, 200, 40, 255), rgba8(80, 60, 10, 0), 135);

   // Neon lines
   drawNeonLine(20,  280, 200, 320, 4, rgba8(100, 220, 255, 255));
   drawNeonLine(200, 280, 380, 320, 4, rgba8(255, 100, 200, 255));
   drawNeonLine(380, 280, 560, 280, 4, rgba8(180, 255, 80,  255));
   drawNeonLine(20,  320, 560, 300, 3, rgba8(255, 200, 80,  220));

   // Grid of neon lines
   for (let i = 0; i < 5; i++) {
      drawNeonLine(500+i*20, 50, 500+i*20, 220, 2, colorFromHSL(i*60, 0.9, 0.6));
   }
   for (let j = 0; j < 4; j++) {
      drawNeonLine(490, 80+j*40, 610, 80+j*40, 2, colorFromHSL(j*80+20, 0.8, 0.6));
   }

   // Duotone on right panel
   setClip(490, 50, 130, 180);
   screenDuotone(rgba8(20, 10, 60, 255), rgba8(100, 220, 255, 255));
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
