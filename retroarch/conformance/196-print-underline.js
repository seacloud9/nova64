// Conformance cart 196: printUnderline(text, x, y, color).

let errors = [];

export function init() {
   if (typeof printUnderline !== 'function') { errors.push('printUnderline-missing'); return; }
   printUnderline('', 0, 0, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('196 PRINT UNDERLINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   print('Normal text', 8, 40, rgba8(180, 220, 255, 255));
   printUnderline('Underlined text', 8, 54, rgba8(255, 220, 80, 255));
   print('Normal again', 8, 68, rgba8(180, 220, 255, 255));
   printUnderline('Menu Item One',  8,  90, rgba8(200, 230, 255, 255));
   printUnderline('Menu Item Two',  8, 104, rgba8(200, 230, 255, 255));
   printUnderline('Selected Item',  8, 118, rgba8(255, 240, 100, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
