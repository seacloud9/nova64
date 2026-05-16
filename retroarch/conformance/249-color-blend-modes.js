// Conformance cart 249: colorMultiply, colorScreen, colorOverlay.

let errors = [];

export function init() {
   if (typeof colorMultiply !== 'function') { errors.push('colorMultiply-missing'); return; }
   if (typeof colorScreen   !== 'function') { errors.push('colorScreen-missing');   return; }
   if (typeof colorOverlay  !== 'function') { errors.push('colorOverlay-missing');  return; }

   // multiply: red * white = red
   const rw = colorMultiply(rgba8(200,100,50,255), rgba8(255,255,255,255));
   if (colorR(rw) < 195) errors.push('mult-R: ' + colorR(rw));

   // multiply: any * black = black
   const rb = colorMultiply(rgba8(200,100,50,255), rgba8(0,0,0,255));
   if (colorR(rb) > 5) errors.push('mult-black-R: ' + colorR(rb));

   // screen: black screen anything = anything
   const sb = colorScreen(rgba8(0,0,0,255), rgba8(100,150,200,255));
   if (Math.abs(colorR(sb) - 100) > 2) errors.push('screen-R: ' + colorR(sb));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('249 BLEND MODES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(180, 80, 200, 255);
   const blend = rgba8(80, 200, 120, 255);

   // Show three blend modes across horizontal strips
   for (let x = 0; x < 180; x++) {
      const t = x / 179;
      const b2 = rgba8((t*255)|0, ((1-t)*200)|0, 100, 255);
      for (let y = 0; y < 60; y++) pset(20+x, 50+y,  colorMultiply(base, b2));
      for (let y = 0; y < 60; y++) pset(20+x, 120+y, colorScreen(base, b2));
      for (let y = 0; y < 60; y++) pset(20+x, 190+y, colorOverlay(base, b2));
   }

   print('multiply', 210, 75,  rgba8(140, 180, 220, 255));
   print('screen',   210, 145, rgba8(140, 180, 220, 255));
   print('overlay',  210, 215, rgba8(140, 180, 220, 255));

   // Also show blend of two solid colors
   rectfill(420, 50,  560, 100, base);
   rectfill(420, 110, 560, 160, blend);
   rectfill(420, 170, 560, 220, colorMultiply(base,blend));
   rectfill(420, 230, 560, 280, colorScreen(base,blend));
   rectfill(420, 290, 560, 340, colorOverlay(base,blend));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
