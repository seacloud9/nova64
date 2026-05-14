// Conformance cart 44: capsule primitive.
// Tests createCapsule(), getMesh().type, and visual rendering.

let cap = 0;
let angle = 0;
let errors = [];

export function init() {
   if (typeof createCapsule !== 'function')
      throw new Error('createCapsule() binding missing');
   if (typeof nova64.scene.createCapsule !== 'function')
      errors.push('nova64.scene.createCapsule-missing');

   cap = createCapsule(0.5, 2.0, rgba8(180, 120, 200, 255), [0, 0, -4]);
   if (!cap) errors.push('createCapsule-returned-falsy');

   const mesh = getMesh(cap);
   if (!mesh)              errors.push('getMesh-returned-null');
   else if (mesh.type !== 'capsule')  errors.push('getMesh.type:' + mesh.type);
   else {
      // scale[0] and scale[2] should equal 2*radius = 1.0
      const eps = 0.001;
      if (Math.abs(mesh.scale[0] - 1.0) > eps) errors.push('scale[0]:' + mesh.scale[0]);
      if (Math.abs(mesh.scale[2] - 1.0) > eps) errors.push('scale[2]:' + mesh.scale[2]);
      // scale[1] should equal height = 2.0
      if (Math.abs(mesh.scale[1] - 2.0) > eps) errors.push('scale[1]:' + mesh.scale[1]);
   }

   setCameraPosition(0, 1.2, 5.0);
   setCameraTarget(0, 0, 0);
   setCameraFOV(54);
   setAmbientLight(rgba8(10, 14, 30, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {
   angle += dt;
   setRotation(cap, angle * 0.4, angle * 0.6, 0.0);
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('44 CAPSULE', 4, 4, rgba8(200, 140, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
