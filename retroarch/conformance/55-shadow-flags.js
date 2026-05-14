// Conformance cart 55: shadow flags and flat shading.
// Tests setCastShadow(), setReceiveShadow(), setFlatShading() + getMesh()
// round-trip for castShadow, receiveShadow, and flatShading fields.

let errors = [];
let cube = 0;

export function init() {
   const apis = ['setCastShadow', 'setReceiveShadow', 'setFlatShading'];
   for (const name of apis) {
      if (typeof globalThis[name] !== 'function')
         errors.push(name + '-missing');
   }

   // nova64.scene namespace
   if (typeof nova64.scene.setCastShadow !== 'function')
      errors.push('nova64.scene.setCastShadow-missing');
   if (typeof nova64.scene.setReceiveShadow !== 'function')
      errors.push('nova64.scene.setReceiveShadow-missing');
   if (typeof nova64.scene.setFlatShading !== 'function')
      errors.push('nova64.scene.setFlatShading-missing');

   const caps = getBackendCapabilities();
   if (!caps.meshShadowFlags) errors.push('caps.meshShadowFlags-false');

   cube = createCube(rgba8(200, 180, 140, 255), [0, 0, -4]);
   if (!cube) { errors.push('createCube-falsy'); return; }

   // castShadow round-trip
   setCastShadow(cube, true);
   const m1 = getMesh(cube);
   if (!m1) { errors.push('getMesh-null'); return; }
   if (m1.castShadow !== true) errors.push('castShadow-true:' + m1.castShadow);

   setCastShadow(cube, false);
   const m2 = getMesh(cube);
   if (!m2 || m2.castShadow !== false) errors.push('castShadow-false:' + (m2 && m2.castShadow));

   // receiveShadow round-trip
   setReceiveShadow(cube, true);
   const m3 = getMesh(cube);
   if (!m3 || m3.receiveShadow !== true) errors.push('receiveShadow-true:' + (m3 && m3.receiveShadow));

   setReceiveShadow(cube, false);
   const m4 = getMesh(cube);
   if (!m4 || m4.receiveShadow !== false) errors.push('receiveShadow-false:' + (m4 && m4.receiveShadow));

   // flatShading round-trip
   setFlatShading(cube, true);
   const m5 = getMesh(cube);
   if (!m5 || m5.flatShading !== true) errors.push('flatShading-true:' + (m5 && m5.flatShading));

   setFlatShading(cube, false);
   const m6 = getMesh(cube);
   if (!m6 || m6.flatShading !== false) errors.push('flatShading-false:' + (m6 && m6.flatShading));

   // Enable flat shading for the rendered visual
   setFlatShading(cube, true);

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(50, 50, 70, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   print('55 SHADOW FLAGS', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
