// Conformance cart 75: destructive framebuffer effects and replaceColor.
// Covers screenInvert, screenGrayscale, screenThreshold, and replaceColor.

let errors = [];

export function init() {
   [
      'screenInvert',
      'screenGrayscale',
      'screenThreshold',
      'replaceColor',
   ].forEach((name) => {
      if (typeof globalThis[name] !== 'function')
         throw new Error(name + '() binding missing');
   });

   if (typeof nova64.draw.screenThreshold !== 'function')
      errors.push('nova64.draw.screenThreshold-missing');
   if (typeof nova64.draw.replaceColor !== 'function')
      errors.push('nova64.draw.replaceColor-missing');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 14, 255));

   const blue = rgba8(30, 80, 220, 255);
   const orange = rgba8(240, 120, 40, 255);
   const mint = rgba8(60, 230, 180, 255);
   for (let y = 48; y < 210; y += 24) {
      for (let x = 48; x < 560; x += 48) {
         const color = ((x + y) / 24) % 3 === 0 ? blue : (((x + y) / 24) % 3 === 1 ? orange : mint);
         rectfill(x, y, 38, 18, color);
      }
   }

   const before = pget(48, 48);
   const replaced = replaceColor(before, rgba8(255, 255, 255, 255));
   if (replaced <= 0)
      errors.push('replaceColor-count');

   screenGrayscale();
   screenThreshold(128, rgba8(20, 20, 30, 255), rgba8(230, 230, 210, 255));
   screenInvert();
   screenScanlines(rgba8(0, 0, 0, 255), 0.25, 2);

   print('75 THRESHOLD', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
