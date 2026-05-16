// Conformance cart 430: screenVHS, screenEcho, colorCycle.

let errors = [];

export function init() {
   if (typeof screenVHS   !== 'function') { errors.push('screenVHS-missing');   return; }
   if (typeof screenEcho  !== 'function') { errors.push('screenEcho-missing');  return; }
   if (typeof colorCycle  !== 'function') { errors.push('colorCycle-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 18, 255));
   print('430 VHS ECHO CYCLE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Color cycle strip
   const base = rgba8(220, 60, 60, 255);
   for (let i = 0; i < 12; i++) {
      const col = colorCycle(base, i * 30);
      rectfill(20 + i * 48, 30, 65 + i * 48, 70, col);
   }

   // Scene for VHS
   for (let i = 0; i < 5; i++) {
      circfill(60 + i * 100, 180, 35 + i * 5, rgba8(80 + i * 30, 100, 200 - i * 30, 220));
   }
   rectfill(20, 240, 600, 280, rgba8(60, 120, 80, 200));

   // VHS distortion on left half
   setClip(20, 30, 310, 290);
   screenVHS(0.7);
   clearClip();

   // Echo on right half
   setClip(320, 30, 610, 290);
   screenEcho(5, 3, 0.35);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
