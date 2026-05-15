// Conformance cart 145: zeroPad / formatNumber / commaNumber.

let errors = [];

export function init() {
   if (typeof zeroPad      !== 'function') { errors.push('zeroPad-missing'); return; }
   if (typeof formatNumber !== 'function') { errors.push('formatNumber-missing'); return; }
   if (typeof commaNumber  !== 'function') { errors.push('commaNumber-missing'); return; }

   if (zeroPad(7, 3)    !== '007')      errors.push('zeroPad-007');
   if (zeroPad(42, 1)   !== '42')       errors.push('zeroPad-42');
   if (zeroPad(0, 4)    !== '0000')     errors.push('zeroPad-0000');

   if (formatNumber(3.14159, 2) !== '3.14') errors.push('formatNumber-314');
   if (formatNumber(10, 0)      !== '10')   errors.push('formatNumber-10');

   if (commaNumber(1234567)  !== '1,234,567')  errors.push('commaNumber');
   if (commaNumber(-9876)    !== '-9,876')      errors.push('commaNumber-neg');
   if (commaNumber(999)      !== '999')         errors.push('commaNumber-small');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('145 NUMBER FORMAT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const y0 = 40;
   const c = rgba8(180, 220, 255, 255);
   print('zeroPad(7, 3)      = ' + zeroPad(7, 3),       8, y0,       c);
   print('zeroPad(42, 5)     = ' + zeroPad(42, 5),      8, y0 + 12,  c);
   print('formatNumber(3.14159,2) = ' + formatNumber(3.14159, 2), 8, y0 + 24, c);
   print('commaNumber(1234567)    = ' + commaNumber(1234567),     8, y0 + 36, c);
   print('commaNumber(-9876)      = ' + commaNumber(-9876),       8, y0 + 48, c);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
