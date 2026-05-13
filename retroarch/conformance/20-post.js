// Conformance cart 20: post-processing API
// Verifies nova64.post.setCRT / setVignette / setPixelate / getState / clear
// compile and run without throwing. In software/headless mode the FBO is not
// created, but the state object must still return correct values.

export function init() {
   // Enable effects
   nova64.post.setCRT(true);
   nova64.post.setVignette(0.6);
   nova64.post.setPixelate(4);

   const s = nova64.post.getState();
   if (!s.crt) throw new Error('crt expected true');
   if (Math.abs(s.vignette - 0.6) > 0.01) throw new Error('vignette mismatch');
   if (s.pixelate !== 4) throw new Error('pixelate mismatch');
   if (!s.active) throw new Error('active expected true');

   // Round-trip clear
   nova64.post.clear();
   const s2 = nova64.post.getState();
   if (s2.crt) throw new Error('crt should be cleared');
   if (s2.vignette !== 0) throw new Error('vignette should be 0 after clear');
   if (s2.active) throw new Error('active should be false after clear');

   // Re-enable for visual frame output
   nova64.post.setCRT(true);
   nova64.post.setVignette(0.4);

   const cube = createCube(1, rgba8(60, 180, 255, 255), [0, 0, -3]);
   setRotation(cube, 0.3, 0.5, 0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   const s = nova64.post.getState();
   print('20 POST', 4, 4, rgba8(255, 200, 100, 255));
   print('crt=' + s.crt, 4, 14, rgba8(180, 255, 180, 255));
   print('vignette=' + s.vignette.toFixed(2), 4, 24, rgba8(180, 255, 180, 255));
   print('fbo=' + s.fboReady, 4, 34, rgba8(180, 180, 255, 255));
}
