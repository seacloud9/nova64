// Conformance cart 147: createScrollText / drawScrollText / scrollTextDone / resetScrollText.

let errors = [];
let st = 0;

export function init() {
   if (typeof createScrollText !== 'function') { errors.push('createScrollText-missing'); return; }
   if (typeof drawScrollText   !== 'function') { errors.push('drawScrollText-missing'); return; }

   st = createScrollText('NOVA64 SCROLLING MARQUEE TEXT - ', 80);
   if (!st) { errors.push('create-zero'); return; }

   if (typeof scrollTextDone !== 'function') errors.push('scrollTextDone-missing');
   if (typeof resetScrollText !== 'function') errors.push('resetScrollText-missing');

   // scrollTextX returns a number
   if (typeof scrollTextX(st) !== 'number') errors.push('scrollTextX-type');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('147 SCROLL TEXT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   if (st) {
      rectfill(30, 150, 290, 166, rgba8(20, 30, 60, 255));
      drawScrollText(st, 34, 153, 252, rgba8(200, 240, 100, 255));
      rect(30, 150, 290, 166, rgba8(80, 100, 180, 255));
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
