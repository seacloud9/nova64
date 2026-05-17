// Conformance cart 477: noiseMap, flowField, colorMode, color, TWO_PI, HALF_PI, QUARTER_PI.

let errors = [];

export function init() {
   const needed = ['noiseMap', 'flowField', 'colorMode', 'color'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof TWO_PI     === 'undefined') errors.push('TWO_PI-missing');
   if (typeof HALF_PI    === 'undefined') errors.push('HALF_PI-missing');
   if (typeof QUARTER_PI === 'undefined') errors.push('QUARTER_PI-missing');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('477 NOISEMAP FLOWFIELD COLOR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // noiseMap — render as grayscale patch
   noiseSeed(77);
   const map = noiseMap(60, 60, 0.08, 0, 0);
   for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 60; x++) {
         const v = Math.floor(map[y * 60 + x] * 255);
         pset(20 + x, 24 + y, rgba8(v, v, v, 255));
      }
   }

   // flowField — render angle arrows as dots
   const field = flowField(15, 10, 0.15, 0);
   for (let fy = 0; fy < 10; fy++) {
      for (let fx = 0; fx < 15; fx++) {
         const angle = field[fy * 15 + fx];
         const ox = 100 + fx * 30;
         const oy = 24 + fy * 20;
         const ex = Math.floor(ox + Math.cos(angle) * 8);
         const ey = Math.floor(oy + Math.sin(angle) * 8);
         line(ox, oy, ex, ey, rgba8(80, 200, 255, 200));
         pset(ex, ey, rgba8(255, 255, 80, 255));
      }
   }

   // colorMode RGB (default) — color() produces rgba8
   colorMode('RGB');
   rectfill(20, 100, 60, 120, color(255, 80, 60, 255));
   rectfill(65, 100, 105, 120, color(80, 200, 60, 255));
   rectfill(110, 100, 150, 120, color(60, 80, 255, 255));

   // colorMode HSB — color() interprets as hue/sat/bri
   colorMode('HSB');
   for (let i = 0; i < 10; i++) {
      rectfill(20 + i * 16, 125, 34 + i * 16, 145, color(i * 36, 0.9, 0.9, 255));
   }
   colorMode('RGB'); // reset

   // Math constants
   const piTest = Math.abs(TWO_PI - Math.PI * 2) < 0.001 &&
                  Math.abs(HALF_PI - Math.PI / 2) < 0.001 &&
                  Math.abs(QUARTER_PI - Math.PI / 4) < 0.001;
   rectfill(20, 148, 40, 158, piTest ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
