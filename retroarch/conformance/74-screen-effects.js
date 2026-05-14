// Conformance cart 74: framebuffer effect helpers.
// Covers fade/tint/invert/grayscale/posterize/scanlines/vignette.

let errors = [];

function requireFn(name) {
   if (typeof globalThis[name] !== 'function')
      throw new Error(name + '() binding missing');
}

export function init() {
   [
      'screenFade', 'screenTint', 'screenInvert', 'screenGrayscale',
      'screenPosterize', 'screenScanlines', 'screenVignette',
   ].forEach(requireFn);

   if (typeof nova64.draw.screenFade !== 'function')
      errors.push('nova64.draw.screenFade-missing');
   if (typeof nova64.draw.screenPosterize !== 'function')
      errors.push('nova64.draw.screenPosterize-missing');

   const caps = getBackendCapabilities();
   if (caps.screenEffects2D !== true)
      errors.push('caps.screenEffects2D');
}

export function update(dt) {}

export function draw() {
   clsGradient(rgba8(14, 18, 36, 255), rgba8(78, 28, 92, 255), true);

   for (let i = 0; i < 8; i++) {
      const x = 40 + i * 66;
      rectGradient(x, 58, 54, 150,
         rgba8(30 + i * 24, 220 - i * 14, 255, 255),
         rgba8(255, 70 + i * 12, 80 + i * 18, 255),
         true);
   }

   screenTint(rgba8(160, 220, 255, 255), 0.22);
   screenPosterize(6);
   screenScanlines(rgba8(0, 0, 0, 255), 0.35, 3);
   screenVignette(0.55, rgba8(0, 0, 0, 255));
   screenFade(rgba8(20, 16, 50, 255), 0.08);

   print('74 SCREEN EFFECTS', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
