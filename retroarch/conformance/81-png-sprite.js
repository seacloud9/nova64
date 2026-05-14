// Conformance cart 81: PNG asset decode
// spr() and createTexture() must accept .png package assets.
// A 4x4 RGBA PNG (red top-left, blue bottom-right) is bundled in the package.

let texHandle = 0;
let sprOk = false;

export function init() {
   // createTexture from PNG — handle must be non-zero if asset present
   texHandle = createTexture('sprites/dot.png');
   // spr() from PNG — call succeeds without throwing
   sprOk = spr('sprites/dot.png', 10, 10, 4, 4);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(20, 15, 30, 255));
   print('81 PNG SPRITE', 4, 4, rgba8(255, 200, 80, 255));
   print('tex=' + texHandle, 4, 14, rgba8(200, 200, 200, 255));
   print('spr=' + sprOk, 4, 24, rgba8(200, 200, 200, 255));
   // Draw the PNG sprite large to give visible pixels
   spr('sprites/dot.png', 60, 40, 4, 4);
   spr('sprites/dot.png', 120, 40, 4, 4);
}
