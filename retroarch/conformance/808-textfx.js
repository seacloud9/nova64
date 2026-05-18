// Conformance cart 808: textfx — printGradient, printWave, printFlash,
//   printShake, printRainbow

export function draw() {
   cls(rgba8(6, 8, 18, 255));

   printGradient(40, 50, 'GRADIENT TEXT', rgba8(80, 200, 255, 255), rgba8(180, 80, 255, 255));

   printWave(40, 80, 'WAVE TEXT DEMO', rgba8(80, 255, 120, 255), 4.0, 0.7, 1.2);

   printFlash(40, 110, 'FLASH TEXT', rgba8(255, 220, 60, 255), 1.5, 3.0);

   printShake(40, 140, 'SHAKE TEXT', rgba8(255, 100, 80, 255), 2.0, 1.5);

   printRainbow(40, 170, 'RAINBOW TEXT', 0.5);

   printBold('808 TEXTFX', 4, 4, rgba8(200, 220, 255, 255));
   print('gradient wave flash shake rainbow', 4, 14, rgba8(80, 255, 120, 180));
}
