// Conformance cart 524: createSpawner, updateSpawner, triggerWave, getSpawnerWave,
//                        createCooldownSet, updateCooldowns.

let errors = [];
let spawner;
let cdset;
let t = 0;

export function init() {
   const needed = ['createSpawner', 'updateSpawner', 'triggerWave', 'getSpawnerWave',
                   'createCooldownSet', 'updateCooldowns'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   spawner = createSpawner({ waveInterval: 2, perWave: 3, maxWaves: 5 });
   if (!spawner || typeof spawner.wave !== 'number') errors.push('spawner-bad');

   cdset = createCooldownSet({ fire: 0.5, bomb: 2.0, shield: 1.0 });
   if (!cdset || typeof cdset.fire === 'undefined') errors.push('cdset-bad');
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   updateSpawner(spawner, dt);
   updateCooldowns(cdset, dt);
}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('524 SPAWNER CDSET', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Show spawner state
   const wave = getSpawnerWave(spawner);
   print('wave: ' + wave, 20, 30, rgba8(180, 220, 100, 255));
   print('pending: ' + spawner.pending, 20, 40, rgba8(180, 220, 100, 255));
   print('timer: ' + Math.floor(spawner.timer * 10) / 10, 20, 50, rgba8(180, 220, 100, 255));

   // triggerWave test
   triggerWave(spawner);
   print('wave+1: ' + getSpawnerWave(spawner), 20, 60, rgba8(100, 200, 255, 255));

   // Draw cooldown set bars
   const keys = ['fire', 'bomb', 'shield'];
   const maxes = [0.5, 2.0, 1.0];
   for (let i = 0; i < 3; i++) {
      const elapsed = cdset[keys[i]] || 0;
      const frac = Math.min(elapsed / maxes[i], 1);
      rectfill(20, 80 + i * 20, 20 + Math.floor(frac * 200), 90 + i * 20,
               frac >= 1 ? rgba8(80, 255, 80, 255) : rgba8(200, 80, 80, 255));
      print(keys[i], 230, 82 + i * 20, rgba8(200, 220, 255, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
