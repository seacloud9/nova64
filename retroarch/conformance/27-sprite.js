// Conformance cart 27: spr() blitting from a .nova package asset.
// The package contains a 4x4 RGBA sprite (sprites/dot.rgba) generated
// in run_conformance.sh. spr() draws it to the framebuffer.

let errors = [];

export function init() {
   if (typeof spr !== 'function')
      throw new Error('spr() binding missing');

   // Asset must be accessible via nova64.assets
   if (!nova64.assets.has('sprites/dot.rgba'))
      errors.push('asset-missing');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('27 SPRITE', 4, 4, rgba8(255, 220, 80, 255));

   if (errors.length === 0) {
      // Draw the 4x4 sprite at several positions
      spr('sprites/dot.rgba', 20, 40, 4, 4);
      spr('sprites/dot.rgba', 30, 40, 4, 4);
      spr('sprites/dot.rgba', 40, 40, 4, 4);
      // Draw a single pixel from the sheet (sx=0, sy=0, bw=2, bh=2)
      spr('sprites/dot.rgba', 60, 40, 4, 4, 0, 0, 2, 2);
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
