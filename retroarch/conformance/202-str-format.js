// Conformance cart 202: percentStr / toFixed.

let errors = [];

export function init() {
   if (typeof percentStr !== 'function') { errors.push('percentStr-missing'); return; }
   if (typeof toFixed    !== 'function') { errors.push('toFixed-missing');    return; }

   const p0 = percentStr(0.0);
   if (p0 !== '0%') errors.push('percentStr-0: ' + p0);

   const p75 = percentStr(0.75);
   if (p75 !== '75%') errors.push('percentStr-0.75: ' + p75);

   const p100 = percentStr(1.0);
   if (p100 !== '100%') errors.push('percentStr-1.0: ' + p100);

   const f2 = toFixed(3.14159, 2);
   if (f2 !== '3.14') errors.push('toFixed-2: ' + f2);

   const f0 = toFixed(3.9, 0);
   if (f0 !== '4') errors.push('toFixed-0: ' + f0);

   const f4 = toFixed(0.0001, 4);
   if (f4 !== '0.0001') errors.push('toFixed-4: ' + f4);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('202 STR FORMAT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();
   const c = rgba8(180, 220, 255, 255);
   const vals = [0.0, 0.25, 0.5, 0.75, 1.0];
   let y0 = 40;
   for (const v of vals) {
      print('percentStr(' + toFixed(v, 2) + ') = ' + percentStr(v), 8, y0, c);
      y0 += 12;
   }

   y0 += 4;
   print('toFixed(Math.PI, 4) = ' + toFixed(Math.PI, 4), 8, y0, c);
   y0 += 12;
   print('toFixed(1.5, 0) = ' + toFixed(1.5, 0), 8, y0, c);

   // Live display
   const v = Math.sin(t) * 0.5 + 0.5;
   printBold('value: ' + percentStr(v), 8, 150, rgba8(255, 220, 80, 255));
   print('raw: ' + toFixed(v, 4), 8, 163, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
