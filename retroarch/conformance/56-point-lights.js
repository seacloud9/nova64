// Conformance cart 56: point light API.
// Tests createPointLight, setPointLightPosition, setPointLightColor, removeLight,
// and get3DStats().pointLights count.

let errors = [];
let lights = [];
let cube = 0;

export function init() {
   if (typeof createPointLight !== 'function')
      throw new Error('createPointLight() binding missing');
   if (typeof setPointLightPosition !== 'function')
      throw new Error('setPointLightPosition() binding missing');
   if (typeof setPointLightColor !== 'function')
      throw new Error('setPointLightColor() binding missing');
   if (typeof removeLight !== 'function')
      throw new Error('removeLight() binding missing');

   // Namespace checks
   if (typeof nova64.light.createPointLight !== 'function')
      errors.push('nova64.light.createPointLight-missing');
   if (typeof nova64.light.setPointLightPosition !== 'function')
      errors.push('nova64.light.setPointLightPosition-missing');
   if (typeof nova64.light.setPointLightColor !== 'function')
      errors.push('nova64.light.setPointLightColor-missing');
   if (typeof nova64.light.removeLight !== 'function')
      errors.push('nova64.light.removeLight-missing');

   // Create three point lights
   const a = createPointLight(rgba8(255, 80, 80, 255), 1.0, 20.0, -3, 2, 0);
   const b = createPointLight(rgba8(80, 255, 80, 255), 1.5, 20.0,  0, 2, 0);
   const c = createPointLight(rgba8(80, 80, 255, 255), 0.8, 20.0,  3, 2, 0);

   if (a <= 0) errors.push('light-a-handle-invalid');
   if (b <= 0) errors.push('light-b-handle-invalid');
   if (c <= 0) errors.push('light-c-handle-invalid');
   if (a === b || b === c || a === c) errors.push('light-handles-not-unique');

   lights = [a, b, c];

   // Count via get3DStats
   const stats = get3DStats();
   if (stats.pointLights !== 3) errors.push('pointLights-count-expected-3-got-' + stats.pointLights);

   // Move and recolor
   setPointLightPosition(a, 0, 5, 0);
   setPointLightColor(a, rgba8(255, 200, 60, 255), 2.0);

   // Remove one — count should drop
   removeLight(b);
   const stats2 = get3DStats();
   if (stats2.pointLights !== 2) errors.push('after-remove-expected-2-got-' + stats2.pointLights);

   // Scene setup for visual
   setCameraPosition(0, 3, 8);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(20, 20, 30, 255));

   cube = createCube(rgba8(200, 200, 200, 255), [0, 0, 0]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 5, 15, 255));
   print('56 POINT LIGHTS', 4, 4, rgba8(255, 200, 60, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
