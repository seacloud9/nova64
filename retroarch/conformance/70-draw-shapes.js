// Conformance cart 70: expanded 2D visual primitives.
// Covers rectGradient, thick line, tri/trifill, oval/ovalfill, alpha blend,
// getBlend2D, and related capability flags.

let errors = [];

function requireFn(name) {
   if (typeof globalThis[name] !== 'function')
      throw new Error(name + '() binding missing');
}

export function init() {
   [
      'rectGradient',
      'tri',
      'trifill',
      'oval',
      'ovalfill',
      'setBlend2D',
      'getBlend2D',
      'clearBlend2D',
   ].forEach(requireFn);

   if (typeof nova64.draw.rectGradient !== 'function')
      errors.push('nova64.draw.rectGradient-missing');
   if (typeof nova64.draw.trifill !== 'function')
      errors.push('nova64.draw.trifill-missing');
   if (typeof nova64.draw.ovalfill !== 'function')
      errors.push('nova64.draw.ovalfill-missing');
   if (typeof nova64.draw.getBlend2D !== 'function')
      errors.push('nova64.draw.getBlend2D-missing');

   clearBlend2D();
   if (getBlend2D() !== 'normal')
      errors.push('blend-normal');
   setBlend2D('alpha');
   if (getBlend2D() !== 'alpha')
      errors.push('blend-alpha');
   clearBlend2D();

   const caps = getBackendCapabilities();
   if (caps.alphaBlend2D !== true)
      errors.push('caps.alphaBlend2D');
   if (caps.primitive2DShapes !== true)
      errors.push('caps.primitive2DShapes');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 20, 255));

   rectGradient(0, 32, 640, 96, rgba8(24, 48, 120, 255), rgba8(210, 82, 130, 255), false);
   trifill(64, 168, 136, 72, 208, 168, rgba8(250, 196, 60, 255));
   tri(250, 164, 320, 72, 390, 164, rgba8(80, 240, 210, 255));
   ovalfill(476, 116, 74, 38, rgba8(120, 220, 90, 255));
   oval(476, 116, 92, 52, rgba8(250, 250, 250, 255));
   line(48, 228, 592, 228, rgba8(255, 255, 255, 255), 7);

   rect(430, 196, 110, 60, rgba8(40, 80, 240, 255), true);
   setBlend2D('alpha');
   rect(470, 216, 110, 60, rgba8(255, 80, 40, 128), true);
   clearBlend2D();

   print('70 DRAW SHAPES', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
