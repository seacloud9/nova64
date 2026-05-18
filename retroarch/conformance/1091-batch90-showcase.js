// Conformance cart 1091: Batch 90 showcase — arena wave survival HUD.

let mgr = 0;
let t = 0;

export function init() {
   mgr = createWaveManager();
   startWave(mgr, 8);
   enemyDefeated(mgr);
   enemyDefeated(mgr);
   enemyDefeated(mgr);
}

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(6, 8, 16, 255));

   // Arena floor
   rectfill(60, 80, 520, 240, rgba8(12, 14, 28, 255));
   rectfill(60, 80, 520, 4, rgba8(40, 40, 80, 200));
   rectfill(60, 316, 520, 4, rgba8(40, 40, 80, 200));

   // Enemy markers
   const rem = getRemainingEnemies(mgr);
   for (let i = 0; i < rem; i++) {
      const ex = 120 + (i % 5) * 80;
      const ey = 150 + Math.floor(i / 5) * 60;
      rectfill(ex, ey, 28, 28, rgba8(200, 40, 40, 220));
      print('E', ex + 9, ey + 9, rgba8(255, 180, 180, 255));
   }

   // HUD panel
   rectfill(0, 0, 640, 50, rgba8(8, 8, 20, 240));
   const wn  = getWaveNumber(mgr);
   const act = isWaveActive(mgr);
   printBold('WAVE ' + wn, 10, 8, rgba8(255, 200, 60, 255));
   print('enemies: ' + rem, 10, 22, rgba8(255, 100, 80, 220));
   print(act ? 'ACTIVE' : 'CLEARED', 300, 15, act ? rgba8(255, 80, 80, 255) : rgba8(80, 255, 120, 255));
   printFlash(290, 25, act ? 'SURVIVE!' : 'WAVE DONE', rgba8(255, 240, 80, 255), t, 2.0);

   printBold('1091 BATCH 90', 4, 330, rgba8(200, 220, 255, 200));
   print('wave manager', 4, 340, rgba8(80, 255, 120, 180));
}
