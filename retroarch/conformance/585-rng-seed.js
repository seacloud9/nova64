// Conformance cart 585: rngRandom, rngFloat, rngPick, rngShuffle,
//                        createSeedFromHash, getSeed, setSeed.

let errors = [];

export function init() {
   const needed = ['rngRandom', 'rngFloat', 'rngPick', 'rngShuffle',
                   'createSeedFromHash', 'getSeed', 'setSeed'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // rngRandom — returns [0,1)
   const h = createRNG(12345);
   const v = rngRandom(h);
   if (typeof v !== 'number' || v < 0 || v >= 1) errors.push('rngRandom-range');

   // rngFloat
   const f1 = rngFloat(h, 5, 10);
   if (f1 < 5 || f1 >= 10) errors.push('rngFloat-range');

   // rngPick
   const arr = [10, 20, 30, 40, 50];
   const picked = rngPick(h, arr);
   if (!arr.includes(picked)) errors.push('rngPick-not-in-array');

   // rngShuffle — same elements, different order possible
   const orig = [1, 2, 3, 4, 5, 6, 7, 8];
   const copy = orig.slice();
   rngShuffle(h, copy);
   if (copy.length !== 8) errors.push('rngShuffle-length');
   for (const n of orig) {
      if (!copy.includes(n)) { errors.push('rngShuffle-missing-' + n); break; }
   }

   destroyRNG(h);

   // createSeedFromHash — same input → same output
   const s1 = createSeedFromHash('hello');
   const s2 = createSeedFromHash('hello');
   if (s1 !== s2) errors.push('seedFromHash-deterministic');
   // different input → different output
   const s3 = createSeedFromHash('world');
   if (s1 === s3) errors.push('seedFromHash-collision');

   // getSeed / setSeed
   setSeed(999);
   const gs = getSeed();
   if (gs !== 999) errors.push('getSeed-wrong');
   setSeed(0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('585 RNG SEED', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // rngRandom scatter plot
   const h2 = createRNG(42);
   for (let i = 0; i < 120; i++) {
      const px = Math.floor(20 + rngRandom(h2) * 580);
      const py = Math.floor(30 + rngRandom(h2) * 80);
      pset(px, py, rgba8(80, 200, 255, 200));
   }

   // rngFloat histogram (range 0-5)
   const buckets = [0, 0, 0, 0, 0];
   for (let i = 0; i < 200; i++) {
      const v = rngFloat(h2, 0, 5);
      buckets[Math.floor(v)]++;
   }
   for (let i = 0; i < 5; i++) {
      const bh = Math.floor(buckets[i] * 0.6);
      rectfill(20 + i * 55, 180 - bh, 70 + i * 55, 180,
               hslColor(i * 60, 0.8, 0.5, 220));
      print(buckets[i], 24 + i * 55, 182, rgba8(180, 220, 255, 255));
   }

   // rngPick visual
   const colors2 = [rgba8(255,80,80,255), rgba8(80,255,80,255), rgba8(80,80,255,255),
                    rgba8(255,255,80,255), rgba8(255,80,255,255)];
   for (let i = 0; i < 30; i++) {
      const c = rngPick(h2, colors2);
      rectfill(20 + i * 19, 200, 35 + i * 19, 220, c);
   }

   // createSeedFromHash display
   const seed = createSeedFromHash('nova64');
   print('hash:' + seed, 20, 230, rgba8(200, 220, 255, 255));

   destroyRNG(h2);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
