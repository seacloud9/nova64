// Conformance cart 488: createShake, triggerShake, updateShake, getShakeOffset,
//                        createCooldown, useCooldown, cooldownReady, cooldownProgress, updateCooldown.

let errors = [];

export function init() {
   const needed = ['createShake', 'triggerShake', 'updateShake', 'getShakeOffset',
                   'createCooldown', 'useCooldown', 'cooldownReady', 'cooldownProgress', 'updateCooldown'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('488 SHAKE COOLDOWN', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Screen shake — create, trigger, update, read offset
   const shake = createShake({ decay: 0.85 });
   triggerShake(shake, 10);
   // Simulate 5 update steps; use fixed rand (seeded by reset each frame) — just check structure
   for (let i = 0; i < 5; i++) updateShake(shake, 0.016);
   const off = getShakeOffset(shake);
   // off is array [x, y] — just verify it's an array
   const shakeOk = Array.isArray(off) && off.length === 2;
   rectfill(20, 30, 60, 50, shakeOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Cooldown — starts ready
   const cd = createCooldown(2.0);
   const readyAtStart = cooldownReady(cd);
   rectfill(70, 30, 110, 50, readyAtStart ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Use it — should succeed first time
   const used = useCooldown(cd);
   rectfill(120, 30, 160, 50, used ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Right after use — not ready
   const notReady = !cooldownReady(cd);
   rectfill(170, 30, 210, 50, notReady ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Progress bar — show cooldown fill over time
   for (let i = 0; i < 60; i++) updateCooldown(cd, 0.016);
   const p1 = cooldownProgress(cd);
   const p2 = cooldownProgress(createCooldown(1.0)); // fresh = 1.0
   const barW = 200;
   rectfill(20, 60, 20 + barW, 80, rgba8(40, 40, 80, 255));
   rectfill(20, 60, 20 + Math.floor(p1 * barW), 80, rgba8(80, 180, 255, 255));
   rectfill(20, 85, 20 + barW, 105, rgba8(40, 40, 80, 255));
   rectfill(20, 85, 20 + Math.floor(p2 * barW), 105, rgba8(80, 255, 80, 255));

   // Multiple cooldowns updated together
   const cdSet = [createCooldown(0.5), createCooldown(1.0), createCooldown(2.0)];
   for (const c of cdSet) { useCooldown(c); updateCooldown(c, 0.4); }
   for (let i = 0; i < 3; i++) {
      const prog = cooldownProgress(cdSet[i]);
      rectfill(20 + i * 70, 115, 80 + i * 70, 135, rgba8(100, Math.floor(prog * 200), 80, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
