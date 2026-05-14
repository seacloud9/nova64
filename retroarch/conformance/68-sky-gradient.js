// Conformance cart 68: software sky gradient.
// setSkyColor(top, bottom) should render a visible vertical background gradient
// behind the 3D scene and expose round-trippable state.

let errors = [];
let cube = 0;

export function init() {
   if (typeof setSkyColor !== 'function')
      throw new Error('setSkyColor() binding missing');
   if (typeof getSkyColor !== 'function')
      throw new Error('getSkyColor() binding missing');
   if (typeof clearSkyColor !== 'function')
      throw new Error('clearSkyColor() binding missing');

   if (typeof nova64.scene.setSkyColor !== 'function')
      errors.push('nova64.scene.setSkyColor-missing');
   if (typeof nova64.scene.getSkyColor !== 'function')
      errors.push('nova64.scene.getSkyColor-missing');

   clearScene();
   setSkyColor(rgba8(24, 60, 150, 255), rgba8(230, 140, 60, 255));

   const sky = getSkyColor();
   if (!sky || sky.enabled !== true)
      errors.push('sky-enabled');
   if (sky.top !== rgba8(24, 60, 150, 255))
      errors.push('sky-top');
   if (sky.bottom !== rgba8(230, 140, 60, 255))
      errors.push('sky-bottom');

   const caps = getBackendCapabilities();
   if (caps.skyGradient !== true)
      errors.push('caps.skyGradient');

   cube = createCube(1.6, rgba8(80, 210, 220, 255), [0, 0, -4]);
   setRotation(cube, 0.2, 0.6, 0.0);
   setMeshEmissive(cube, rgba8(20, 80, 90, 255), 0.35);
   setCameraPosition(0, 1.2, 5.5);
   setCameraTarget(0, 0, -4);
   setAmbientLight(rgba8(70, 90, 140, 255), 1.0);
   setDirectionalLight([-0.4, -0.8, -0.2], rgba8(255, 235, 200, 255), 1.2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(0, 0, 0, 255));
   print('68 SKY GRADIENT', 4, 4, rgba8(255, 235, 180, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
