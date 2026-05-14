// Conformance cart 72: draw state/query helpers.
// Covers screen size, pget, color channel helpers, colorLerp, getClip,
// resetPalette, and namespace bindings.

let errors = [];

function expect(name, ok) {
   if (!ok) errors.push(name);
}

export function init() {
   [
      'screenWidth', 'screenHeight', 'pget', 'colorLerp',
      'colorR', 'colorG', 'colorB', 'colorA', 'getClip', 'resetPalette',
   ].forEach((name) => {
      if (typeof globalThis[name] !== 'function')
         throw new Error(name + '() binding missing');
   });

   expect('nova64.draw.pget', typeof nova64.draw.pget === 'function');
   expect('nova64.draw.getClip', typeof nova64.draw.getClip === 'function');
   expect('screenWidth', screenWidth() === 640);
   expect('screenHeight', screenHeight() === 360);

   const c = rgba8(12, 34, 56, 78);
   expect('colorR', colorR(c) === 12);
   expect('colorG', colorG(c) === 34);
   expect('colorB', colorB(c) === 56);
   expect('colorA', colorA(c) === 78);
   expect('colorLerp', colorR(colorLerp(rgba8(0, 0, 0, 255), rgba8(100, 0, 0, 255), 0.5)) === 50);

   clearClip();
   let clip = getClip();
   expect('clip-clear', clip && clip.active === false);
   setClip(10, 20, 30, 40);
   clip = getClip();
   expect('clip-state', clip && clip.active === true && clip.x === 10 && clip.y === 20 && clip.w === 30 && clip.h === 40);
   clearClip();

   setPalette(1, rgba8(1, 2, 3, 255));
   resetPalette();
   expect('resetPalette', getPalette(1) === 0x1D2B53FF);

   const caps = getBackendCapabilities();
   expect('caps.drawStateQueries', caps.drawStateQueries === true);
   expect('caps.colorChannels', caps.colorChannels === true);
}

export function update(dt) {}

export function draw() {
   clsGradient(rgba8(12, 18, 38, 255), rgba8(40, 84, 130, 255), true);
   pset(20, 42, rgba8(200, 220, 80, 255));
   const sampled = pget(20, 42);
   if (sampled !== rgba8(200, 220, 80, 255))
      errors.push('pget-sample');

   rectfill(42, 72, 160, 72, colorLerp(rgba8(240, 60, 80, 255), rgba8(60, 220, 240, 255), 0.35));
   setClip(260, 72, 180, 72);
   rectfill(230, 42, 260, 132, rgba8(240, 210, 70, 255));
   clearClip();

   print('72 DRAW STATE', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
