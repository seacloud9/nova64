// Conformance cart 812: wavemgr — createWaveManager, startWave, getWaveNumber,
//   isWaveActive, enemyDefeated, getRemainingEnemies, nextWave, destroyWaveManager

let mgr = 0;

export function init() {
   mgr = createWaveManager();
   startWave(mgr, 5);
   enemyDefeated(mgr);
   enemyDefeated(mgr);
}

export function draw() {
   cls(rgba8(8, 6, 16, 255));

   const wn  = getWaveNumber(mgr);
   const act = isWaveActive(mgr);
   const rem = getRemainingEnemies(mgr);

   rectfill(160, 80, 320, 140, rgba8(16, 14, 30, 220));
   printBold('WAVE ' + wn, 290, 100, rgba8(255, 200, 60, 255));
   print('active: ' + act,   200, 120, rgba8(80, 200, 255, 200));
   print('remaining: ' + rem, 200, 132, rgba8(255, 120, 80, 200));

   for (let i = 0; i < 5; i++) {
      const done = i >= rem;
      const col = done ? rgba8(40, 40, 60, 200) : rgba8(255, 80, 80, 255);
      rectfill(200 + i * 28, 156, 22, 22, col);
   }

   printBold('812 WAVE MGR', 4, 4, rgba8(200, 220, 255, 255));
   print('createWaveManager startWave enemyDefeated', 4, 14, rgba8(80, 255, 120, 180));
}
