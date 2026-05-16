// Conformance cart 272: colorLighten, colorDarken, colorDifference.

let errors = [];

export function init() {
   if (typeof colorLighten    !== 'function') { errors.push('colorLighten-missing');    return; }
   if (typeof colorDarken     !== 'function') { errors.push('colorDarken-missing');     return; }
   if (typeof colorDifference !== 'function') { errors.push('colorDifference-missing'); return; }

   // lighten(red, blue) → max channels: r=255,g=0,b=255
   const lb = colorLighten(rgba8(255,0,0,255), rgba8(0,0,255,255));
   if (colorR(lb) < 250) errors.push('lighten-R: ' + colorR(lb));
   if (colorB(lb) < 250) errors.push('lighten-B: ' + colorB(lb));

   // darken(white, black) → black
   const dw = colorDarken(rgba8(255,255,255,255), rgba8(0,0,0,255));
   if (colorR(dw) > 5) errors.push('darken-R: ' + colorR(dw));

   // difference(white, white) → black
   const dd = colorDifference(rgba8(200,100,50,255), rgba8(200,100,50,255));
   if (colorR(dd) > 5) errors.push('diff-R: ' + colorR(dd));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('272 LIGHTEN DARKEN', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(120, 60, 200, 255);
   for (let x = 0; x < 200; x++) {
      const t = x / 199;
      const b2 = rgba8((t*255)|0, ((1-t)*200)|0, (t*100)|0, 255);
      for (let y = 0; y < 55; y++) pset(20+x, 50+y,  colorLighten(base, b2));
      for (let y = 0; y < 55; y++) pset(20+x, 115+y, colorDarken(base, b2));
      for (let y = 0; y < 55; y++) pset(20+x, 180+y, colorDifference(base, b2));
   }
   print('lighten',    230, 70,  rgba8(140, 180, 220, 255));
   print('darken',     230, 135, rgba8(140, 180, 220, 255));
   print('difference', 230, 200, rgba8(140, 180, 220, 255));

   // Cross-blend demo
   for (let i = 0; i < 8; i++) {
      const c1 = colorFromHSL(i*45, 0.8, 0.5);
      const c2 = colorFromHSL((i+4)*45, 0.8, 0.5);
      rectfill(20+i*72, 260, 84+i*72, 300, colorLighten(c1,c2));
      rectfill(20+i*72, 305, 84+i*72, 345, colorDarken(c1,c2));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
