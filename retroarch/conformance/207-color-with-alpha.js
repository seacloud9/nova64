// Conformance cart 207: colorWithAlpha(c, a).

let errors = [];

export function init() {
   if (typeof colorWithAlpha !== 'function') { errors.push('colorWithAlpha-missing'); return; }

   const red = rgba8(200, 80, 40, 255);
   const c0  = colorWithAlpha(red, 0);
   const c128 = colorWithAlpha(red, 128);
   const c255 = colorWithAlpha(red, 255);

   if (colorA(c0)   !== 0)   errors.push('alpha-0: ' + colorA(c0));
   if (colorA(c128) !== 128) errors.push('alpha-128: ' + colorA(c128));
   if (colorA(c255) !== 255) errors.push('alpha-255: ' + colorA(c255));
   if (colorR(c128) !== colorR(red)) errors.push('RGB-changed-R');
   if (colorG(c128) !== colorG(red)) errors.push('RGB-changed-G');
   if (colorB(c128) !== colorB(red)) errors.push('RGB-changed-B');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('207 COLOR WITH ALPHA', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(180, 100, 240, 255);
   const alphas = [255, 200, 160, 100, 60, 20, 0];
   for (let i = 0; i < alphas.length; i++) {
      const c = colorWithAlpha(base, alphas[i]);
      rectfill(20 + i * 80, 50, 90 + i * 80, 90, c);
      print('' + alphas[i], 20 + i * 80, 94, rgba8(160, 200, 240, 255));
   }

   const colors = [rgba8(255,60,60,255), rgba8(60,220,60,255), rgba8(60,100,255,255)];
   for (let ci = 0; ci < 3; ci++) {
      for (let ai = 0; ai < 8; ai++) {
         const a = 32 + ai * 28;
         rectfill(20 + ai * 72, 120 + ci * 28, 80 + ai * 72, 144 + ci * 28, colorWithAlpha(colors[ci], a));
      }
   }

   print('alpha channel replacement', 8, 215, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
