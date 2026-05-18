// Conformance cart 799: animated HP bars
// Verifies createHPBar / hpBarDamage / hpBarHeal / updateHPBar /
//         drawHPBar / getHPRatio / destroyHPBar

let testDone = false;

export function init() {
   // ── Basic create ──
   const bar = createHPBar(10, 10, 200, 14, 100);
   if (!bar) throw new Error('createHPBar returned 0');

   // Full HP at start
   const r0 = getHPRatio(bar);
   if (r0 < 0.999) throw new Error('fresh HP ratio should be 1, got ' + r0);

   // ── Damage ──
   hpBarDamage(bar, 25);
   const r1 = getHPRatio(bar);
   if (r1 < 0.74 || r1 > 0.76) throw new Error('ratio after 25 damage should be 0.75, got ' + r1);

   // ── HP clamped at 0 ──
   hpBarDamage(bar, 9999);
   if (getHPRatio(bar) > 0.001) throw new Error('HP should clamp to 0');

   // ── Heal ──
   hpBarHeal(bar, 50);
   const r2 = getHPRatio(bar);
   if (r2 < 0.49 || r2 > 0.51) throw new Error('ratio after heal-to-50 should be 0.5, got ' + r2);

   // ── HP clamped at max ──
   hpBarHeal(bar, 9999);
   if (getHPRatio(bar) < 0.999) throw new Error('HP should clamp to max');

   // ── updateHPBar moves display_hp toward current_hp ──
   // damage 60 → current=40, display still ~100 until update
   hpBarDamage(bar, 60);
   // updateHPBar with 0 dt → no movement
   updateHPBar(bar, 0);
   // updateHPBar 0.5s → display chases down (speed=max_hp*0.8=80/s, 0.5s→40 units)
   updateHPBar(bar, 0.5);
   // display_hp should have moved toward 40; ratio still usable
   const r3 = getHPRatio(bar);
   if (r3 < 0.39 || r3 > 0.41) throw new Error('ratio after 40 HP should be 0.4, got ' + r3);

   // ── destroyHPBar / re-create ──
   destroyHPBar(bar);
   const bar2 = createHPBar(0, 0, 100, 10, 200);
   if (!bar2) throw new Error('re-create after destroy failed');
   destroyHPBar(bar2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('799 HP BAR', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Draw five bars at preset damage/heal states (with brief updateHPBar to show lag)
   const specs = [
      { hp: 100, dmg: 0,  heal: 0,  dt: 0.1 },
      { hp: 100, dmg: 30, heal: 0,  dt: 0.1 },
      { hp: 100, dmg: 65, heal: 0,  dt: 0.1 },
      { hp: 100, dmg: 90, heal: 0,  dt: 0.1 },
      { hp: 100, dmg: 50, heal: 20, dt: 0.1 },
   ];
   for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const bar = createHPBar(40, 50 + i * 50, 400, 22, s.hp);
      hpBarDamage(bar, s.dmg);
      hpBarHeal(bar, s.heal);
      updateHPBar(bar, s.dt);
      drawHPBar(bar);
      print(Math.round(getHPRatio(bar)*100) + '%', 448, 55 + i*50, rgba8(180, 200, 255, 200));
      destroyHPBar(bar);
   }
}
