// Conformance cart 367: batch 26 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawStar2', 'fillStar2', 'drawRosette', 'fillRosette',
                   'drawFractalTree', 'screenReflect', 'screenFlipH', 'screenFlipV',
                   'colorFade', 'drawTextBox', 'screenThermal', 'drawArrowCurved'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 16, 255));
   printBold('367 BATCH 26', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Stars
   fillStar2(80,  120, 55, 5, 0.38, rgba8(255, 200, 40, 255));
   fillStar2(200, 115, 50, 7, 0.5,  rgba8(100, 200, 255, 255));
   drawStar2(80,  120, 55, 5, 0.38, rgba8(255, 240, 140, 200));

   // Rosette
   fillRosette(320, 120, 60, 5, rgba8(180, 100, 255, 180));
   drawRosette(320, 120, 60, 5, rgba8(220, 160, 255, 220));

   // Fractal tree
   drawFractalTree(500, 355, 55, Math.PI / 2, 7, rgba8(80, 200, 80, 255));

   // Color fade strip
   const base = rgba8(255, 140, 60, 255);
   for (let i = 0; i < 15; i++) {
      rectfill(20 + i * 28, 240, 46 + i * 28, 270, colorFade(base, i / 14));
   }

   // TextBox UI elements
   drawTextBox(20, 280, 130, 18, 'PLAYER', rgba8(255, 220, 80, 255), rgba8(20, 20, 60, 255));
   drawTextBox(20, 305, 130, 18, 'SCORE',  rgba8(100, 255, 160, 255), rgba8(10, 40, 20, 255));
   drawTextBox(20, 330, 130, 18, 'LEVEL',  rgba8(80, 160, 255, 255), rgba8(10, 20, 50, 255));

   // Curved arrows
   drawArrowCurved(155, 289, 240, 289, -25, rgba8(255, 200, 80, 220));
   drawArrowCurved(155, 314, 240, 314,  20, rgba8(80, 255, 160, 220));
   drawArrowCurved(240, 289, 240, 314,  30, rgba8(100, 180, 255, 180));

   // Thermal panel
   rectfill(250, 245, 450, 355, rgba8(10, 10, 40, 255));
   circfill(310, 300, 30, rgba8(255, 80, 40, 255));
   circfill(390, 300, 25, rgba8(180, 200, 60, 255));
   setClip(250, 245, 200, 110);
   screenThermal();
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
