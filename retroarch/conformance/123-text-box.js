// Conformance cart 123: textBox — word-wrapped text.
// textBox(text, x, y [, maxWidth [, color]])

let errors = [];

export function init() {
   if (typeof textBox !== 'function') { errors.push('textBox-missing'); return; }

   // Test: short string fits on one line — pixel at expected position should be non-background
   cls(rgba8(0, 0, 0, 255));
   textBox('Hi', 10, 20, 200, rgba8(255, 255, 255, 255));
   const px = pget(10, 20);
   // 'H' glyph — first column of first row should be set
   if ((px >> 24) & 0xff < 200)
      errors.push('textBox pixel not written at 10,20: ' + ((px >> 24) & 0xff));

   // Multi-word wrap — verify second line is written
   cls(rgba8(0, 0, 0, 255));
   textBox('word1 word2 word3 word4 word5', 10, 30, 60, rgba8(255, 255, 255, 255));
   // Second line starts at y=39 (30+9); check that area is non-empty
   let hasSecondLine = false;
   for (let x = 10; x < 80; x++) {
      if (((pget(x, 39) >> 24) & 0xff) > 100) { hasSecondLine = true; break; }
   }
   if (!hasSecondLine)
      errors.push('textBox did not wrap to second line');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('123 TEXT BOX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   textBox(
      'The quick brown fox jumps over the lazy dog. Nova64 is a fantasy console runtime.',
      20, 50, 240, rgba8(200, 230, 255, 255));

   textBox('Short line.', 20, 160, 200, rgba8(255, 200, 100, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
