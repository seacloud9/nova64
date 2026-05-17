// Conformance cart 743: Batch 62 — cinematic screen effects.
// setLetterbox, clearLetterbox, isLetterboxActive, setOverlayScan,
// clearOverlayScan, setScreenSaturation, getScreenSaturation,
// setScreenContrast, getScreenContrast, screenTransition,
// isTransitionActive, getTransitionProgress

let errors = [];
let t = 0;
let spheres = [];

export function init() {
   const needed = ['setLetterbox','clearLetterbox','isLetterboxActive',
                   'setOverlayScan','clearOverlayScan','setScreenSaturation',
                   'getScreenSaturation','setScreenContrast','getScreenContrast',
                   'screenTransition','isTransitionActive','getTransitionProgress'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,3,10],[0,0,0]);
   setLightDirection(1,2,1);

   for (let i = 0; i < 5; i++) {
      const m = createSphere(0.5, hslColor(i*72, 0.8, 0.6, 255));
      setPosition(m, (i-2)*1.5, 0, -3);
      spheres.push(m);
   }

   // letterbox
   setLetterbox(28, rgba8(0,0,0,255));
   if (!isLetterboxActive()) errors.push('lb-active');
   clearLetterbox();
   if (isLetterboxActive()) errors.push('lb-clear');
   setLetterbox(24); // re-enable for visual

   // saturation
   setScreenSaturation(0.85);
   if (Math.abs(getScreenSaturation()-0.85)>0.05) errors.push('sat:'+getScreenSaturation());

   // contrast
   setScreenContrast(1.1);
   if (Math.abs(getScreenContrast()-1.1)>0.05) errors.push('con:'+getScreenContrast());

   // overlay scan
   setOverlayScan(0.3, rgba8(0,0,0,120));

   // transition
   screenTransition(2, 1.5); // fade from black
   if (!isTransitionActive()) errors.push('trans-active');
   const prog = getTransitionProgress();
   if (typeof prog !== 'number') errors.push('prog-type');
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < spheres.length; i++) {
      setPosition(spheres[i], (i-2)*1.5, Math.sin(t*1.5+i)*0.4, -3);
   }
   // Pulse saturation
   setScreenSaturation(0.7 + Math.sin(t*0.8)*0.3);
}

export function draw() {
   cls(rgba8(10,8,20,255));
   printBold('743 BATCH 62', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('cinematic fx', 4, 24, rgba8(200,200,255,200));
   print('sat: ' + getScreenSaturation().toFixed(2), 4, 34, rgba8(160,200,255,180));
   print('con: ' + getScreenContrast().toFixed(2),  4, 44, rgba8(160,200,255,180));
   print('trans: ' + getTransitionProgress().toFixed(2), 4, 54, rgba8(160,200,255,160));
}
