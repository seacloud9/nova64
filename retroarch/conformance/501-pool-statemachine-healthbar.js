// Conformance cart 501: isInvulnerable, isFlashing, isVisible,
//                        createPool, createStateMachine, drawHealthBar.

let errors = [];

export function init() {
   const needed = ['isInvulnerable', 'isFlashing', 'isVisible',
                   'createPool', 'createStateMachine', 'drawHealthBar'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('501 POOL SM HEALTHBAR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // isInvulnerable / isFlashing / isVisible
   const hs = createHitState({ invulnDuration: 2.0 });
   triggerHit(hs);
   const inv1 = isInvulnerable(hs);   // true — just hit
   const fla1 = isFlashing(hs);       // true — flashElapsed < 0.1
   const vis1 = isVisible(hs, 0.05);  // true — time 0.05 → floor(0.5)=0 → even → visible
   const vis2 = isVisible(hs, 0.15);  // false — time 0.15 → floor(1.5)=1 → odd → invisible
   rectfill(20, 30, 60, 50, inv1 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));
   rectfill(70, 30, 110, 50, fla1 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));
   rectfill(120, 30, 160, 50, vis1 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));
   rectfill(170, 30, 210, 50, !vis2 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // After advancing past invuln — not invuln
   for (let i = 0; i < 130; i++) updateHitState(hs, 0.016);
   const inv2 = isInvulnerable(hs);
   rectfill(220, 30, 260, 50, !inv2 ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // createPool — pre-allocate 5 bullet objects
   const pool = createPool(5, () => ({ active: false, x: 0, y: 0, speed: 200 }));
   const poolOk = pool.maxSize === 5 && Array.isArray(pool.items) && pool.items.length === 5;
   rectfill(270, 30, 310, 50, poolOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // createStateMachine
   const sm = createStateMachine('idle');
   const smOk = sm.state === 'idle' && sm.prevState === null;
   rectfill(320, 30, 360, 50, smOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Transition state manually
   sm.prevState = sm.state; sm.state = 'running';
   const transOk = sm.state === 'running' && sm.prevState === 'idle';
   rectfill(370, 30, 410, 50, transOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // drawHealthBar — full range from 0 to 1
   for (let hi = 0; hi <= 10; hi++) {
      drawHealthBar(20, 70 + hi * 18, 250, 14, hi, 10);
   }

   // Custom colored health bars
   drawHealthBar(290, 70,  280, 14, 8, 10, { fgColor: rgba8(60, 120, 255, 255), bgColor: rgba8(20, 20, 60, 200) });
   drawHealthBar(290, 90,  280, 14, 3, 10, { fgColor: rgba8(255, 180, 40, 255) });
   drawHealthBar(290, 110, 280, 14, 1, 10, { borderColor: rgba8(255, 100, 100, 255) });

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
