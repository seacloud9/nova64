// Conformance cart 35: deterministic RNG
// Tests nova64.random.seed, .next(), .int(lo, hi).
// With seed(42) the sequence must be deterministic across platforms.

let errors = [];

export function init() {
   if (!nova64.random || typeof nova64.random.seed !== 'function')
      throw new Error('nova64.random.seed missing');
   if (typeof nova64.random.next !== 'function')
      throw new Error('nova64.random.next missing');
   if (typeof nova64.random.int  !== 'function')
      throw new Error('nova64.random.int missing');

   nova64.random.seed(42);
   const v0 = nova64.random.next();
   if (typeof v0 !== 'number' || v0 < 0 || v0 >= 1)
      errors.push('next() out of range: ' + v0);

   // Re-seeding with same seed should reproduce the same first value
   nova64.random.seed(42);
   const v1 = nova64.random.next();
   if (Math.abs(v1 - v0) > 1e-12)
      errors.push('seed not deterministic: ' + v0 + ' vs ' + v1);

   // int(lo, hi) must be in [lo, hi]
   nova64.random.seed(0);
   for (let i = 0; i < 50; i++) {
      const r = nova64.random.int(3, 7);
      if (r < 3 || r > 7) errors.push('int out of range: ' + r);
   }

   // seed(0) should not produce all-zero stream
   nova64.random.seed(0);
   let sum = 0;
   for (let i = 0; i < 10; i++) sum += nova64.random.next();
   if (sum === 0) errors.push('seed(0) produced all zeros');
}

export function update() {}

export function draw() {
   cls(rgba8(10, 14, 24, 255));

   nova64.random.seed(1337);
   let x = 0;
   for (let i = 0; i < 20; i++) {
      x += nova64.random.next();
      const bx = 4 + nova64.random.int(0, 620);
      const by = 80 + nova64.random.int(0, 260);
      pset(bx, by, rgba8(120, 200, 255, 255));
   }

   if (errors.length === 0) {
      print('35 RNG ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('35 RNG FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
