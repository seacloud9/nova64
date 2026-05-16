// Conformance cart 233: colorWarm(c,t) and colorCool(c,t).

let errors = [];

export function init() {
   if (typeof colorWarm !== 'function') { errors.push('colorWarm-missing'); return; }
   if (typeof colorCool !== 'function') { errors.push('colorCool-missing'); return; }

   const gray = rgba8(128, 128, 128, 255);
   const warm = colorWarm(gray, 1.0);
   const cool = colorCool(gray, 1.0);
   if (colorR(warm) <= 128) errors.push('warm-R-not-higher');
   if (colorB(warm) >= 128) errors.push('warm-B-not-lower');
   if (colorB(cool) <= 128) errors.push('cool-B-not-higher');
   if (colorR(cool) >= 128) errors.push('cool-R-not-lower');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('233 COLOR WARM/COOL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const amounts = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
   const base = rgba8(160, 140, 120, 255);

   for (let i = 0; i < amounts.length; i++) {
      const x = 20 + i * 84;
      rectfill(x, 50, x + 78, 90, colorWarm(base, amounts[i]));
      rectfill(x, 100, x + 78, 140, colorCool(base, amounts[i]));
      print(toFixed(amounts[i], 2), x + 10, 146, rgba8(140, 180, 220, 255));
   }
   print('warm', 8, 64, rgba8(255, 160, 80, 255));
   print('cool', 8, 114, rgba8(100, 180, 255, 255));

   // Apply to multiple base colors
   const sources = [
      rgba8(200, 160, 100, 255),
      rgba8(100, 180, 140, 255),
      rgba8(140, 120, 200, 255),
   ];
   for (let ci = 0; ci < 3; ci++) {
      for (let i = 0; i < 7; i++) {
         const t = i * 0.25;
         rectfill(20 + i * 84, 190 + ci * 34, 92 + i * 84, 220 + ci * 34,
                  colorWarm(sources[ci], t));
         rectfill(20 + i * 84, 305 + ci * 34, 92 + i * 84, 335 + ci * 34,
                  colorCool(sources[ci], t));
      }
   }
   print('warm', 8, 296, rgba8(255, 160, 80, 255));
   print('cool', 8, 320, rgba8(100, 180, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
