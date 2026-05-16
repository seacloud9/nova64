// Conformance cart 189: charCode / charFromCode.

let errors = [];

export function init() {
   if (typeof charCode     !== 'function') { errors.push('charCode-missing');     return; }
   if (typeof charFromCode !== 'function') { errors.push('charFromCode-missing'); return; }

   const cA = charCode('A');
   if (cA !== 65) errors.push('charCode-A: ' + cA);

   const ca = charCode('a');
   if (ca !== 97) errors.push('charCode-a: ' + ca);

   const c0 = charCode('0');
   if (c0 !== 48) errors.push('charCode-0: ' + c0);

   // Empty string
   const ce = charCode('');
   if (typeof ce !== 'number') errors.push('charCode-empty-not-number');

   const sA = charFromCode(65);
   if (sA !== 'A') errors.push('charFromCode-65: ' + sA);

   const sa = charFromCode(97);
   if (sa !== 'a') errors.push('charFromCode-97: ' + sa);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('189 CHAR UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const c = rgba8(180, 220, 255, 255);
   print('charCode("A")=' + charCode('A'), 8, 40, c);
   print('charCode("a")=' + charCode('a'), 8, 52, c);
   print('charFromCode(65)=' + charFromCode(65), 8, 64, c);
   print('charFromCode(97)=' + charFromCode(97), 8, 76, c);

   // ASCII table strip
   const y0 = 100;
   for (let i = 32; i < 127; i++) {
      const ch = charFromCode(i);
      const x = 8 + (i - 32) * 6;
      if (x < 630) print(ch, x, y0 + Math.floor((i - 32) / 95) * 10, rgba8(160, 200, 240, 255));
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
