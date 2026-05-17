// Conformance cart 535: batch 40 combined showcase.

let errors = [];
let spawner;
let cdset;
let t = 0;

export function init() {
   const needed = ['createSpawner', 'updateSpawner', 'triggerWave', 'getSpawnerWave',
                   'createCooldownSet', 'updateCooldowns', 'drawFlash', 'drawPixelBorder',
                   'hslColor', 'scrollingText', 'drawDiamond', 'poly'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   spawner = createSpawner({ waveInterval: 3, perWave: 4, maxWaves: 10 });
   cdset = createCooldownSet({ atk: 0.4, def: 1.2, sp: 0.8 });
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   updateSpawner(spawner, dt);
   updateCooldowns(cdset, dt);
}

export function draw() {
   cls(rgba8(4, 6, 20, 255));
   printBold('535 BATCH 40', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // HSL spectrum background strip
   for (let i = 0; i < 640; i++) {
      const h = remap(i, 0, 640, 0, 360);
      const c = hslColor(h, 0.6, 0.25, 255);
      rectfill(i, 18, i + 1, 28, c);
   }

   // Diamond field
   const dColors = [rgba8(255,200,60,255), rgba8(80,200,255,255), rgba8(255,80,200,255),
                    rgba8(120,255,100,255), rgba8(200,160,255,255)];
   for (let i = 0; i < 5; i++) {
      const p = pulse(t + i * 0.4, 1);
      const hw = 20 + Math.floor(p * 12);
      drawDiamond(80 + i * 110, 80, hw, Math.floor(hw * 0.7), dColors[i], i % 2 === 0);
   }

   // Polygon showcase — rotating hexagon
   const hexPts = [];
   for (let i = 0; i < 6; i++) {
      const a = deg2rad(i * 60 + t * 30);
      hexPts.push({ x: 320 + Math.floor(35 * Math.cos(a)), y: 170 + Math.floor(35 * Math.sin(a)) });
   }
   poly(hexPts, lerpColor(rgba8(80,200,255,220), rgba8(255,80,200,220), pulse(t, 0.5)), true);

   // Cooldown bars
   const cdKeys = ['atk', 'def', 'sp'];
   const cdMax  = [0.4, 1.2, 0.8];
   for (let i = 0; i < 3; i++) {
      const frac = Math.min((cdset[cdKeys[i]] || 0) / cdMax[i], 1);
      const barColor = frac >= 1 ? rgba8(80,255,80,255) : rgba8(200,100,40,255);
      drawPixelBorder(20, 210 + i * 25, 220, 20, rgba8(160,160,160,200), rgba8(40,40,40,200), 1);
      rectfill(22, 212 + i * 25, 22 + Math.floor(frac * 216), 228 + i * 25, barColor);
      print(cdKeys[i], 248, 214 + i * 25, rgba8(200, 220, 255, 255));
   }

   // Spawner status
   drawPanel(460, 200, 160, 80);
   print('Wave: ' + getSpawnerWave(spawner), 470, 210, rgba8(200, 220, 255, 255));
   print('Pending: ' + spawner.pending, 470, 222, rgba8(200, 220, 255, 255));
   const wbar = Math.min(spawner.timer / spawner.waveInterval, 1);
   rectfill(470, 250, 470 + Math.floor(wbar * 140), 260, rgba8(100, 200, 255, 255));

   // Scrolling ticker
   scrollingText('WAVE ' + getSpawnerWave(spawner) + '  NOVA64 BATCH 40  READY  ', 295,
                 60, t, rgba8(255, 220, 80, 255), 1, 640);

   // Flash on wave fire
   if (spawner.pending > 0) {
      drawFlash(rgba8(255, 255, 200, 30));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
