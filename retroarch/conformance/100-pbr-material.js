// Conformance cart 100: PBR material — roughness, metalness, blend mode
let ok = false;
export function init() {
   const cube = createCube(1, rgba8(200, 100, 50, 255), [0, 0, -3]);
   setMeshRoughness(cube, 0.8);
   setMeshMetalness(cube, 0.3);
   setMeshBlend(cube, 'additive');
   const m = getMesh(cube);
   if (Math.abs(m.roughness - 0.8) > 0.001) throw new Error('roughness mismatch: ' + m.roughness);
   if (Math.abs(m.metalness - 0.3) > 0.001) throw new Error('metalness mismatch: ' + m.metalness);
   if (m.blendMode !== 'additive') throw new Error('blendMode mismatch: ' + m.blendMode);
   // Reset to opaque
   setMeshBlend(cube, 'opaque');
   if (getMesh(cube).blendMode !== 'opaque') throw new Error('opaque reset failed');
   ok = true;
}
export function update(dt) {}
export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('100 PBR MATERIAL', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
