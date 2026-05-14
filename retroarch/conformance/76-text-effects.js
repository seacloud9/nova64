// Conformance cart 76: text measurement and text effects.
// Covers textHeight, textSize, printShadow, printOutline, and textEffects caps.

let errors = [];

export function init() {
   ['textHeight', 'textSize', 'printShadow', 'printOutline'].forEach((name) => {
      if (typeof globalThis[name] !== 'function')
         throw new Error(name + '() binding missing');
   });

   if (typeof nova64.draw.printShadow !== 'function')
      errors.push('nova64.draw.printShadow-missing');
   if (typeof nova64.draw.textSize !== 'function')
      errors.push('nova64.draw.textSize-missing');

   if (textHeight('A\nB') !== 16)
      errors.push('textHeight');
   const size = textSize('NOVA\n64');
   if (!size || size.w !== textWidth('NOVA') || size.h !== 16 || size.lines !== 2)
      errors.push('textSize');

   const caps = getBackendCapabilities();
   if (caps.textEffects !== true)
      errors.push('caps.textEffects');
}

export function update(dt) {}

export function draw() {
   clsGradient(rgba8(18, 20, 44, 255), rgba8(76, 42, 96, 255), true);
   rectGradient(24, 54, 592, 210, rgba8(28, 36, 82, 255), rgba8(90, 34, 86, 255), false);

   printShadow('SHADOW TEXT', 76, 96, rgba8(255, 240, 120, 255), rgba8(0, 0, 0, 255), 3, 3);
   printOutline('OUTLINE TEXT', 320, 144, rgba8(100, 255, 220, 255), rgba8(20, 20, 30, 255), 'center');
   printShadow('SIZE ' + textSize('NOVA\n64').w + 'x' + textSize('NOVA\n64').h, 320, 198,
      rgba8(250, 250, 250, 255), rgba8(40, 40, 50, 255), 2, 2, 'center');

   print('76 TEXT EFFECTS', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
