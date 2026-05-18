// Conformance cart 838: Batch 67 showcase — camera paths.

let t = 0;
let cutscene, orbit;
let stage = 0; // 0=cutscene fly-in, 1=orbit loop, 2=done
let orbs = [];
const N = 5;

export function init() {
   setLightDirection(0.8, 1.5, 1);
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.5, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle)*3, 0, Math.sin(angle)*3 - 1);
      orbs.push(m);
   }

   // Cinematic fly-in: wide → medium → close
   cutscene = createCameraPath(
      [0, 12, 20,   0, 6, 12,   0, 3, 7],
      [0,  0,  0,   0, 0,  0,   0, 0, 0],
      4.0
   );
   playCameraPath(cutscene);

   // Orbit loop around the scene (used after cutscene)
   orbit = createCameraPath(
      [6, 4, 0,   0, 4, 6,  -6, 4, 0,   0, 4, -6,   6, 4, 0],
      [0, 0, 0,   0, 0, 0,   0, 0, 0,   0, 0,  0,   0, 0,  0],
      6.0
   );
   setCameraPathLoop(orbit, true);
}

export function update(dt) {
   t += dt;
   if (stage === 0) {
      updateCameraPaths(dt);
      if (isCameraPathDone(cutscene)) {
         stage = 1;
         playCameraPath(orbit);
      }
   } else if (stage === 1) {
      updateCameraPaths(dt);
   }
   // Gentle bob on orbs
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      setPosition(orbs[i],
         Math.cos(angle) * 3,
         Math.sin(t * 0.9 + i * 1.2) * 0.3,
         Math.sin(angle) * 3 - 1);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('838 BATCH 67', 4, 4, rgba8(200, 220, 255, 255));
   print('camera paths', 4, 14, rgba8(80, 255, 120, 255));
   const label = stage === 0 ? 'fly-in' : 'orbit';
   print('mode: ' + label, 4, 24, rgba8(255, 200, 80, 220));
   const active = stage === 0 ? cutscene : orbit;
   const prog = getCameraPathProgress(active);
   print('progress: ' + prog.toFixed(2), 4, 34, rgba8(140, 180, 255, 180));
}
