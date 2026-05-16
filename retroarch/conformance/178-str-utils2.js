// Conformance cart 178: strReplace / strContains / strUpper / strLower.

let errors = [];

export function init() {
   if (typeof strReplace  !== 'function') { errors.push('strReplace-missing');  return; }
   if (typeof strContains !== 'function') { errors.push('strContains-missing'); return; }
   if (typeof strUpper    !== 'function') { errors.push('strUpper-missing');    return; }
   if (typeof strLower    !== 'function') { errors.push('strLower-missing');    return; }

   // strReplace
   const r1 = strReplace('hello world', 'world', 'Nova64');
   if (r1 !== 'hello Nova64') errors.push('strReplace: ' + r1);
   const r2 = strReplace('aabbcc', 'bb', '');
   if (r2 !== 'aacc') errors.push('strReplace-empty: ' + r2);

   // strContains
   if (!strContains('hello world', 'world')) errors.push('strContains-true');
   if (strContains('hello world', 'xyz'))   errors.push('strContains-false');

   // strUpper
   const u = strUpper('hello');
   if (u !== 'HELLO') errors.push('strUpper: ' + u);

   // strLower
   const l = strLower('HELLO');
   if (l !== 'hello') errors.push('strLower: ' + l);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('178 STR UTILS 2', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const c = rgba8(180, 220, 255, 255);
   print('strReplace: ' + strReplace('hello world', 'world', 'Nova64'), 8, 40, c);
   print('strContains: ' + strContains('hello world', 'world'), 8, 52, c);
   print('strUpper: ' + strUpper('hello nova64'), 8, 64, c);
   print('strLower: ' + strLower('HELLO NOVA64'), 8, 76, c);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
