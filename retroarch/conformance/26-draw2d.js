// Conformance cart 26: extended 2D draw API
// Tests circ, circfill, print text alignment, and textWidth.

let errors = [];

export function init() {
   if (typeof circ !== 'function')      throw new Error('circ missing');
   if (typeof circfill !== 'function')  throw new Error('circfill missing');
   if (typeof textWidth !== 'function') throw new Error('textWidth missing');

   // textWidth should return a positive integer for non-empty text
   const w = textWidth('HELLO');
   if (typeof w !== 'number' || w <= 0) errors.push('textWidth:' + w);

   // textWidth of empty string should be 0
   if (textWidth('') !== 0) errors.push('textWidth-empty');

   // textWidth should scale linearly with length
   const w1 = textWidth('A');
   const w2 = textWidth('AA');
   if (w2 !== w1 * 2 + 1 && w2 <= w1) errors.push('textWidth-scale');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('26 DRAW2D', 4, 4, rgba8(255, 220, 80, 255));

   // Circles
   circ(60, 100, 30, rgba8(80, 160, 255, 255));
   circfill(160, 100, 20, rgba8(255, 100, 60, 255));
   circfill(260, 100, 15, rgba8(80, 255, 120, 255));

   // Print with alignment
   const mid = 320;
   print('LEFT',   mid, 150, rgba8(200, 200, 200, 255), 'left');
   print('CENTER', mid, 162, rgba8(200, 200, 200, 255), 'center');
   print('RIGHT',  mid, 174, rgba8(200, 200, 200, 255), 'right');

   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
