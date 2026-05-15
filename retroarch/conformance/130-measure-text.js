// Conformance cart 130: measureText / printCentered.

let errors = [];

export function init() {
   if (typeof measureText   !== 'function') { errors.push('measureText-missing');   return; }
   if (typeof printCentered !== 'function') { errors.push('printCentered-missing'); return; }

   // Single word: each char is 6px wide, last char has no trailing space → 5*6-1=29
   const m1 = measureText('Hello');
   if (!m1 || typeof m1.width !== 'number') {
      errors.push('measureText returned no object'); return;
   }
   // 5 chars × 6 = 30 minus trailing space = 29
   if (m1.width !== 29) errors.push('measureText width: expected 29, got ' + m1.width);
   if (m1.lines !== 1)  errors.push('measureText lines: expected 1, got ' + m1.lines);

   // Multi-line
   const m2 = measureText('A\nB\nC');
   if (m2.lines !== 3) errors.push('multiline count: expected 3, got ' + m2.lines);
   // Height: (3-1)*9 + 7 = 25
   if (m2.height !== 25) errors.push('multiline height: expected 25, got ' + m2.height);

   // Empty string
   const m3 = measureText('');
   if (m3.width !== 0) errors.push('empty width not 0: ' + m3.width);

   // printCentered should not crash
   printCentered('test', 160, 40, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('130 MEASURE TEXT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Centered labels at x=320
   line(320, 40, 320, 200, rgba8(60, 60, 100, 255));
   printCentered('CENTERED', 320, 60, rgba8(200, 220, 255, 255));
   printCentered('TEXT', 320, 80, rgba8(180, 200, 255, 255));
   printCentered('DEMO', 320, 100, rgba8(160, 180, 255, 255));

   const m = measureText('CENTERED');
   print('w=' + m.width, 4, 120, rgba8(140, 160, 200, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
