// Conformance cart 815: nova64.draw aliases for browser-style text effects.

let errors = [];

export function init() {
   const needed = [
      'drawTriangle',
      'drawGlowText',
      'drawGlowTextCentered',
      'drawPulsingText',
      'tristrip',
      'drawFloatingTexts',
   ];
   for (const f of needed) {
      if (typeof nova64.draw[f] !== 'function')
         errors.push('draw.' + f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('815 DRAW NAMESPACE TEXTFX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   nova64.draw.drawTriangle(56, 108, 112, 40, 168, 108,
      rgba8(80, 200, 255, 210), true);
   nova64.draw.tristrip([
      { x: 224, y: 44 },
      { x: 304, y: 44 },
      { x: 224, y: 108 },
      { x: 304, y: 108 },
   ], rgba8(200, 80, 255, 190));

   nova64.draw.drawGlowText('NOVA64', 52, 146,
      rgba8(255, 255, 255, 255), rgba8(80, 160, 255, 120), 1);
   nova64.draw.drawGlowTextCentered('DRAW NAMESPACE', 320, 176,
      rgba8(255, 220, 60, 255), rgba8(200, 100, 0, 110), 1);
   nova64.draw.drawPulsingText('OPTIONS OBJECT X2', 320, 212,
      rgba8(80, 255, 210, 255), 0.25,
      { frequency: 2, minAlpha: 180, glowColor: rgba8(0, 90, 255, 120), scale: 2 });

   const floating = {
      _texts: [
         { text: '+64', x: 456, y: 76, timer: 0.2, maxTimer: 1.0, color: rgba8(80, 255, 120, 255) },
         { text: 'HIT', x: 500, y: 106, timer: 0.4, maxTimer: 1.0, color: rgba8(255, 120, 220, 255) },
      ],
   };
   nova64.draw.drawFloatingTexts(floating);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
