// Conformance cart 1103: createAdvancedCube opacity/transparent options.
// Verifies the web-style options object reaches the native mesh state.

let errors = [];
let cube = 0;

export function init() {
   if (!nova64 || !nova64.scene || typeof nova64.scene.createAdvancedCube !== 'function')
      errors.push('createAdvancedCube-missing');
   if (typeof setMeshTransparent !== 'function')
      errors.push('setMeshTransparent-missing');

   cube = nova64.scene.createAdvancedCube(1.4, {
      color: rgba8(80, 190, 255, 255),
      emissive: rgba8(20, 70, 120, 255),
      emissiveIntensity: 0.75,
      opacity: 0.42,
      transparent: true
   }, [0, 0, -4]);

   const mesh = getMesh(cube);
   if (!mesh) {
      errors.push('mesh-null');
      return;
   }
   if (Math.abs(mesh.opacity - 0.42) > 0.001)
      errors.push('opacity:' + mesh.opacity);
   if (mesh.transparent !== true)
      errors.push('transparent:' + mesh.transparent);
   if (mesh.emissiveIntensity < 0.74 || mesh.emissiveIntensity > 0.76)
      errors.push('emissiveIntensity:' + mesh.emissiveIntensity);

   const caps = getBackendCapabilities();
   if (!caps.meshTransparency)
      errors.push('caps.meshTransparency-false');

   setCameraPosition(0, 0.7, 3.5);
   setCameraTarget(0, 0, -4);
   setAmbientLight(rgba8(120, 130, 150, 255), 1.0);
   setLightDirection(-0.4, -0.8, -0.25);
}

export function update(dt) {
   if (cube)
      rotateMesh(cube, 0.0, dt * 0.6, 0.0);
}

export function draw() {
   cls(rgba8(5, 8, 16, 255));
   print('1103 ADV CUBE ALPHA', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
