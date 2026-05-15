// Conformance cart 111: procedural noise API.
// noise(x), noise(x, y), noise(x, y, z) → approximately [-1, 1].
// fbm(x, y [, octaves [, lacunarity [, gain]]]) → fractal Brownian motion.
// nova64.random.noise / fbm namespace aliases.

let errors = [];

export function init() {
   if (typeof noise !== 'function') { errors.push('noise-missing'); return; }
   if (typeof fbm !== 'function')   { errors.push('fbm-missing'); return; }

   // 1D: same x → same value; different x → different value
   const n1a = noise(1.23);
   const n1b = noise(1.23);
   if (n1a !== n1b) errors.push('noise(x) not deterministic');
   const n1c = noise(5.67);
   if (n1a === n1c) errors.push('noise(x) constant across all inputs');

   // Range check: [-1.5, 1.5] is generous; real Perlin stays in [-1, 1]
   const ns = [noise(0.1), noise(1.5), noise(3.7), noise(-2.2), noise(0.0)];
   for (let i = 0; i < ns.length; i++)
      if (ns[i] < -1.5 || ns[i] > 1.5)
         errors.push('noise out of range: ' + ns[i]);

   // 2D: deterministic and spatially varying
   const n2a = noise(1.0, 2.0);
   const n2b = noise(1.0, 2.0);
   if (n2a !== n2b) errors.push('noise(x,y) not deterministic');
   const n2c = noise(3.0, 4.0);
   if (n2a === n2c) errors.push('noise(x,y) constant across all inputs');
   if (n2a < -1.5 || n2a > 1.5) errors.push('noise2 out of range: ' + n2a);

   // 3D: deterministic
   const n3a = noise(1.0, 2.0, 3.0);
   const n3b = noise(1.0, 2.0, 3.0);
   if (n3a !== n3b) errors.push('noise(x,y,z) not deterministic');
   if (n3a < -1.5 || n3a > 1.5) errors.push('noise3 out of range: ' + n3a);

   // fbm: deterministic, varying, within range
   const f1 = fbm(1.0, 2.0);
   const f2 = fbm(1.0, 2.0);
   if (f1 !== f2) errors.push('fbm not deterministic');
   if (f1 < -1.5 || f1 > 1.5) errors.push('fbm out of range: ' + f1);
   const f3 = fbm(5.5, 9.1);
   if (f1 === f3) errors.push('fbm constant across all inputs');

   // fbm octaves parameter changes output
   const fOct2 = fbm(1.0, 2.0, 2);
   const fOct8 = fbm(1.0, 2.0, 8);
   if (fOct2 === fOct8) errors.push('fbm octaves parameter has no effect');

   // namespace alias
   if (typeof nova64.random.noise !== 'function') errors.push('nova64.random.noise missing');
   if (typeof nova64.random.fbm   !== 'function') errors.push('nova64.random.fbm missing');
   if (nova64.random.noise(1.0, 2.0) !== n2a)    errors.push('nova64.random.noise alias mismatch');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('111 NOISE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a simple noise scanline so there's something visual to verify
   for (let x = 0; x < 80; x++) {
      const v = noise(x * 0.1, 0.5);           // [-1, 1]
      const y = 36 + Math.round(v * 10);
      pset(x * 4 + 4, y, rgba8(80, 220, 120, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
