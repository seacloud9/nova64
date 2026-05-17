// Conformance cart 561: shuffleArray, pickRandom, weightedRandom, setRandomSeed,
//                        subVec2, scaleVec2.

let errors = [];

export function init() {
   const needed = ['shuffleArray', 'pickRandom', 'weightedRandom',
                   'setRandomSeed', 'subVec2', 'scaleVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // setRandomSeed determinism
   setRandomSeed(42);
   const a1 = randInt(0, 1000);
   setRandomSeed(42);
   const a2 = randInt(0, 1000);
   if (a1 !== a2) errors.push('seed-not-deterministic');

   // shuffleArray
   const arr = [1, 2, 3, 4, 5, 6, 7, 8];
   shuffleArray(arr);
   if (arr.length !== 8) errors.push('shuffle-length');

   // pickRandom
   const colors = [rgba8(255,0,0,255), rgba8(0,255,0,255), rgba8(0,0,255,255)];
   const c = pickRandom(colors);
   if (typeof c !== 'number') errors.push('pickRandom-type');

   // weightedRandom
   const weights = [1, 10, 1];
   let hits = 0;
   setRandomSeed(1234);
   for (let i = 0; i < 100; i++) {
      if (weightedRandom(weights) === 1) hits++;
   }
   if (hits < 60) errors.push('weightedRandom-skewed');

   // subVec2
   const sv = subVec2(10, 20, 3, 8);
   if (sv.x !== 7 || sv.y !== 12) errors.push('subVec2-wrong');

   // scaleVec2
   const sc = scaleVec2(4, 5, 3);
   if (sc.x !== 12 || sc.y !== 15) errors.push('scaleVec2-wrong');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('561 SHUFFLE VEC2', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Seeded random visualization
   setRandomSeed(99);
   for (let i = 0; i < 80; i++) {
      const px = randInt(20, 600);
      const py = randInt(30, 100);
      pset(px, py, rgba8(80, 200, 255, 220));
   }

   // shuffleArray color bar
   const palette = [];
   for (let i = 0; i < 20; i++) {
      palette.push(hslColor(i * 18, 0.8, 0.5, 255));
   }
   shuffleArray(palette);
   for (let i = 0; i < palette.length; i++) {
      rectfill(20 + i * 29, 110, 48 + i * 29, 140, palette[i]);
   }

   // weightedRandom histogram
   const ws = [1, 5, 3, 8, 2];
   const counts = [0, 0, 0, 0, 0];
   setRandomSeed(777);
   for (let i = 0; i < 200; i++) { counts[weightedRandom(ws)]++; }
   for (let i = 0; i < 5; i++) {
      const h = Math.floor(counts[i] * 0.8);
      rectfill(20 + i * 60, 200 - h, 70 + i * 60, 200,
               hslColor(i * 60, 0.8, 0.5, 220));
      print(counts[i], 24 + i * 60, 202, rgba8(180, 220, 255, 255));
   }

   // subVec2 / scaleVec2 arrow
   const base = {x: 300, y: 260};
   const tip  = addVec2(base.x, base.y, 80, 0);
   const mid  = lerpVec2(base.x, base.y, tip.x, tip.y, 0.5);
   const scaled = scaleVec2(mid.x, mid.y, 1.1);
   line(Math.floor(base.x), Math.floor(base.y), Math.floor(tip.x), Math.floor(tip.y),
        rgba8(255, 200, 80, 255));
   rectfill(Math.floor(scaled.x)-3, Math.floor(scaled.y)-3,
            Math.floor(scaled.x)+3, Math.floor(scaled.y)+3, rgba8(255, 80, 80, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
