// Conformance cart 137: string utilities — strSplit/Trim/PadStart/PadEnd/StartsWith/EndsWith/Repeat.

let errors = [];

export function init() {
   // strSplit
   if (typeof strSplit !== 'function') { errors.push('strSplit-missing'); return; }
   const parts = strSplit('a,b,c', ',');
   if (!Array.isArray(parts) || parts.length !== 3) errors.push('strSplit-length');
   if (parts[1] !== 'b') errors.push('strSplit-value');

   // strTrim
   if (strTrim('  hello  ') !== 'hello') errors.push('strTrim');

   // strPadStart
   if (strPadStart('42', 5, '0') !== '00042') errors.push('strPadStart');

   // strPadEnd
   if (strPadEnd('hi', 5, '.') !== 'hi...') errors.push('strPadEnd');

   // strStartsWith
   if (!strStartsWith('hello world', 'hello')) errors.push('strStartsWith-true');
   if (strStartsWith('hello world', 'world')) errors.push('strStartsWith-false');

   // strEndsWith
   if (!strEndsWith('hello world', 'world')) errors.push('strEndsWith-true');
   if (strEndsWith('hello world', 'hello')) errors.push('strEndsWith-false');

   // strRepeat
   if (strRepeat('ab', 3) !== 'ababab') errors.push('strRepeat');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('137 STR UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const y0 = 40;
   print('strSplit("a,b,c",",")', 8, y0,      rgba8(180, 220, 255, 255));
   print('strTrim("  hi  ")',      8, y0 + 12, rgba8(180, 220, 255, 255));
   print('strPadStart("1",4,"0")', 8, y0 + 24, rgba8(180, 220, 255, 255));
   print('strPadEnd("hi",5,".")',  8, y0 + 36, rgba8(180, 220, 255, 255));
   print('strRepeat("ab",3)',      8, y0 + 48, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
