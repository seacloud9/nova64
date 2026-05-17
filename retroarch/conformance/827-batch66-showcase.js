// Conformance cart 827: Batch 66 showcase — camera helpers.

let t = 0;
let phase = 0;
let phaseTimer = 0;
let orbs = [];
let infoText = '';
const N = 8;
const PHASES = ['dolly','truck','pedestal','pan','tilt','zoom','roll','reset'];

export function init() {
   setCamera([0, 3, 10], [0, 0, 0]);
   setLightDirection(0.8, 1.5, 1);
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.45, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle)*3.5, Math.sin(angle*2)*0.5, Math.sin(angle)*3.5-2);
      orbs.push(m);
   }
}

export function update(dt) {
   t += dt;
   phaseTimer += dt;
   if (phaseTimer > 3.5) { phaseTimer = 0; phase = (phase + 1) % PHASES.length; }
   infoText = PHASES[phase];

   setCamera([0, 3, 10], [0, 0, 0]);
   resetCameraRoll();
   const s = Math.sin(t * 1.1);
   if (phase === 0)      dollyCamera(s * 3.5);
   else if (phase === 1) truckCamera(s * 2.5);
   else if (phase === 2) pedestalCamera(s * 1.5);
   else if (phase === 3) panCamera(s * 28);
   else if (phase === 4) tiltCamera(s * 22);
   else if (phase === 5) zoomCamera(0.5 + (s * 0.5 + 0.5) * 1.5);
   else if (phase === 6) setCameraRoll(s * 35);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('827 BATCH 66', 4, 4, rgba8(200, 220, 255, 255));
   print('camera helpers', 4, 14, rgba8(80, 255, 120, 255));
   print('mode: '+infoText, 4, 24, rgba8(255, 200, 80, 220));
   const fwd = getCameraForward();
   if (Array.isArray(fwd))
      print('fwd '+fwd[0].toFixed(2)+' '+fwd[1].toFixed(2)+' '+fwd[2].toFixed(2),
            4, 34, rgba8(140, 180, 255, 160));
   print('roll: '+getCameraRoll().toFixed(1), 4, 44, rgba8(140, 180, 255, 160));
}
