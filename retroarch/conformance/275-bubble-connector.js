// Conformance cart 275: drawBubble, fillBubble, drawConnector, drawHatch.

let errors = [];

export function init() {
   if (typeof drawBubble    !== 'function') { errors.push('drawBubble-missing');    return; }
   if (typeof fillBubble    !== 'function') { errors.push('fillBubble-missing');    return; }
   if (typeof drawConnector !== 'function') { errors.push('drawConnector-missing'); return; }
   if (typeof drawHatch     !== 'function') { errors.push('drawHatch-missing');     return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 10, 20, 255));
   print('275 BUBBLE CONNECT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled bubbles
   fillBubble(80,  130, 50, rgba8(60, 140, 220, 200));
   fillBubble(200, 110, 35, rgba8(200, 80, 180, 200));
   fillBubble(290, 140, 25, rgba8(80, 200, 120, 200));
   fillBubble(350, 120, 18, rgba8(255, 200, 60, 200));

   // Outline bubbles
   drawBubble(450, 120, 50, rgba8(180, 220, 255, 200));
   drawBubble(550, 130, 30, rgba8(255, 180, 100, 200));
   drawBubble(600, 110, 20, rgba8(180, 255, 140, 200));

   // Connectors (flowchart-style)
   rectfill(40,  220, 140, 260, rgba8(30, 60, 120, 255));
   rectfill(200, 220, 300, 260, rgba8(30, 80, 80, 255));
   rectfill(360, 220, 460, 260, rgba8(60, 30, 100, 255));
   print('START', 65, 234, rgba8(200, 220, 255, 255));
   print('PROC',  222, 234, rgba8(200, 255, 220, 255));
   print('END',   390, 234, rgba8(220, 200, 255, 255));
   drawConnector(140, 240, 200, 240, rgba8(140, 200, 255, 255));
   drawConnector(300, 240, 360, 240, rgba8(140, 255, 200, 255));

   // Hatching
   drawHatch(20,  290, 120, 60, 45, 8,  rgba8(100, 150, 220, 180));
   drawHatch(160, 290, 120, 60, -45, 8, rgba8(220, 120, 100, 180));
   drawHatch(300, 290, 120, 60, 0,   6, rgba8(100, 220, 150, 180));
   drawHatch(440, 290, 120, 60, 90,  6, rgba8(220, 200, 80, 180));

   // colorPinLight test strip
   const base = rgba8(140, 80, 200, 255);
   for (let i = 0; i < 12; i++) {
      const b2 = colorFromHSL(i*30, 0.8, 0.5);
      rectfill(20+i*48, 360, 62+i*48, 355, colorPinLight(base, b2));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
