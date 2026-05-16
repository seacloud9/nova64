// Conformance cart 251: screenGlow(radius, intensity).

let errors = [];

export function init() {
   if (typeof screenGlow !== 'function') { errors.push('screenGlow-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 8, 255));
   print('251 SCREEN GLOW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw bright objects on dark background
   circfill(160, 180, 20, rgba8(255, 220, 80, 255));
   circfill(320, 180, 15, rgba8(80, 200, 255, 255));
   circfill(480, 180, 18, rgba8(255, 80, 180, 255));

   // Some lines
   line(100, 100, 220, 260, rgba8(200, 255, 100, 220));
   line(580, 100, 420, 260, rgba8(100, 200, 255, 220));

   // Apply glow with different strengths
   setClip(0, 60, 213, 300);
   screenGlow(4, 0.6);
   clearClip();

   setClip(213, 60, 214, 300);
   screenGlow(8, 1.2);
   clearClip();

   setClip(427, 60, 213, 300);
   screenGlow(3, 0.4);
   clearClip();

   print('glow 0.6', 60,  350, rgba8(140, 180, 220, 255));
   print('glow 1.2', 260, 350, rgba8(140, 180, 220, 255));
   print('glow 0.4', 460, 350, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
