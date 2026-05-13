// Conformance cart 32: sprite-sheet helpers.
// Package contains sprites/sheet.rgba (4 frames of 4x4 RGBA) plus
// sprites/sheet.json with image dimensions and named regions.

let errors = [];
let sheet = -1;

export function init() {
   if (typeof createSpriteSheet !== 'function') throw new Error('createSpriteSheet missing');
   if (typeof sprFrame !== 'function') throw new Error('sprFrame missing');
   if (typeof sprNamed !== 'function') throw new Error('sprNamed missing');

   if (!nova64.assets.has('sprites/sheet.rgba')) errors.push('sheet asset missing');
   if (!nova64.assets.has('sprites/sheet.json')) errors.push('atlas asset missing');

   sheet = createSpriteSheet('sprites/sheet.rgba', 4, 4);
   if (sheet < 0) errors.push('createSpriteSheet failed');
}

export function update() {}

export function draw() {
   cls(rgba8(8, 12, 22, 255));
   print('32 SPRITESHEET', 4, 4, rgba8(255, 220, 80, 255));

   if (errors.length === 0) {
      const a = sprFrame(sheet, 0, 8, 24);
      const b = nova64.sprites.sprFrame(sheet, 1, 18, 24);
      const c = sprFrame(sheet, 2, 28, 24);
      const d = nova64.sprites.sprNamed(sheet, 'coin', 42, 24);
      const e = sprNamed(sheet, 'bad-name', 54, 24) === false;
      if (a && b && c && d && e) {
         print('ok', 4, 14, rgba8(80, 255, 120, 255));
      } else {
         print('FAIL draw', 4, 14, rgba8(255, 60, 60, 255));
      }
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
