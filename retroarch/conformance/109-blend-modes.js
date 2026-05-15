// Conformance cart 109: mesh blend modes visual test.
// setMeshBlend(mesh, 'opaque'|'additive'|'multiply') changes how the mesh
// composites against the scene. Tests that:
//   - additive blend sums pixel values (brighter overlap)
//   - multiply blend darkens overlap
//   - API round-trips via getMesh().blendMode

let errors = [];
let cubes = [];

export function init() {
   if (typeof setMeshBlend !== 'function') {
      errors.push('setMeshBlend-missing');
      return;
   }

   setAmbientLight(rgba8(180, 180, 180, 255), 0.9);
   setLightDirection(-0.4, -1, -0.6);

   // Opaque background reference cube
   const bg = createCube(rgba8(80, 100, 160, 255), [0, 0, -5]);
   setScale(bg, 4, 4, 0.2);

   // Additive cube: red-ish, overlapping bg — should lighten overlap
   const add = createCube(rgba8(200, 80, 80, 255), [-1, 0, -4]);
   setMeshBlend(add, 'additive');
   setMeshOpacity(add, 0.8);
   if (getMesh(add).blendMode !== 'additive')
      errors.push('additive round-trip failed');

   // Multiply cube: dark, overlapping bg — should darken overlap
   const mul = createCube(rgba8(60, 60, 60, 255), [1, 0, -4]);
   setMeshBlend(mul, 'multiply');
   if (getMesh(mul).blendMode !== 'multiply')
      errors.push('multiply round-trip failed');

   // Back to opaque
   const opq = createCube(rgba8(100, 200, 100, 255), [0, -1.5, -4]);
   setMeshBlend(opq, 'opaque');
   if (getMesh(opq).blendMode !== 'opaque')
      errors.push('opaque reset failed');

   cubes = [bg, add, mul, opq];
}

export function update(dt) {}

export function draw() {
   cls(rgba8(15, 15, 25, 255));
   print('109 BLEND MODES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   draw3d();
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
