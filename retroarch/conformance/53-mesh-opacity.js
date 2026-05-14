// Conformance cart 53: mesh opacity API.
// Tests setMeshOpacity() round-trip via getMesh().opacity and that
// opacity=0 removes a mesh from the visibleMeshes count.

let errors = [];
let cube = 0;

export function init() {
   if (typeof setMeshOpacity !== 'function')
      errors.push('setMeshOpacity-missing');
   if (typeof nova64.scene.setMeshOpacity !== 'function')
      errors.push('nova64.scene.setMeshOpacity-missing');

   const caps = getBackendCapabilities();
   if (!caps.meshOpacity)
      errors.push('caps.meshOpacity-false');

   // Create two cubes
   cube = createCube(rgba8(180, 160, 220, 255), [-1.5, 0, -5]);
   const ghost = createCube(rgba8(220, 220, 180, 255), [1.5, 0, -5]);
   if (!cube || !ghost) { errors.push('createCube-falsy'); return; }

   // Opacity round-trip
   setMeshOpacity(cube, 0.6);
   const m = getMesh(cube);
   if (!m) { errors.push('getMesh-null'); return; }
   if (Math.abs(m.opacity - 0.6) > 0.001) errors.push('opacity:' + m.opacity);

   // opacity=0 should exclude from visibleMeshes
   setMeshOpacity(ghost, 0.0);
   const stats = get3DStats();
   // cube is visible (opacity > 0), ghost is not (opacity == 0)
   if (stats.visibleMeshes !== 1) errors.push('visibleMeshes-with-zero-opacity:' + stats.visibleMeshes);

   // Restore ghost to visible
   setMeshOpacity(ghost, 1.0);
   const m2 = getMesh(ghost);
   if (!m2 || Math.abs(m2.opacity - 1.0) > 0.001) errors.push('restore-opacity:' + (m2 && m2.opacity));

   // Clamp to [0, 1]
   setMeshOpacity(cube, 2.0);
   const mc = getMesh(cube);
   if (!mc || mc.opacity > 1.0) errors.push('opacity-clamp-high:' + (mc && mc.opacity));

   setMeshOpacity(cube, -0.5);
   const mc2 = getMesh(cube);
   if (!mc2 || mc2.opacity < 0.0) errors.push('opacity-clamp-low:' + (mc2 && mc2.opacity));

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(50, 50, 70, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   print('53 OPACITY', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
