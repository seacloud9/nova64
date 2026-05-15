// Conformance cart 160: createFloatText / drawFloatTexts / clearFloatTexts / floatTextCount.

let errors = [];

export function init() {
   if (typeof createFloatText  !== 'function') { errors.push('createFloatText-missing');  return; }
   if (typeof drawFloatTexts   !== 'function') { errors.push('drawFloatTexts-missing');   return; }
   if (typeof clearFloatTexts  !== 'function') { errors.push('clearFloatTexts-missing');  return; }
   if (typeof floatTextCount   !== 'function') { errors.push('floatTextCount-missing');   return; }

   clearFloatTexts();
   const before = floatTextCount();
   if (typeof before !== 'number') errors.push('floatTextCount-not-number');

   createFloatText('HIT', 100, 100, -20, 1.5, rgba8(255, 200, 60, 255));
   const after = floatTextCount();
   if (after <= before) errors.push('floatTextCount-not-incremented: ' + after);

   clearFloatTexts();
   if (floatTextCount() !== 0) errors.push('clearFloatTexts-not-zero: ' + floatTextCount());

   // Spawn a fixed set for the visual
   createFloatText('+100', 80,  140, -25, 2.0, rgba8(255, 220, 80, 255));
   createFloatText('+50',  160, 150, -20, 2.0, rgba8(200, 255, 100, 255));
   createFloatText('CRIT', 240, 130, -30, 2.0, rgba8(255, 100, 80, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('160 FLOAT TEXT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   drawFloatTexts();
   print('count: ' + floatTextCount(), 8, 40, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
