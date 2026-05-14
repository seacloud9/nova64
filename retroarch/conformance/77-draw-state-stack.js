// Conformance cart 77: stackable draw state helpers.
// Covers push/pop for clip, camera2D, blend, palette, plus getDrawState.

let errors = [];

function expect(name, ok) {
   if (!ok) errors.push(name);
}

export function init() {
   [
      'pushClip', 'popClip', 'pushCamera2D', 'popCamera2D',
      'pushBlend2D', 'popBlend2D', 'pushPalette', 'popPalette',
      'getDrawState', 'clearDrawState',
   ].forEach((name) => {
      if (typeof globalThis[name] !== 'function')
         throw new Error(name + '() binding missing');
   });

   expect('nova64.draw.getDrawState', typeof nova64.draw.getDrawState === 'function');

   clearDrawState();
   setClip(10, 20, 30, 40);
   expect('pushClip', pushClip() === true);
   setClip(1, 2, 3, 4);
   expect('popClip', popClip() === true);
   let state = getDrawState();
   expect('clip-restore', state.clip.active && state.clip.x === 10 && state.clip.h === 40);

   setCamera2D(7, 8, 1.25, 0.5);
   expect('pushCamera2D', pushCamera2D() === true);
   clearCamera2D();
   expect('popCamera2D', popCamera2D() === true);
   state = getDrawState();
   expect('camera-restore', state.camera2D.x === 7 && Math.abs(state.camera2D.zoom - 1.25) < 0.001);

   setBlend2D('screen');
   expect('pushBlend2D', pushBlend2D() === true);
   setBlend2D('multiply');
   expect('popBlend2D', popBlend2D() === true);
   expect('blend-restore', getBlend2D() === 'screen');

   setPalette(4, rgba8(12, 34, 56, 255));
   expect('pushPalette', pushPalette() === true);
   setPalette(4, rgba8(200, 10, 20, 255));
   expect('popPalette', popPalette() === true);
   expect('palette-restore', getPalette(4) === rgba8(12, 34, 56, 255));

   const caps = getBackendCapabilities();
   expect('caps.drawStateStack', caps.drawStateStack === true);
}

export function update(dt) {}

export function draw() {
   clearDrawState();
   cls(rgba8(10, 12, 22, 255));

   setClip(40, 56, 200, 90);
   pushClip();
   rectfill(0, 30, 320, 160, rgba8(80, 210, 230, 255));
   setClip(320, 56, 200, 90);
   rectfill(260, 30, 320, 160, rgba8(240, 90, 140, 255));
   popClip();
   clearClip();

   pushCamera2D();
   setCamera2D(0, 0, 1.35, -0.28);
   roundRectFill(260, 205, 150, 56, 16, rgba8(230, 220, 80, 255));
   printOutline('STACK', 335, 225, rgba8(30, 30, 40, 255), rgba8(255, 255, 255, 255), 'center');
   popCamera2D();

   pushBlend2D();
   setBlend2D('alpha');
   rectfill(384, 190, 120, 80, rgba8(40, 230, 130, 150));
   popBlend2D();

   print('77 DRAW STATE STACK', 4, 4, rgba8(240, 240, 220, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
