// Conformance cart 1058: Batch 87 showcase — dialogue scene with speech bubbles.

let bubbles = [];

const CONVOS = [
   { x: 40,  y: 40,  w: 200, h: 40, tx: 140, ty: 80,  side: 0, text: 'Ready for adventure?',   tc: rgba8(10, 10, 40, 255),  bg: rgba8(220, 230, 255, 240) },
   { x: 300, y: 40,  w: 220, h: 40, tx: 410, ty: 80,  side: 0, text: 'Always! Lets go!',         tc: rgba8(40, 10, 10, 255),  bg: rgba8(255, 220, 200, 240) },
   { x: 40,  y: 160, w: 220, h: 40, tx: 150, ty: 160, side: 1, text: 'The dungeon awaits...',   tc: rgba8(10, 30, 10, 255),  bg: rgba8(200, 255, 210, 240) },
   { x: 300, y: 160, w: 200, h: 40, tx: 400, ty: 160, side: 1, text: 'I see torches ahead!',    tc: rgba8(40, 30, 10, 255),  bg: rgba8(255, 240, 180, 240) },
];

export function init() {
   for (let i = 0; i < CONVOS.length; i++) {
      const c = CONVOS[i];
      const b = createBubble(c.x, c.y, c.w, c.h);
      setBubbleText(b, c.text);
      setBubbleTail(b, c.tx, c.ty, c.side);
      setBubbleColors(b, c.bg, rgba8(60, 60, 120, 255), c.tc);
      bubbles.push(b);
   }
}

export function draw() {
   cls(rgba8(8, 10, 20, 255));

   // Characters
   rectfill(100, 85, 60, 70,  rgba8(40, 60, 160, 220));
   print('HERO', 106, 115, rgba8(200, 220, 255, 200));
   rectfill(360, 85, 60, 70,  rgba8(160, 40, 40, 220));
   print('ALLY', 366, 115, rgba8(255, 180, 180, 200));
   rectfill(100, 195, 60, 50, rgba8(40, 100, 40, 200));
   rectfill(360, 195, 60, 50, rgba8(100, 80, 20, 200));

   for (let i = 0; i < bubbles.length; i++)
      drawSpeechBubble(bubbles[i]);

   printBold('1058 BATCH 87', 4, 4, rgba8(200, 220, 255, 200));
   print('speech bubble', 4, 14, rgba8(80, 255, 120, 180));
}
