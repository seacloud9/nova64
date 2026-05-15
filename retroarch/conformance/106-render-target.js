// Conformance cart 106: offscreen render targets.
// createRenderTarget(w,h) -> handle; renderScene(rt) renders scene into rt;
// renderTargetAsTexture(rt) -> texture handle; destroyRenderTarget(rt).
// caps.renderTargets is true on GLES, false on software.

let errors = [];
let rt = 0;
let cube = 0;
let caps;

export function init() {
   caps = getBackendCapabilities();

   if (typeof createRenderTarget !== 'function') errors.push('createRenderTarget-missing');
   if (typeof renderScene !== 'function')        errors.push('renderScene-missing');
   if (typeof renderTargetAsTexture !== 'function') errors.push('renderTargetAsTexture-missing');
   if (typeof destroyRenderTarget !== 'function') errors.push('destroyRenderTarget-missing');
   if (!caps || typeof caps.renderTargets !== 'boolean') errors.push('caps-renderTargets-missing');

   if (errors.length > 0) return;

   cube = createCube();
   setPosition(cube, 0, 0, -3);

   if (caps.renderTargets) {
      rt = createRenderTarget(64, 64);
      if (!rt) errors.push('createRenderTarget-returned-0');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(15, 18, 30, 255));
   print('106 RENDER-TARGET', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   draw3d();

   if (caps.renderTargets && rt) {
      renderScene(rt);
      let tex = renderTargetAsTexture(rt);
      if (!tex) {
         print('FAIL tex=0', 4, 14, rgba8(255, 60, 60, 255));
         return;
      }
      // Display the render-target texture on a second cube
      let display = createCube();
      setPosition(display, 2.5, 0, -4);
      setMeshTexture(display, tex);
      draw3d();
      destroyMesh(display);

      // Calling destroyRenderTarget should not crash
      destroyRenderTarget(rt);
      rt = 0;
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
