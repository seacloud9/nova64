// Conformance cart 45: cylinder primitive.
// Tests createCylinder(), getMesh().type, and visual rendering.

let cyl = 0;
let angle = 0;
let errors = [];

export function init() {
   if (typeof createCylinder !== 'function')
      throw new Error('createCylinder() binding missing');
   if (typeof nova64.scene.createCylinder !== 'function')
      errors.push('nova64.scene.createCylinder-missing');

   // radiusTop=0.6, radiusBottom=0.4, height=2.0
   cyl = createCylinder(0.6, 0.4, 2.0, rgba8(100, 200, 150, 255), [0, 0, -4]);
   if (!cyl) errors.push('createCylinder-returned-falsy');

   const mesh = getMesh(cyl);
   if (!mesh)             errors.push('getMesh-returned-null');
   else if (mesh.type !== 'cylinder') errors.push('getMesh.type:' + mesh.type);
   else {
      const eps = 0.001;
      // scale[0] = 2*radiusTop = 1.2
      if (Math.abs(mesh.scale[0] - 1.2) > eps) errors.push('scale[0]:' + mesh.scale[0]);
      // scale[2] = 2*radiusBottom = 0.8
      if (Math.abs(mesh.scale[2] - 0.8) > eps) errors.push('scale[2]:' + mesh.scale[2]);
      // scale[1] = height = 2.0
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
   setRotation(cyl, angle * 0.3, angle * 0.7, 0.1);
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('45 CYLINDER', 4, 4, rgba8(120, 220, 170, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
