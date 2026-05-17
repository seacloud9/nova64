// Conformance cart 783: Batch 62 showcase — cinematic screen effects.
// setLetterbox, clearLetterbox, isLetterboxActive, setOverlayScan,
// clearOverlayScan, setScreenSaturation, setScreenContrast,
// screenTransition, isTransitionActive, getTransitionProgress

let errors = [];
let t = 0;
let spheres = [];
const N = 8;
let phase = 0;
let phaseTimer = 0;

export function init() {
   const needed = ['setLetterbox','clearLetterbox','isLetterboxActive',
                   'setOverlayScan','clearOverlayScan','setScreenSaturation',
                   'getScreenSaturation','setScreenContrast','getScreenContrast',
                   'screenTransition','isTransitionActive','getTransitionProgress'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,4,10],[0,0,0]);
   setLightDirection(0.8,1.5,1);

   for (let i = 0; i < N; i++) {
      const angle = (i/N)*Math.PI*2;
      const m = createSphere(0.45, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle)*3, 0, Math.sin(angle)*3-3);
      spheres.push(m);
   }

   setLetterbox(22);
   setScreenSaturation(0.9);
   setScreenContrast(1.05);
   screenTransition(2, 1.0); // fade from black on load
}

export function update(dt) {
   t += dt;
   if (errors.length) return;

   phaseTimer += dt;
   if (phaseTimer > 4.0) {
      phaseTimer = 0;
      phase = (phase + 1) % 4;
      if (phase === 0) { clearLetterbox(); clearOverlayScan(); setScreenSaturation(1.0); setScreenContrast(1.0); }
      if (phase === 1) { setLetterbox(28); setScreenSaturation(0.4); }
      if (phase === 2) { setOverlayScan(0.5, rgba8(0,0,30,160)); setScreenContrast(1.3); }
      if (phase === 3) { screenTransition(1, 1.5); } // fade to black
   }

   for (let i = 0; i < spheres.length; i++) {
      const angle = (i/N)*Math.PI*2 + t*0.5;
      setPosition(spheres[i], Math.cos(angle)*3, Math.sin(t+i*0.8)*0.5, Math.sin(angle)*3-3);
   }
   setScreenSaturation(0.6 + Math.sin(t*0.6)*0.4);
}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('783 BATCH 62', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('cinematic effects', 4, 24, rgba8(200,200,255,200));
   print('sat: ' + getScreenSaturation().toFixed(2), 4, 34, rgba8(160,200,255,180));
   print('lb: ' + (isLetterboxActive()?'on':'off'), 4, 44, rgba8(160,200,255,180));
   if (isTransitionActive())
      print('trans: ' + (getTransitionProgress()*100).toFixed(0)+'%', 4, 54, rgba8(255,200,100,180));
}
