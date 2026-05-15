// Conformance cart 105: z-sorted sprite draw order.
// spr(path, dx, dy, ..., z) defers sprites to a z-sorted queue flushed
// after draw() returns. Lower z = rendered first (further back).
// Package provides sprites/red.rgba (red 4x4) and sprites/blue.rgba (blue 4x4).

let errors = [];

export function init() {
   if (typeof spr !== 'function')
      errors.push('spr-missing');

   // spr without z should still work (backward compat)
   // spr with z should be accepted without throwing
}

export function update(dt) {}

export function draw() {
   cls(rgba8(20, 20, 30, 255));
   print('105 Z-SORT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background sprite (z=0): drawn first = behind
   spr('sprites/red.rgba',  60, 40, 4, 4, 0, 0, 4, 4, 0);
   // Foreground sprite (z=2): drawn last = on top
   spr('sprites/blue.rgba', 62, 42, 4, 4, 0, 0, 4, 4, 2);
   // Mid sprite (z=1): drawn between
   spr('sprites/red.rgba',  64, 44, 4, 4, 0, 0, 4, 4, 1);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
