// Conformance cart 333: drawMandala, screenHalftone, smoothstep2.

let errors = [];

export function init() {
   if (typeof drawMandala   !== 'function') { errors.push('drawMandala-missing');   return; }
   if (typeof screenHalftone !== 'function') { errors.push('screenHalftone-missing'); return; }
   if (typeof smoothstep2   !== 'function') { errors.push('smoothstep2-missing');   return; }

   // smoothstep2: 0 at edge0, 1 at edge1, smooth in between
   const s0 = smoothstep2(0, 1, 0);
   const s1 = smoothstep2(0, 1, 1);
   const sm = smoothstep2(0, 1, 0.5);
   if (Math.abs(s0) > 0.01) errors.push('smoothstep-0:' + s0);
   if (Math.abs(s1 - 1) > 0.01) errors.push('smoothstep-1:' + s1);
   if (Math.abs(sm - 0.5) > 0.01) errors.push('smoothstep-mid:' + sm);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('333 MANDALA HALFTONE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Mandalas
   drawMandala(120, 190, 80, 8,  rgba8(100, 200, 255, 255));
   drawMandala(310, 190, 70, 6,  rgba8(255, 180, 60,  255));
   drawMandala(480, 190, 75, 12, rgba8(180, 255, 100, 255));

   // smoothstep2 curve visualization
   for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const sv = smoothstep2(0, 1, t);
      pset(20 + i, 340 - (sv * 40) | 0, colorFromHSL(t * 200 + 180, 0.8, 0.6));
   }
   print('smoothstep', 20, 345, rgba8(160, 160, 200, 200));

   // Halftone on a gradient region
   for (let ys = 40; ys < 120; ys++) {
      for (let xv = 340; xv < 600; xv++) {
         const t = (xv - 340) / 260;
         pset(xv, ys, rgba8((t * 255) | 0, (80 + t * 100) | 0, 200, 255));
      }
   }
   setClip(340, 40, 260, 80);
   screenHalftone(7);
   clearClip();
   print('halftone', 345, 125, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
