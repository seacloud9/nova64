// Conformance cart 113: Math utility functions.
// lerp(a,b,t); clamp(v,lo,hi); map(v,a,b,c,d); smoothstep(lo,hi,x);
// wrap(v,lo,hi); approach(cur,tgt,step); between(v,lo,hi).

let errors = [];

export function init() {
   const check = (label, got, exp, eps) => {
      const diff = Math.abs(got - exp);
      if (eps !== undefined ? diff > eps : got !== exp)
         errors.push(label + ': got ' + got + ' exp ' + exp);
   };

   if (typeof lerp !== 'function')       { errors.push('lerp-missing'); return; }
   if (typeof clamp !== 'function')      { errors.push('clamp-missing'); return; }
   if (typeof map !== 'function')        { errors.push('map-missing'); return; }
   if (typeof smoothstep !== 'function') { errors.push('smoothstep-missing'); return; }
   if (typeof wrap !== 'function')       { errors.push('wrap-missing'); return; }
   if (typeof approach !== 'function')   { errors.push('approach-missing'); return; }
   if (typeof between !== 'function')    { errors.push('between-missing'); return; }

   // lerp
   check('lerp-0',   lerp(0, 10, 0),   0,   0.001);
   check('lerp-0.5', lerp(0, 10, 0.5), 5,   0.001);
   check('lerp-1',   lerp(0, 10, 1),   10,  0.001);

   // clamp
   check('clamp-lo',  clamp(-5, 0, 10), 0);
   check('clamp-mid', clamp(5,  0, 10), 5);
   check('clamp-hi',  clamp(15, 0, 10), 10);

   // map
   check('map-lo',  map(0,  0, 10, 100, 200), 100, 0.001);
   check('map-mid', map(5,  0, 10, 100, 200), 150, 0.001);
   check('map-hi',  map(10, 0, 10, 100, 200), 200, 0.001);

   // smoothstep: 0 below lo, 1 above hi, smooth in between
   check('smoothstep-lo',  smoothstep(0, 1, -0.5), 0, 0.001);
   check('smoothstep-hi',  smoothstep(0, 1,  1.5), 1, 0.001);
   const sm = smoothstep(0, 1, 0.5);
   if (sm <= 0 || sm >= 1)
      errors.push('smoothstep-mid out of (0,1): ' + sm);

   // wrap
   check('wrap-in',    wrap(5,  0, 10), 5);
   check('wrap-over',  wrap(12, 0, 10), 2);
   check('wrap-under', wrap(-1, 0, 10), 9);

   // approach
   check('approach-close', approach(3, 10, 10), 10);
   check('approach-step',  approach(0, 10, 3),  3);
   check('approach-neg',   approach(10, 0, 3),  7);

   // between
   if (between(5,  0, 10) !== true)  errors.push('between-in not true');
   if (between(-1, 0, 10) !== false) errors.push('between-out not false');
   if (between(10, 0, 10) !== true)  errors.push('between-eq not true');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('113 MATH UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Visual: lerp gradient bar
   for (let x = 0; x < 200; x++) {
      const t = x / 199;
      const v = Math.floor(lerp(40, 220, t));
      line(40 + x, 50, 40 + x, 70, rgba8(v, v, 255, 255));
   }
   print('lerp bar', 4, 74, rgba8(160, 200, 255, 255));

   // smoothstep vs lerp curve dots
   for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const sy = Math.floor(lerp(110, 90, smoothstep(0, 1, t)));
      pset(40 + i * 10, sy, rgba8(255, 200, 60, 255));
   }
   print('smoothstep curve', 4, 115, rgba8(255, 200, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
