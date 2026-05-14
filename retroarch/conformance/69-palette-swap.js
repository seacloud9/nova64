// Conformance cart 69: 16-color palette helpers and exact palette swap.

let errors = [];

export function init() {
   if (typeof setPalette !== 'function')
      throw new Error('setPalette() binding missing');
   if (typeof getPalette !== 'function')
      throw new Error('getPalette() binding missing');
   if (typeof applyPaletteSwap !== 'function')
      throw new Error('applyPaletteSwap() binding missing');
   if (typeof clearPaletteSwap !== 'function')
      throw new Error('clearPaletteSwap() binding missing');

   if (typeof nova64.draw.setPalette !== 'function')
      errors.push('nova64.draw.setPalette-missing');
   if (typeof nova64.draw.applyPaletteSwap !== 'function')
      errors.push('nova64.draw.applyPaletteSwap-missing');

   const red = rgba8(210, 42, 60, 255);
   const green = rgba8(42, 210, 90, 255);
   const blue = rgba8(70, 90, 230, 255);
   if (setPalette(1, red) !== true)
      errors.push('setPalette-red');
   if (setPalette(2, green) !== true)
      errors.push('setPalette-green');
   if (setPalette(3, blue) !== true)
      errors.push('setPalette-blue');
   if (getPalette(1) !== red)
      errors.push('getPalette-red');
   if (getPalette(99) !== null)
      errors.push('getPalette-invalid');
   if (applyPaletteSwap(1, 2) !== true)
      errors.push('applyPaletteSwap');
   if (applyPaletteSwap(99, 2) !== false)
      errors.push('applyPaletteSwap-invalid');
   clearPaletteSwap();

   const caps = getBackendCapabilities();
   if (caps.paletteSwap !== true)
      errors.push('caps.paletteSwap');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 18, 255));

   clearPaletteSwap();
   rect(24, 48, 92, 64, getPalette(1), true);

   applyPaletteSwap(1, 2);
   rect(144, 48, 92, 64, getPalette(1), true);
   clearPaletteSwap();

   rect(264, 48, 92, 64, getPalette(3), true);
   rect(24, 128, 332, 22, getPalette(2), true);

   print('69 PALETTE SWAP', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
