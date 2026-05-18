// Conformance cart 893: Batch 72 showcase — screen wipe transitions.

let t = 0;
let phase = 0;      // 0=wipe-out, 1=hold, 2=wipe-in
let phaseTimer = 0;
let currentType = 0;
let wipeHandle = 0;

const TYPE_NAMES = ['slide-left', 'slide-down', 'iris', 'checker', 'blinds'];
const WIPE_DUR = 0.8;
const HOLD_DUR = 0.3;

const BAND_COLORS = [
   [180, 40,  40 ],
   [40,  180, 40 ],
   [40,  40,  200],
   [200, 180, 40 ],
   [140, 40,  200],
   [40,  180, 180],
];

function beginNextWipe() {
   if (wipeHandle) destroyWipe(wipeHandle);
   wipeHandle = createWipe(currentType);
   startWipe(wipeHandle, WIPE_DUR, 0);
   phase = 0;
   phaseTimer = 0;
}

export function init() {
   beginNextWipe();
}

export function update(dt) {
   t += dt;
   phaseTimer += dt;
   updateWipe(wipeHandle, dt);

   if (phase === 0 && isWipeDone(wipeHandle)) {
      phase = 1;
      phaseTimer = 0;
   } else if (phase === 1 && phaseTimer >= HOLD_DUR) {
      startWipe(wipeHandle, WIPE_DUR, 1);
      phase = 2;
      phaseTimer = 0;
   } else if (phase === 2 && isWipeDone(wipeHandle)) {
      currentType = (currentType + 1) % 5;
      beginNextWipe();
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   // Colorful scene
   for (let i = 0; i < 6; i++) {
      const c = BAND_COLORS[i];
      rectfill(0, 60 + i * 50, 640, 48, rgba8(c[0], c[1], c[2], 255));
   }

   // Wipe overlay
   drawWipe(wipeHandle);

   // HUD drawn on top
   printBold('893 BATCH 72', 4, 4, rgba8(200, 220, 255, 255));
   print(TYPE_NAMES[currentType], 4, 14, rgba8(80, 255, 120, 255));
   const pStr = wipeProgress(wipeHandle).toFixed(2);
   print('p:' + pStr + ' phase:' + phase, 4, 24, rgba8(255, 200, 80, 220));
}
