// Conformance cart 1003: Batch 82 showcase — combo counter.
// Side-scrolling beat-em-up style: enemies spawn, player hits them building combos.

let t = 0;
let combo = 0;
let hitTimer = 0;
let hitInterval = 0.22;
let phase = 0;     // 0=building, 1=expiring, 2=done
let hitsDone = 0;
const TOTAL_HITS = 15;

// Enemy positions
const ENEMIES = [
   { x: 420, y: 170, hp: 3, col: [160, 50, 50] },
   { x: 500, y: 190, hp: 2, col: [140, 80, 40] },
   { x: 340, y: 200, hp: 4, col: [80, 50, 140] },
];
let enemyHp = [3, 2, 4];
let flashTimer = [0, 0, 0];

export function init() {
   combo = createCombo(40, 130, 1.4);
}

export function update(dt) {
   t += dt;
   hitTimer -= dt;

   if (phase === 0 && hitsDone < TOTAL_HITS) {
      if (hitTimer <= 0) {
         hitCombo(combo);
         // damage random enemy
         const ei = hitsDone % 3;
         if (enemyHp[ei] > 0) { enemyHp[ei]--; }
         flashTimer[ei] = 0.12;
         hitsDone++;
         hitTimer = hitInterval;
         if (hitsDone >= TOTAL_HITS) phase = 1;
      }
   }

   for (let i = 0; i < 3; i++)
      if (flashTimer[i] > 0) flashTimer[i] -= dt;

   updateCombo(combo, dt);
}

export function draw() {
   cls(rgba8(8, 10, 20, 255));

   // Arena floor
   rectfill(0, 260, 640, 100, rgba8(22, 26, 44, 255));
   rectfill(0, 258, 640, 4, rgba8(40, 50, 80, 200));

   // Background glow
   rectfill(280, 80, 80, 180, rgba8(30, 20, 50, 120));

   // Enemies
   for (let i = 0; i < ENEMIES.length; i++) {
      const e = ENEMIES[i];
      const alive = enemyHp[i] > 0;
      const flash = flashTimer[i] > 0;
      const ec = flash ? rgba8(255, 255, 255, 255)
                       : rgba8(e.col[0], e.col[1], e.col[2], alive ? 255 : 80);
      rectfill(e.x, e.y, 40, 80, ec);
      // hp dots
      for (let j = 0; j < ENEMIES[i].hp; j++)
         rectfill(e.x + 2 + j * 8, e.y - 6, 6, 4, rgba8(80, 200, 80, 200));
      for (let j = enemyHp[i]; j < ENEMIES[i].hp; j++)
         rectfill(e.x + 2 + j * 8, e.y - 6, 6, 4, rgba8(60, 60, 60, 180));
   }

   // Player
   rectfill(240, 180, 36, 80, rgba8(60, 120, 200, 255));
   rectfill(252, 165, 14, 16, rgba8(80, 140, 220, 255));

   // Combo
   drawCombo(combo);

   // HUD
   rectfill(0, 0, 640, 20, rgba8(8, 10, 20, 220));
   print('HITS:' + hitsDone + '/' + TOTAL_HITS, 8, 5, rgba8(200, 200, 255, 200));
   print('COUNT:' + getComboCount(combo), 120, 5, rgba8(255, 220, 60, 200));

   printBold('1003 BATCH 82', 460, 5, rgba8(200, 220, 255, 200));
}
