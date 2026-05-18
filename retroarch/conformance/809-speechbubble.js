// Conformance cart 809: speechbubble — createBubble, setBubbleText,
//   setBubbleTail, setBubbleColors, drawSpeechBubble, destroySpeechBubble

let bubble = 0;

export function init() {
   bubble = createBubble(80, 60, 200, 50);
   setBubbleText(bubble, 'Hello, World!');
   setBubbleTail(bubble, 180, 110, 0);
   setBubbleColors(bubble, rgba8(240, 240, 255, 240), rgba8(80, 80, 200, 255), rgba8(20, 20, 80, 255));
}

export function draw() {
   cls(rgba8(10, 12, 24, 255));

   rectfill(160, 120, 80, 80, rgba8(60, 40, 80, 200));
   print('NPC', 187, 155, rgba8(200, 180, 255, 200));

   drawSpeechBubble(bubble);

   printBold('809 SPEECH BUBBLE', 4, 4, rgba8(200, 220, 255, 255));
   print('createBubble setBubbleText setBubbleTail', 4, 14, rgba8(80, 255, 120, 180));
}
