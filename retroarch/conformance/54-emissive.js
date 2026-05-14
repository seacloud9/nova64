// Conformance cart 54: mesh emissive API.
// Tests setMeshEmissive() and that emissiveColor + emissiveIntensity
// round-trip correctly through getMesh().

let errors = [];
let cube = 0;

export function init() {
   if (typeof setMeshEmissive !== 'function')
      errors.push('setMeshEmissive-missing');
   if (typeof nova64.scene.setMeshEmissive !== 'function')
      errors.push('nova64.scene.setMeshEmissive-missing');

   const caps = getBackendCapabilities();
   if (!caps.emissive)
      errors.push('caps.emissive-false');

   cube = createCube(rgba8(40, 40, 80, 255), [0, 0, -4]);
   if (!cube) { errors.push('createCube-falsy'); return; }

   // Default emissive should be 0 / 0
   const m0 = getMesh(cube);
   if (!m0) { errors.push('getMesh-null'); return; }
   if (typeof m0.emissiveColor !== 'number')
      errors.push('emissiveColor-not-number');
   if (typeof m0.emissiveIntensity !== 'number')
      errors.push('emissiveIntensity-not-number');

   // Set emissive to red at intensity 2.0
   const red = rgba8(255, 0, 0, 255);
   setMeshEmissive(cube, red, 2.0);
   const m = getMesh(cube);
   if (!m) { errors.push('getMesh-null-after-set'); return; }
   if (m.emissiveColor !== red) errors.push('emissiveColor:' + m.emissiveColor);
   if (Math.abs(m.emissiveIntensity - 2.0) > 0.001) errors.push('emissiveIntensity:' + m.emissiveIntensity);

   // Clamp intensity to [0, 4]
   setMeshEmissive(cube, red, 10.0);
   const mc = getMesh(cube);
   if (!mc || mc.emissiveIntensity > 4.0) errors.push('intensity-clamp-high:' + (mc && mc.emissiveIntensity));

   setMeshEmissive(cube, red, -1.0);
   const mc2 = getMesh(cube);
   if (!mc2 || mc2.emissiveIntensity < 0.0) errors.push('intensity-clamp-low:' + (mc2 && mc2.emissiveIntensity));

   // nova64.scene namespace round-trip
   const blue = rgba8(0, 80, 255, 255);
   nova64.scene.setMeshEmissive(cube, blue, 1.5);
   const m2 = getMesh(cube);
   if (!m2 || m2.emissiveColor !== blue)
      errors.push('nova64.scene.setMeshEmissive-color:' + (m2 && m2.emissiveColor));
   if (!m2 || Math.abs(m2.emissiveIntensity - 1.5) > 0.001)
      errors.push('nova64.scene.setMeshEmissive-intensity:' + (m2 && m2.emissiveIntensity));

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(10, 10, 20, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 14, 255));
   print('54 EMISSIVE', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
