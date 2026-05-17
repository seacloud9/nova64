// Conformance cart 499: batch 37 combined showcase — shake, cooldown, hit state.

let errors = [];

export function init() {
   const needed = ['createShake', 'triggerShake', 'updateShake', 'getShakeOffset',
                   'createCooldown', 'useCooldown', 'cooldownReady', 'cooldownProgress',
                   'updateCooldown', 'createHitState', 'triggerHit', 'updateHitState'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 8, 24, 255));
   printBold('499 BATCH 37', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Cooldown bars grid — 8 cooldowns at different durations/phases
   const durations = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0];
   for (let ci = 0; ci < 8; ci++) {
      const cd = createCooldown(durations[ci]);
      useCooldown(cd);
      const steps = Math.floor(ci * 6);
      for (let s = 0; s < steps; s++) updateCooldown(cd, 0.016);
      const p = cooldownProgress(cd);
      const barH = Math.floor(p * 60);
      rectfill(20 + ci * 68, 100, 76 + ci * 68, 160, rgba8(30, 40, 80, 255));
      rectfill(20 + ci * 68, 160 - barH, 76 + ci * 68, 160, lerpColor(rgba8(255, 80, 60, 255), rgba8(60, 255, 100, 255), p));
      if (cooldownReady(createCooldown(0))) {
         rectfill(20 + ci * 68, 162, 76 + ci * 68, 166, rgba8(80, 255, 120, 200));
      }
   }

   // Hit state blinking row
   for (let hi = 0; hi < 10; hi++) {
      const hs = createHitState({ invulnDuration: 1.0 });
      for (let t = 0; t <= hi * 8; t++) {
         if (t % 8 === 0) triggerHit(hs);
         updateHitState(hs, 0.016);
      }
      const prog = Math.min(hs.invulnElapsed / hs.invulnDuration, 1);
      circfill(40 + hi * 56, 220, 20, lerpColor(rgba8(255, 60, 60, 220), rgba8(80, 180, 255, 220), prog));
      print(String(hs.hitCount), 34 + hi * 56, 246, rgba8(255, 255, 255, 200));
   }

   // Shake offset visualization — plot shake trajectory
   const sh = createShake({ decay: 0.9 });
   triggerShake(sh, 18);
   let px = 320, py = 300;
   for (let si = 0; si < 50; si++) {
      updateShake(sh, 0.016);
      const o = getShakeOffset(sh);
      const nx = 320 + o[0];
      const ny = 300 + o[1];
      line(Math.floor(px), Math.floor(py), Math.floor(nx), Math.floor(ny),
           lerpColor(rgba8(255, 200, 60, 200), rgba8(60, 80, 200, 100), si / 49));
      px = nx; py = ny;
   }
   circfill(320, 300, 4, rgba8(255, 200, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
