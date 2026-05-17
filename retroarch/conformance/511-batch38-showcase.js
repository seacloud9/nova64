// Conformance cart 511: batch 38 combined showcase.

let errors = [];

export function init() {
   const needed = ['createEmitter2D', 'burstEmitter2D', 'setEmitter2DActive',
                   'updateEmitter2D', 'drawEmitter2D', 'clearEmitter2D',
                   'isInvulnerable', 'isFlashing', 'isVisible',
                   'createPool', 'createStateMachine', 'drawHealthBar'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 8, 22, 255));
   printBold('511 BATCH 38', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Three particle emitters — explosion burst
   const colors = [rgba8(255, 200, 60, 255), rgba8(80, 180, 255, 255), rgba8(255, 80, 180, 255)];
   const positions = [[160, 200], [320, 200], [480, 200]];
   for (let ei = 0; ei < 3; ei++) {
      const em = createEmitter2D({
         x: positions[ei][0], y: positions[ei][1],
         spread: 3.14, speedMin: 40, speedMax: 120,
         lifetimeMin: 0.4, lifetimeMax: 1.0, gravY: 100,
         color: colors[ei], colorEnd: rgba8(0, 0, 0, 0),
         size: 5, sizeEnd: 0, maxCount: 60
      });
      burstEmitter2D(em, 50);
      for (let i = 0; i < 15; i++) updateEmitter2D(em, 0.016);
      drawEmitter2D(em);
   }

   // Continuous emitter — fountain
   const fountain = createEmitter2D({
      x: 320, y: 300, dirX: 0, dirY: -1, spread: 0.3,
      speedMin: 80, speedMax: 150, lifetimeMin: 0.5, lifetimeMax: 1.2,
      gravY: 180, color: rgba8(100, 200, 255, 200), colorEnd: rgba8(60, 80, 200, 0),
      size: 3, sizeEnd: 0, rate: 80, maxCount: 80
   });
   setEmitter2DActive(fountain, true);
   for (let i = 0; i < 25; i++) updateEmitter2D(fountain, 0.016);
   drawEmitter2D(fountain);

   // Health bars — 4 characters with different states
   const hpData = [[100, 100], [65, 100], [28, 100], [8, 100]];
   for (let pi = 0; pi < 4; pi++) {
      drawHealthBar(20 + pi * 150, 320, 130, 12, hpData[pi][0], hpData[pi][1]);
   }

   // Hit state gallery
   const states = [];
   const invDurs = [0.5, 1.0, 2.0, 3.0];
   const advances = [10, 25, 50, 80];
   for (let si = 0; si < 4; si++) {
      const hs = createHitState({ invulnDuration: invDurs[si] });
      triggerHit(hs);
      for (let t = 0; t < advances[si]; t++) updateHitState(hs, 0.016);
      states.push(hs);
      const inv = isInvulnerable(hs);
      const vis = isVisible(hs, hs.invulnElapsed);
      circfill(50 + si * 100, 350, 20, inv ? rgba8(255, 80, 80, 200) : rgba8(80, 255, 80, 200));
      if (!vis) rectfill(34 + si * 100, 334, 66 + si * 100, 366, rgba8(255, 255, 255, 60));
   }

   // State machine with transitions visualized
   const sm = createStateMachine('patrol');
   const stateColors = { patrol: rgba8(80, 160, 255, 255), chase: rgba8(255, 160, 40, 255), attack: rgba8(255, 60, 60, 255) };
   const transitions = ['patrol', 'chase', 'attack', 'patrol'];
   for (let ti = 0; ti < 4; ti++) {
      sm.prevState = sm.state; sm.state = transitions[ti];
      const c = stateColors[sm.state] || rgba8(200, 200, 200, 255);
      rectfill(20 + ti * 80, 300, 95 + ti * 80, 316, c);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
