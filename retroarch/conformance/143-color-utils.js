// Conformance cart 143: colorBrighter / colorDarker / colorMix.

let errors = [];

export function init() {
   if (typeof colorBrighter !== 'function') { errors.push('colorBrighter-missing'); return; }
   if (typeof colorDarker   !== 'function') { errors.push('colorDarker-missing'); return; }
   if (typeof colorMix      !== 'function') { errors.push('colorMix-missing'); return; }

   const base = rgba8(100, 100, 100, 255);

   // colorBrighter should increase R channel
   const brighter = colorBrighter(base, 50);
   if (colorR(brighter) <= 100) errors.push('brighter-R');

   // colorDarker should decrease R channel
   const darker = colorDarker(base, 50);
   if (colorR(darker) >= 100) errors.push('darker-R');

   // colorBrighter(white) clamps at 255
   const white = colorBrighter(rgba8(255, 255, 255, 255), 100);
   if (colorR(white) !== 255) errors.push('brighter-clamp');

   // colorDarker(black) clamps at 0
   const black = colorDarker(rgba8(0, 0, 0, 255), 100);
   if (colorR(black) !== 0) errors.push('darker-clamp');

   // colorMix at t=0 → a, t=1 → b
   const a = rgba8(200, 0, 0, 255);
   const b = rgba8(0, 200, 0, 255);
   const mid = colorMix(a, b, 0.5);
   if (colorR(mid) < 80 || colorR(mid) > 120) errors.push('mix-R');
   if (colorG(mid) < 80 || colorG(mid) > 120) errors.push('mix-G');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('143 COLOR UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(100, 100, 200, 255);
   for (let i = 0; i < 9; i++) {
      const amt = (i - 4) * 30;
      const c = amt >= 0 ? colorBrighter(base, amt) : colorDarker(base, -amt);
      rectfill(40 + i * 26, 60, 64 + i * 26, 120, c);
   }
   printCentered('darker  →  brighter', 160, 130, rgba8(180, 200, 255, 255));

   const ca = rgba8(220, 60, 60, 255);
   const cb = rgba8(60, 60, 220, 255);
   for (let i = 0; i <= 8; i++) {
      const c = colorMix(ca, cb, i / 8);
      rectfill(40 + i * 26, 145, 64 + i * 26, 185, c);
   }
   printCentered('colorMix red→blue', 160, 195, rgba8(180, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
