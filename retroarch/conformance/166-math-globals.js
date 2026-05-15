// Conformance cart 166: floor / ceil / round / fract / sign / pow / abs / sqrt.

let errors = [];

export function init() {
   const fns = ['floor','ceil','round','fract','sign','pow','abs','sqrt'];
   for (const f of fns) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   if (floor(3.7)   !== 3)     errors.push('floor: ' + floor(3.7));
   if (ceil(3.1)    !== 4)     errors.push('ceil: '  + ceil(3.1));
   if (round(3.5)   !== 4)     errors.push('round: ' + round(3.5));
   if (Math.abs(fract(3.75) - 0.75) > 1e-9) errors.push('fract: ' + fract(3.75));
   if (sign(-5)     !== -1)    errors.push('sign-neg: ' + sign(-5));
   if (sign(0)      !== 0)     errors.push('sign-zero: ' + sign(0));
   if (sign(5)      !== 1)     errors.push('sign-pos: ' + sign(5));
   if (Math.abs(pow(2, 10) - 1024) > 1e-6) errors.push('pow: ' + pow(2, 10));
   if (abs(-7)      !== 7)     errors.push('abs: ' + abs(-7));
   if (Math.abs(sqrt(9) - 3)  > 1e-9) errors.push('sqrt: ' + sqrt(9));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('166 MATH GLOBALS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const c = rgba8(180, 220, 255, 255);
   print('floor(3.7)=' + floor(3.7), 8, 40, c);
   print('ceil(3.1)=' + ceil(3.1),   8, 52, c);
   print('fract(3.75)=' + fract(3.75).toFixed(2), 8, 64, c);
   print('sign(-5)=' + sign(-5),     8, 76, c);
   print('pow(2,10)=' + pow(2,10),   8, 88, c);
   print('sqrt(9)=' + sqrt(9),       8, 100, c);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
