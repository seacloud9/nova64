// Conformance cart 164: createRNG / rngNext / rngRange / destroyRNG.

let errors = [];

export function init() {
   if (typeof createRNG  !== 'function') { errors.push('createRNG-missing');  return; }
   if (typeof rngNext    !== 'function') { errors.push('rngNext-missing');    return; }
   if (typeof rngRange   !== 'function') { errors.push('rngRange-missing');   return; }
   if (typeof destroyRNG !== 'function') { errors.push('destroyRNG-missing'); return; }

   const r = createRNG(42);
   if (typeof r !== 'number' || r === 0) { errors.push('createRNG-invalid'); return; }

   const v = rngNext(r);
   if (typeof v !== 'number') errors.push('rngNext-not-number');
   if (v < 0 || v > 1) errors.push('rngNext-range: ' + v);

   const lo = 10, hi = 20;
   const rv = rngRange(r, lo, hi);
   if (rv < lo || rv > hi) errors.push('rngRange-range: ' + rv);

   // Determinism: same seed → same first value
   const r2 = createRNG(42);
   const v2 = rngNext(r2);
   if (Math.abs(v - v2) > 1e-9) errors.push('determinism: ' + v + ' != ' + v2);

   destroyRNG(r);
   destroyRNG(r2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('164 SEEDED RNG', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a field of dots using a seeded RNG — same every frame
   const r = createRNG(1337);
   for (let i = 0; i < 60; i++) {
      const x = rngRange(r, 20, 300);
      const y = rngRange(r, 40, 200);
      const c = rgba8(rngRange(r, 100, 255), rngRange(r, 100, 255), rngRange(r, 100, 255), 255);
      circfill(x, y, 3, c);
   }
   destroyRNG(r);
   print('60 deterministic dots', 8, 218, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
