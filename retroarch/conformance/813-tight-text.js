// Conformance cart 813: printTight / tightTextWidth.

let errors = [];

export function init() {
   if (typeof printTight !== 'function') {
      errors.push('printTight-missing');
      return;
   }
   if (typeof tightTextWidth !== 'function') {
      errors.push('tightTextWidth-missing');
      return;
   }
   if (!nova64 || !nova64.draw || typeof nova64.draw.printTight !== 'function') {
      errors.push('draw.printTight-missing');
      return;
   }
   if (typeof nova64.draw.tightTextWidth !== 'function') {
      errors.push('draw.tightTextWidth-missing');
      return;
   }

   const fixedSkinny = textWidth('III');
   const tightSkinny = tightTextWidth('III');
   if (!(tightSkinny > 0 && tightSkinny < fixedSkinny)) {
      errors.push('skinny width ' + tightSkinny + '/' + fixedSkinny);
      return;
   }

   const fixedPhrase = textWidth('RETROARCH EDITION');
   const tightPhrase = tightTextWidth('RETROARCH EDITION');
   if (!(tightPhrase > 0 && tightPhrase < fixedPhrase)) {
      errors.push('phrase width ' + tightPhrase + '/' + fixedPhrase);
      return;
   }

   if (tightTextWidth('') !== 0) {
      errors.push('empty width');
      return;
   }

   if (tightTextWidth('A\nIII') !== tightTextWidth('III')) {
      errors.push('multiline max width');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('813 TIGHT TEXT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   rect(36, 42, 568, 92, rgba8(55, 70, 110, 255), false);
   line(320, 38, 320, 152, rgba8(70, 90, 150, 255));
   print('fixed: III RETROARCH EDITION', 52, 58, rgba8(110, 140, 210, 255));
   printTight('tight: III RETROARCH EDITION', 52, 74, rgba8(255, 230, 90, 255));
   printTight('CENTERED TIGHT TEXT', 320, 102, rgba8(80, 255, 210, 255), 'center');
   nova64.draw.printTight('RIGHT EDGE', 588, 120, rgba8(255, 120, 220, 255), 'right');

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
