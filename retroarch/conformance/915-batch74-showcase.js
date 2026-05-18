// Conformance cart 915: Batch 74 showcase — typewriter text effect.

let t = 0;
let phase = 0;      // 0=typing, 1=hold, 2=clear, 3=next
let phaseTimer = 0;
let twHandle = 0;
let lineIdx = 0;

const LINES = [
   { text: 'INITIALIZING NOVA64 RUNTIME...', color: [80,  255, 120], speed: 28 },
   { text: 'LOADING CONFORMANCE SUITE.',     color: [200, 200, 80 ], speed: 22 },
   { text: 'BATCH 74 ENGAGED.',              color: [80,  180, 255], speed: 18 },
   { text: 'ALL SYSTEMS NOMINAL.',           color: [255, 120, 60 ], speed: 20 },
   { text: 'READY FOR LAUNCH.',              color: [200, 60,  220], speed: 24 },
];
const TEXT_X  = 40;
const TEXT_Y  = 160;
const HOLD    = 0.8;

function startLine(idx) {
   if (twHandle) destroyTypewriter(twHandle);
   const ln = LINES[idx];
   twHandle = createTypewriter(ln.text, TEXT_X, TEXT_Y,
      rgba8(ln.color[0], ln.color[1], ln.color[2], 255), ln.speed);
   phase = 0;
   phaseTimer = 0;
}

export function init() {
   startLine(0);
}

export function update(dt) {
   t += dt;
   phaseTimer += dt;
   updateTypewriter(twHandle, dt);

   if (phase === 0 && isTypewriterDone(twHandle)) {
      phase = 1;
      phaseTimer = 0;
   } else if (phase === 1 && phaseTimer >= HOLD) {
      lineIdx = (lineIdx + 1) % LINES.length;
      startLine(lineIdx);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   // Terminal-style background
   rectfill(20, 140, 600, 40, rgba8(8, 10, 20, 255));
   rect(20, 140, 600, 40, rgba8(40, 50, 80, 255));

   drawTypewriter(twHandle);

   // Blinking cursor after visible text
   const p = typewriterProgress(twHandle);
   if (p < 0.999 || Math.floor(t * 2) % 2 === 0) {
      const visLen = Math.floor(p * LINES[lineIdx].text.length);
      const cx = TEXT_X + visLen * 6;
      rectfill(cx, TEXT_Y, 5, 8, rgba8(180, 200, 255, 200));
   }

   printBold('915 BATCH 74', 4, 4, rgba8(200, 220, 255, 255));
   print('typewriter', 4, 14, rgba8(80, 255, 120, 255));
   print('line ' + (lineIdx + 1) + '/' + LINES.length, 4, 24, rgba8(120, 160, 255, 180));
}
