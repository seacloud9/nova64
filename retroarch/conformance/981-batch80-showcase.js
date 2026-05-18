// Conformance cart 981: Batch 80 showcase — dialogue box with typewriter effect.

let t = 0;
let phase = 0;   // 0=typing, 1=hold, 2=advance, 3=next line
let holdTimer = 0;
let lineIdx = 0;
let dlg = 0;

const LINES = [
   { speaker: 'COMMANDER', text: 'Nova-64 systems online. All diagnostics nominal. Ready for launch sequence.', speed: 35 },
   { speaker: 'AI CORE',   text: 'Trajectory computed. Estimated arrival: 72 standard cycles. Fuel reserves nominal.', speed: 30 },
   { speaker: 'PILOT',     text: 'Copy that. Engaging thrusters. Next stop — the outer rim.', speed: 28 },
   { speaker: 'COMMANDER', text: 'Good luck out there. The colonies are counting on you.', speed: 32 },
];

const HOLD_TIME = 0.6;

function loadLine(idx) {
   const ln = LINES[idx];
   if (!dlg)
      dlg = createDialogue(ln.text, 20, 270, 600, 68, ln.speed);
   else
      setDialogueText(dlg, ln.text);
   setDialogueSpeaker(dlg, ln.speaker);
   phase = 0;
   holdTimer = 0;
}

export function init() {
   loadLine(0);
}

export function update(dt) {
   t += dt;
   if (phase === 0) {
      updateDialogue(dlg, dt);
      if (isDialogueDone(dlg)) { phase = 1; holdTimer = 0; }
   } else if (phase === 1) {
      holdTimer += dt;
      if (holdTimer >= HOLD_TIME) {
         lineIdx = (lineIdx + 1) % LINES.length;
         loadLine(lineIdx);
      }
   }
}

export function draw() {
   cls(rgba8(8, 10, 22, 255));

   // Space scene
   rectfill(0, 0, 640, 260, rgba8(8, 10, 22, 255));
   // stars (deterministic)
   for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 23) % 640;
      const sy = (i * 97  + 11) % 240;
      const br = 80 + (i * 43) % 140;
      pset(sx, sy, rgba8(br, br, br + 20, 255));
   }
   // planet
   rectfill(460, 60, 120, 120, rgba8(60, 90, 160, 255));
   rectfill(475, 75, 90, 90, rgba8(80, 120, 200, 255));
   // ship silhouette
   rectfill(100, 180, 80, 30, rgba8(50, 55, 70, 255));
   rectfill(130, 165, 20, 15, rgba8(60, 65, 80, 255));

   drawDialogue(dlg);

   printBold('981 BATCH 80', 4, 4, rgba8(200, 220, 255, 255));
   print('dialogue line:' + (lineIdx + 1) + '/' + LINES.length, 4, 14, rgba8(80, 255, 120, 200));
}
