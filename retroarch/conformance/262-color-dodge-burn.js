// Conformance cart 262: colorDodge, colorBurn, colorFromFloats.

let errors = [];

export function init() {
   if (typeof colorDodge      !== 'function') { errors.push('colorDodge-missing');      return; }
   if (typeof colorBurn       !== 'function') { errors.push('colorBurn-missing');        return; }
   if (typeof colorFromFloats !== 'function') { errors.push('colorFromFloats-missing'); return; }

   // dodge: base * white = white (saturates)
   const dw = colorDodge(rgba8(200, 100, 50, 255), rgba8(255, 255, 255, 255));
   if (colorR(dw) < 250) errors.push('dodge-white-R: ' + colorR(dw));

   // burn: base * black = black (burns to 0)
   const bb = colorBurn(rgba8(200, 100, 50, 255), rgba8(0, 0, 0, 255));
   if (colorR(bb) > 5) errors.push('burn-black-R: ' + colorR(bb));

   // colorFromFloats(1,0,0,1) should give max red
   const r = colorFromFloats(1.0, 0.0, 0.0, 1.0);
   if (colorR(r) < 250) errors.push('cff-R: ' + colorR(r));
   if (colorG(r) > 5)   errors.push('cff-G: ' + colorG(r));

   // colorFromFloats(0,0,0,1) should give black
   const blk = colorFromFloats(0, 0, 0, 1);
   if (colorR(blk) > 5) errors.push('cff-blk: ' + colorR(blk));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('262 DODGE BURN FLOATS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const base = rgba8(120, 60, 180, 255);
   // Dodge sweep
   for (let x = 0; x < 200; x++) {
      const t = x / 199;
      const b2 = rgba8((t*255)|0, (t*200)|0, (t*100)|0, 255);
      for (let y = 0; y < 60; y++) pset(20+x, 50+y,  colorDodge(base, b2));
      for (let y = 0; y < 60; y++) pset(20+x, 120+y, colorBurn(base, b2));
   }
   print('dodge', 230, 75,  rgba8(140, 180, 220, 255));
   print('burn',  230, 145, rgba8(140, 180, 220, 255));

   // colorFromFloats rainbow
   for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const c = colorFromFloats(
         Math.sin(t*Math.PI*2)*0.5+0.5,
         Math.sin((t+0.333)*Math.PI*2)*0.5+0.5,
         Math.sin((t+0.667)*Math.PI*2)*0.5+0.5,
         1.0
      );
      rectfill(20+i*48, 210, 62+i*48, 270, c);
   }
   print('colorFromFloats', 20, 278, rgba8(140, 180, 220, 255));

   // Combined: dodge highlights on a gradient
   for (let x = 0; x < 580; x++) {
      const base2 = colorFromFloats(x/580, 0.2, 0.6, 1.0);
      const highlight = colorFromFloats(1.0, 0.9, 0.5, 1.0);
      const t = Math.sin(x/580*Math.PI*3)*0.5+0.5;
      const hc = colorFromFloats(t, t*0.9, t*0.5, 1.0);
      for (let y = 0; y < 50; y++) pset(30+x, 300+y, colorDodge(base2, hc));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
