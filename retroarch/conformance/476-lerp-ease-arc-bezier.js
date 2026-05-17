// Conformance cart 476: lerpColor, ease, arc, bezier.

let errors = [];

export function init() {
   const needed = ['lerpColor', 'ease', 'arc', 'bezier'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 20, 255));
   print('476 LERP EASE ARC BEZIER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // lerpColor strips
   const ca = rgba8(255, 60, 60, 255);
   const cb = rgba8(60, 60, 255, 255);
   for (let i = 0; i < 20; i++) {
      const c = lerpColor(ca, cb, i / 19);
      rectfill(20 + i * 14, 24, 32 + i * 14, 44, c);
   }

   // ease function visual comparison
   const eTypes = ['linear', 'quadIn', 'quadOut', 'quadInOut', 'cubicIn', 'cubicOut', 'sineIn', 'sineOut', 'bounceOut', 'elasticOut'];
   for (let ei = 0; ei < eTypes.length; ei++) {
      for (let xi = 0; xi < 50; xi++) {
         const t = xi / 49;
         const v = ease(t, eTypes[ei]);
         const y = 180 - Math.floor(v * 60);
         pset(20 + ei * 58 + xi, y, rgba8(100 + ei * 14, 200 - ei * 10, 255, 200));
      }
   }

   // arc — various arcs
   arc(160, 270, 55, 35, 0, Math.PI * 2, rgba8(100, 200, 255, 255));
   arc(160, 270, 40, 40, 0, Math.PI * 1.5, rgba8(255, 180, 60, 255));
   arc(160, 270, 25, 25, Math.PI * 0.25, Math.PI * 1.75, rgba8(80, 255, 120, 255));

   // bezier — cubic bezier paths
   bezier(300, 330, 310, 200, 470, 200, 480, 330, rgba8(200, 100, 255, 255));
   bezier(300, 310, 350, 250, 430, 350, 480, 310, rgba8(255, 200, 80, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
