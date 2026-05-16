// Conformance cart 230: colorAddRGB(c, r, g, b).

let errors = [];

export function init() {
   if (typeof colorAddRGB !== 'function') { errors.push('colorAddRGB-missing'); return; }

   const c = rgba8(100, 100, 100, 255);
   const bright = colorAddRGB(c, 50, 50, 50);
   if (colorR(bright) !== 150) errors.push('add-R: ' + colorR(bright));
   if (colorG(bright) !== 150) errors.push('add-G: ' + colorG(bright));

   // Clamping: adding too much should cap at 255
   const maxed = colorAddRGB(c, 200, 200, 200);
   if (colorR(maxed) !== 255) errors.push('clamp-max: ' + colorR(maxed));

   // Subtraction (negative add): should clamp to 0
   const zeroed = colorAddRGB(c, -200, -200, -200);
   if (colorR(zeroed) !== 0) errors.push('clamp-min: ' + colorR(zeroed));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('230 COLOR ADD RGB', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(120, 120, 120, 255);
   const adds = [-80, -40, 0, 40, 80, 120];
   for (let i = 0; i < adds.length; i++) {
      const x = 20 + i * 96;
      // Add to each channel independently
      rectfill(x, 50, x + 88, 80, colorAddRGB(base, adds[i], 0, 0));
      rectfill(x, 86, x + 88, 116, colorAddRGB(base, 0, adds[i], 0));
      rectfill(x, 122, x + 88, 152, colorAddRGB(base, 0, 0, adds[i]));
      print((adds[i] >= 0 ? '+' : '') + adds[i], x + 20, 158, rgba8(140, 180, 220, 255));
   }
   print('R channel', 8, 60, rgba8(255, 120, 120, 255));
   print('G channel', 8, 96, rgba8(120, 255, 120, 255));
   print('B channel', 8, 132, rgba8(120, 120, 255, 255));

   // Combined adjustments — warm and cool shift
   const neutral = rgba8(160, 160, 160, 255);
   for (let i = 0; i < 8; i++) {
      const v = -40 + i * 12;
      rectfill(20 + i * 72, 190, 84 + i * 72, 220, colorAddRGB(neutral, v, 0, -v));
   }
   print('warm-cool sweep', 8, 228, rgba8(160, 200, 240, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
