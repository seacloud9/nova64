// Conformance cart 536: drawTriangle, drawGlowText, drawGlowTextCentered,
//                        drawPulsingText, tristrip.

let errors = [];
let t = 0;

export function init() {
   const needed = ['drawTriangle', 'drawGlowText', 'drawGlowTextCentered',
                   'drawPulsingText', 'tristrip'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) { t += dt; }

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('536 TEXT SHAPES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // drawTriangle — filled
   drawTriangle(60, 100, 120, 30, 180, 100, rgba8(80, 200, 255, 220), true);
   // drawTriangle — outline
   drawTriangle(220, 100, 280, 30, 340, 100, rgba8(255, 200, 60, 255), false);

   // tristrip — 4-point quad (two triangles)
   tristrip([{x:380,y:30},{x:460,y:30},{x:380,y:100},{x:460,y:100}],
            rgba8(200, 80, 255, 200));

   // drawGlowText
   drawGlowText('NOVA64', 20, 130, rgba8(255, 255, 255, 255), rgba8(80, 160, 255, 120));

   // drawGlowTextCentered
   drawGlowTextCentered('CENTERED GLOW', 320, 155,
                        rgba8(255, 220, 60, 255), rgba8(200, 100, 0, 100));

   // drawPulsingText — two with different frequencies
   drawPulsingText('PULSE A', 160, 180, rgba8(255, 100, 100, 255), t, 2, 80);
   drawPulsingText('PULSE B', 400, 180, rgba8(100, 255, 100, 255), t, 5, 40);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
