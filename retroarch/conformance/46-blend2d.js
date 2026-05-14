// Conformance cart 46: 2D blend modes.
// Tests setBlend2D() and clearBlend2D() API existence, visual output,
// and that clearBlend2D() restores normal compositing.

let errors = [];
let frame = 0;

export function init() {
   if (typeof setBlend2D !== 'function')
      throw new Error('setBlend2D() binding missing');
   if (typeof clearBlend2D !== 'function')
      throw new Error('clearBlend2D() binding missing');
   if (typeof nova64.draw.setBlend2D !== 'function')
      errors.push('nova64.draw.setBlend2D-missing');
   if (typeof nova64.draw.clearBlend2D !== 'function')
      errors.push('nova64.draw.clearBlend2D-missing');

   // Verify all valid mode strings are accepted without throwing
   const modes = ['normal', 'additive', 'multiply', 'screen'];
   for (const m of modes) {
      try {
         setBlend2D(m);
      } catch (e) {
         errors.push('setBlend2D-' + m + '-threw');
      }
   }

   // clearBlend2D should not throw
   try {
      clearBlend2D();
   } catch (e) {
      errors.push('clearBlend2D-threw');
   }
}

export function update(dt) {
   frame++;
}

export function draw() {
   cls(rgba8(10, 12, 20, 255));

   // Draw a dark base layer
   rect(40, 40, 80, 40, rgba8(60, 30, 120, 255));

   // Additive blend: bright rect on top should brighten
   setBlend2D('additive');
   rect(60, 50, 40, 20, rgba8(120, 80, 160, 255));
   clearBlend2D();

   // Multiply blend: dim rect
   setBlend2D('multiply');
   rect(160, 40, 80, 40, rgba8(200, 200, 200, 255));
   clearBlend2D();

   // Screen blend
   setBlend2D('screen');
   rect(260, 40, 80, 40, rgba8(80, 120, 200, 255));
   clearBlend2D();

   // After clearBlend2D, normal drawing should be unaffected
   rect(380, 40, 80, 40, rgba8(255, 200, 60, 255));

   print('46 BLEND2D', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
