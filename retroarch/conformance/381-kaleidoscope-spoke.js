// Conformance cart 381: drawKaleidoscope, drawSpokePie, fillSpokePie, drawCounterDial.

let errors = [];

export function init() {
   if (typeof drawKaleidoscope !== 'function') { errors.push('drawKaleidoscope-missing'); return; }
   if (typeof drawSpokePie     !== 'function') { errors.push('drawSpokePie-missing');     return; }
   if (typeof fillSpokePie     !== 'function') { errors.push('fillSpokePie-missing');     return; }
   if (typeof drawCounterDial  !== 'function') { errors.push('drawCounterDial-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('381 KALEID SPOKE DIAL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Kaleidoscopes
   drawKaleidoscope(120, 190, 80, 6,  rgba8(100, 200, 255, 255));
   drawKaleidoscope(280, 190, 70, 8,  rgba8(255, 160, 60, 255));
   drawKaleidoscope(430, 190, 75, 12, rgba8(180, 255, 80, 255));

   // Spoke pies
   fillSpokePie(120, 320, 45, 6, rgba8(100, 180, 255, 200), rgba8(20, 40, 80, 255));
   drawSpokePie(120, 320, 45, 6, rgba8(160, 220, 255, 200));
   fillSpokePie(240, 320, 40, 8, rgba8(255, 140, 60, 200), rgba8(60, 30, 10, 255));
   drawSpokePie(240, 320, 40, 8, rgba8(255, 200, 100, 200));

   // Counter dials
   drawCounterDial(380, 320, 40, 30,  100, rgba8(100, 200, 255, 255));
   drawCounterDial(470, 320, 40, 65,  100, rgba8(255, 160, 60, 255));
   drawCounterDial(560, 320, 40, 90,  100, rgba8(180, 255, 80, 255));
   drawCounterDial(560, 190, 55, 100, 100, rgba8(255, 80, 80, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
