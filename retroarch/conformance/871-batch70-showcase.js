// Conformance cart 871: Batch 70 showcase — mesh hit flash.

let t = 0;
let spheres = [];
let flashTimer = 0;
const N = 6;
const BASE_COLORS = [
   rgba8(220, 60,  60,  255),
   rgba8(60,  200, 100, 255),
   rgba8(60,  120, 255, 255),
   rgba8(255, 200, 50,  255),
   rgba8(200, 60,  255, 255),
   rgba8(60,  220, 220, 255),
];

export function init() {
   setCamera([0, 3, 12], [0, 0, 0]);
   setLightDirection(0.8, 1.5, 1);
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.55, BASE_COLORS[i]);
      setPosition(m, Math.cos(angle) * 3.5, 0, Math.sin(angle) * 3.5 - 1);
      spheres.push(m);
   }
}

export function update(dt) {
   t += dt;
   updateMeshFlashes(dt);

   // Trigger a new flash on a random sphere every 0.4 seconds
   flashTimer += dt;
   if (flashTimer >= 0.4) {
      flashTimer = 0;
      // Pick sphere deterministically from t
      const idx = Math.floor(t * 2.5) % N;
      triggerMeshFlash(spheres[idx], rgba8(255, 255, 255, 255), 0.25);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('871 BATCH 70', 4, 4, rgba8(200, 220, 255, 255));
   print('mesh hit flash', 4, 14, rgba8(80, 255, 120, 255));
   let active = 0;
   for (let i = 0; i < N; i++) if (isMeshFlashing(spheres[i])) active++;
   print('flashing: ' + active, 4, 24, rgba8(255, 200, 80, 220));
}
