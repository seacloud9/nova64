// Conformance cart 136: btnRepeat(b, delay, rate) — auto-repeat helper.

let errors = [];

export function init() {
   if (typeof btnRepeat !== 'function') { errors.push('btnRepeat-missing'); return; }

   // With no buttons held, should always return false
   const r = btnRepeat('left', 10, 4);
   if (r !== false) errors.push('btnRepeat-no-input-should-be-false');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('136 BTN REPEAT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Visual: show typical auto-repeat parameters
   const x0 = 60, y0 = 60;
   rectfill(x0, y0, x0 + 200, y0 + 80, rgba8(30, 40, 70, 255));
   print('btnRepeat(btn, 15, 4)', x0 + 4, y0 + 8,  rgba8(180, 220, 255, 255));
   print('delay: 15 frames',     x0 + 4, y0 + 22, rgba8(160, 200, 240, 255));
   print('rate:  4 frames',      x0 + 4, y0 + 32, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
