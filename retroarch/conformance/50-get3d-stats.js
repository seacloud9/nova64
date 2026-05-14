// Conformance cart 50: get3DStats API.
// Tests that get3DStats() returns a valid stats object with correct mesh,
// triangle, visibleMeshes, pointLights, and backend fields.

let errors = [];

export function init() {
   // Structure check before any meshes
   const s0 = get3DStats();
   if (typeof s0 !== 'object' || s0 === null) { errors.push('get3DStats-not-object'); return; }
   if (typeof s0.triangles    !== 'number')   errors.push('triangles-not-number');
   if (typeof s0.drawCalls    !== 'number')   errors.push('drawCalls-not-number');
   if (typeof s0.meshes       !== 'number')   errors.push('meshes-not-number');
   if (typeof s0.visibleMeshes !== 'number')  errors.push('visibleMeshes-not-number');
   if (typeof s0.pointLights  !== 'number')   errors.push('pointLights-not-number');
   if (typeof s0.backend      !== 'string')   errors.push('backend-not-string');
   if (s0.backend.length === 0)               errors.push('backend-empty-string');

   // Create 2 cubes (12 tris each) + 1 sphere (96 tris) = 120 triangles, 3 meshes
   const c1 = createCube(rgba8(200, 100, 100, 255), [-2, 0, -5]);
   const c2 = createCube(rgba8(100, 200, 100, 255), [ 0, 0, -5]);
   const sp = createSphere(rgba8(100, 100, 200, 255), [2, 0, -5]);
   if (!c1 || !c2 || !sp) { errors.push('create-failed'); return; }

   const s1 = get3DStats();
   if (s1.meshes !== 3)        errors.push('meshes:' + s1.meshes);
   if (s1.triangles !== 120)   errors.push('triangles:' + s1.triangles);
   if (s1.visibleMeshes !== 3) errors.push('visibleMeshes:' + s1.visibleMeshes);
   if (s1.pointLights !== 0)   errors.push('pointLights:' + s1.pointLights);

   // Hide c2: visibleMeshes must drop to 2
   setMeshVisible(c2, false);
   const s2 = get3DStats();
   if (s2.visibleMeshes !== 2) errors.push('visible-after-hide:' + s2.visibleMeshes);

   // nova64.scene namespace
   if (typeof nova64.scene.get3DStats !== 'function')
      errors.push('nova64.scene.get3DStats-missing');

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(50, 50, 70, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   print('50 GET3DSTATS', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
