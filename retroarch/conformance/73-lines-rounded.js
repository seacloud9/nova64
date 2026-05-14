// Conformance cart 73: line/rounded rectangle visual helpers.
// Covers hline, vline, lineGradient, rectfill, roundRect, roundRectFill,
// clsGradient, and capability flags.

let errors = [];

function requireFn(name) {
   if (typeof globalThis[name] !== 'function')
      throw new Error(name + '() binding missing');
}

export function init() {
   [
      'hline', 'vline', 'lineGradient', 'rectfill',
      'roundRect', 'roundRectFill', 'clsGradient',
   ].forEach(requireFn);

   if (typeof nova64.draw.lineGradient !== 'function')
      errors.push('nova64.draw.lineGradient-missing');
   if (typeof nova64.draw.roundRectFill !== 'function')
      errors.push('nova64.draw.roundRectFill-missing');

   const caps = getBackendCapabilities();
   if (caps.roundedRects !== true)
      errors.push('caps.roundedRects');
   if (caps.lineGradients !== true)
      errors.push('caps.lineGradients');
}

export function update(dt) {}

export function draw() {
   clsGradient(rgba8(6, 8, 18, 255), rgba8(28, 38, 80, 255), false);

   for (let y = 58; y <= 150; y += 18)
      hline(36, y, 300, rgba8(60 + y, 220, 255 - y, 255));
   for (let x = 340; x <= 520; x += 24)
      vline(x, 52, 154, rgba8(240, 90 + x % 120, 80, 255));

   lineGradient(42, 210, 596, 210, rgba8(80, 240, 255, 255), rgba8(255, 80, 180, 255), 9);
   rectfill(62, 248, 140, 46, rgba8(70, 180, 240, 255));
   roundRectFill(250, 238, 150, 64, 18, rgba8(240, 190, 70, 255));
   roundRect(250, 238, 150, 64, 18, rgba8(255, 255, 240, 255));
   roundRectFill(450, 238, 120, 64, 28, rgba8(110, 240, 130, 255));

   print('73 LINES ROUNDED', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
