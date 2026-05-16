// Conformance cart 359: colorFade, drawTextBox, drawArrowCurved.

let errors = [];

export function init() {
   if (typeof colorFade       !== 'function') { errors.push('colorFade-missing');       return; }
   if (typeof drawTextBox     !== 'function') { errors.push('drawTextBox-missing');     return; }
   if (typeof drawArrowCurved !== 'function') { errors.push('drawArrowCurved-missing'); return; }

   // colorFade: t=1 should give black (r=0)
   const faded = colorFade(rgba8(255, 200, 100, 255), 1.0);
   const fr = (faded >>> 24) & 0xFF;
   if (fr > 0) errors.push('colorFade-full:' + fr);

   // colorFade: t=0 should preserve
   const same = colorFade(rgba8(200, 100, 50, 255), 0.0);
   const sr = (same >>> 24) & 0xFF;
   if (sr < 190) errors.push('colorFade-zero:' + sr);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('359 FADE TEXTBOX ARROW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // colorFade gradient strip
   const base = rgba8(255, 100, 200, 255);
   for (let i = 0; i < 20; i++) {
      rectfill(20 + i * 28, 40, 46 + i * 28, 80, colorFade(base, i / 19));
   }
   print('colorFade 0..1', 20, 85, rgba8(160, 160, 200, 200));

   // drawTextBox frames
   drawTextBox(20,  110, 120, 20, 'PLAYER 1',  rgba8(255, 220, 80, 255),  rgba8(20, 20, 60, 255));
   drawTextBox(20,  140, 120, 20, 'SCORE',     rgba8(100, 255, 160, 255), rgba8(10, 40, 20, 255));
   drawTextBox(20,  170, 120, 20, 'LEVEL 5',   rgba8(100, 180, 255, 255), rgba8(10, 20, 50, 255));
   drawTextBox(160, 110, 100, 60, 'DIALOG BOX',rgba8(200, 200, 200, 255), rgba8(30, 30, 50, 255));

   // Curved arrows connecting boxes
   drawArrowCurved(140, 120, 160, 120, -20, rgba8(255, 200, 80, 200));
   drawArrowCurved(140, 150, 160, 140,  20, rgba8(80, 255, 160, 200));
   drawArrowCurved(140, 180, 160, 165,  25, rgba8(80, 160, 255, 200));

   // More curved arrows in a scene
   drawArrowCurved(300, 120, 500, 200, -60, rgba8(255, 100, 60, 255));
   drawArrowCurved(500, 200, 350, 300,  50, rgba8(100, 200, 255, 255));
   drawArrowCurved(350, 300, 550, 300, -30, rgba8(180, 255, 100, 255));

   // Color fade legend circles
   for (let i = 0; i < 8; i++) {
      const col = colorFade(rgba8(60, 200, 255, 255), i / 7);
      circfill(320 + i * 40, 120, 14, col);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
