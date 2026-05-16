// Conformance cart 195: printItalic(text, x, y, color).

let errors = [];

export function init() {
   if (typeof printItalic !== 'function') { errors.push('printItalic-missing'); return; }
   printItalic('', 0, 0, rgba8(255,255,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('195 PRINT ITALIC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   print(     'Normal text here',  8, 40, rgba8(180, 220, 255, 255));
   printItalic('Italic text here', 8, 52, rgba8(255, 220, 80, 255));
   printBold(  'Bold text here',   8, 64, rgba8(200, 255, 180, 255));

   printItalic('NOVA64 SYSTEM',    8,  90, rgba8(255, 160, 100, 255));
   printItalic('Italic: Hello',    8, 104, rgba8(200, 200, 255, 255));
   printItalic('Score: 12345',     8, 118, rgba8(255, 240, 120, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
