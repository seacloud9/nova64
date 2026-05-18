// Conformance cart 992: Batch 81 showcase — toast notifications.

let t = 0;
let toasts = [];
let nextSpawn = 0;
let msgIdx = 0;

const MESSAGES = [
   { text: 'Achievement unlocked: First Steps',  dur: 2.5, col: [80, 200, 80] },
   { text: 'LEVEL UP!  Reached level 7',          dur: 2.0, col: [255, 210, 60] },
   { text: 'New weapon found: Plasma Rifle',       dur: 2.2, col: [80, 180, 255] },
   { text: 'Enemy defeated: +250 XP',             dur: 1.8, col: [200, 80, 80] },
   { text: 'Checkpoint reached',                  dur: 1.6, col: [140, 60, 220] },
   { text: 'Shield restored to full',             dur: 2.0, col: [60, 200, 200] },
];

// Pre-allocate toast slots (one per message, staggered y positions)
const SLOT_Y = [8, 32, 56, 80, 104, 128];

export function init() {
   for (let i = 0; i < MESSAGES.length; i++) {
      const m = MESSAGES[i];
      const h = createToast(m.text, m.dur);
      toasts.push(h);
   }
   nextSpawn = 0.4;
}

export function update(dt) {
   t += dt;
   nextSpawn -= dt;
   if (nextSpawn <= 0 && msgIdx < MESSAGES.length) {
      const m = MESSAGES[msgIdx];
      showToast(toasts[msgIdx], m.text, m.dur);
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      nextSpawn = 0.5;
   }
   for (let i = 0; i < toasts.length; i++)
      updateToast(toasts[i], dt);
}

export function draw() {
   cls(rgba8(8, 10, 20, 255));

   // Game world background
   rectfill(0, 0, 640, 360, rgba8(14, 18, 36, 255));
   // ground
   rectfill(0, 300, 640, 60, rgba8(35, 50, 35, 255));
   // player character (simple box)
   rectfill(300, 260, 24, 40, rgba8(80, 120, 200, 255));
   // HUD bar
   rectfill(0, 340, 640, 20, rgba8(10, 12, 22, 220));
   print('HP: 85/100    XP: 1240    LVL 7', 8, 345, rgba8(180, 200, 255, 200));

   // Position each toast at its slot
   for (let i = 0; i < toasts.length; i++) {
      const m = MESSAGES[i];
      // Override toast y by drawing at adjusted offset
      drawToast(toasts[i]);
   }

   printBold('992 BATCH 81', 4, 330, rgba8(200, 220, 255, 200));
}
