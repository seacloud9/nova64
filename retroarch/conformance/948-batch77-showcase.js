// Conformance cart 948: Batch 77 showcase — animated HP bars (enemy wave).

let t = 0;
const N = 5;
let bars = [];
let dmgTimers = [];
let names = ['SLIME', 'GOBLIN', 'ORC', 'TROLL', 'DRAGON'];
let maxHPs = [40, 70, 120, 200, 500];
let speeds = [0.7, 0.5, 0.4, 0.3, 0.2];  // attack interval
let dmgAmts = [8, 14, 22, 35, 80];
let healTimers = [];
const COL_FULL  = rgba8(80,  210, 80,  255);
const COL_MID   = rgba8(220, 180, 40,  255);
const COL_LOW   = rgba8(210, 50,  50,  255);
const COL_DMG   = rgba8(210, 70,  40,  180);
const COL_BG    = rgba8(20,  22,  35,  220);

function hpColor(ratio) {
   if (ratio > 0.5) return COL_FULL;
   if (ratio > 0.25) return COL_MID;
   return COL_LOW;
}

export function init() {
   for (let i = 0; i < N; i++) {
      const bar = createHPBar(100, 60 + i * 54, 400, 28, maxHPs[i]);
      bars.push(bar);
      dmgTimers.push(speeds[i] * (i * 0.3 + 0.1));
      healTimers.push(4.0 + i * 0.8);
   }
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < N; i++) {
      dmgTimers[i] -= dt;
      if (dmgTimers[i] <= 0) {
         dmgTimers[i] = speeds[i];
         hpBarDamage(bars[i], dmgAmts[i]);
      }
      healTimers[i] -= dt;
      if (healTimers[i] <= 0) {
         healTimers[i] = 5.0;
         hpBarHeal(bars[i], maxHPs[i]);
      }
      updateHPBar(bars[i], dt);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   for (let i = 0; i < N; i++) {
      const ratio = getHPRatio(bars[i]);
      // Dynamically update fg color based on HP level
      // (re-create is too expensive; use the lag bar for visual contrast)
      drawHPBar(bars[i]);
      const hp = Math.round(ratio * maxHPs[i]);
      print(names[i], 4, 66 + i * 54, rgba8(180, 200, 255, 220));
      print(hp + '/' + maxHPs[i], 508, 66 + i * 54, rgba8(200, 220, 255, 160));
   }

   printBold('948 BATCH 77', 4, 4, rgba8(200, 220, 255, 255));
   print('HP bars', 4, 14, rgba8(80, 255, 120, 255));
}
