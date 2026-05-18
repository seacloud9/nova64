// Conformance cart 1047: Batch 86 showcase — text effects title screen.

export function draw() {
   cls(rgba8(6, 6, 18, 255));

   // Title with gradient
   printGradient(140, 50, 'NOVA 64  EDITION', rgba8(80, 220, 255, 255), rgba8(200, 60, 255, 255));

   // Subtitle wave
   printWave(120, 90, 'TEXT EFFECTS SHOWCASE', rgba8(80, 255, 120, 255), 3.0, 0.6, 0.8);

   // Flash warning line
   printFlash(200, 130, 'PRESS START', rgba8(255, 240, 80, 255), 2.0, 2.5);

   // Shake danger text
   printShake(190, 165, 'DANGER ZONE', rgba8(255, 80, 60, 255), 1.0, 1.0);

   // Rainbow credits
   printRainbow(130, 200, 'MADE WITH NOVA64 ENGINE', 0.3);

   // Static info
   print('gradient  wave  flash  shake  rainbow', 70, 240, rgba8(120, 120, 180, 160));

   printBold('1047 BATCH 86', 4, 4, rgba8(200, 220, 255, 200));
   print('text effects', 4, 14, rgba8(80, 255, 120, 180));
}
