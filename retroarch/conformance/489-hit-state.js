// Conformance cart 489: createHitState, triggerHit, updateHitState.

let errors = [];

export function init() {
   const needed = ['createHitState', 'triggerHit', 'updateHitState'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('489 HIT STATE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Create hit state with 1.5s invuln window
   const hs = createHitState({ invulnDuration: 1.5 });

   // First hit should land
   const hit1 = triggerHit(hs);
   rectfill(20, 30, 80, 50, hit1 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Immediate second hit should be blocked (invuln active)
   const hit2 = triggerHit(hs);
   rectfill(90, 30, 150, 50, !hit2 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // hitCount should be 1
   const cntOk = hs.hitCount === 1;
   rectfill(160, 30, 220, 50, cntOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Advance past invuln window
   for (let i = 0; i < 100; i++) updateHitState(hs, 0.016);

   // Now another hit should land
   const hit3 = triggerHit(hs);
   rectfill(230, 30, 290, 50, hit3 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // hitCount should now be 2
   const cntOk2 = hs.hitCount === 2;
   rectfill(300, 30, 360, 50, cntOk2 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Visual: simulate a blinking health bar (3 hit states)
   const bars = [createHitState({ invulnDuration: 0.5 }),
                 createHitState({ invulnDuration: 1.0 }),
                 createHitState({ invulnDuration: 2.0 })];
   for (const b of bars) triggerHit(b);
   for (let step = 0; step < 40; step++) {
      for (const b of bars) updateHitState(b, 0.016);
   }
   for (let bi = 0; bi < 3; bi++) {
      const prog = bars[bi].invulnElapsed / bars[bi].invulnDuration;
      rectfill(20 + bi * 120, 70, 130 + bi * 120, 100, rgba8(200, Math.floor(prog * 200), 80, 200));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
