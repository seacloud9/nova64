// Conformance cart 101: UV transforms — setMeshUVOffset / setMeshUVScale
let ok = false;
export function init() {
   const cube = createCube(1, rgba8(100, 180, 240, 255), [0, 0, -3]);
   setMeshUVOffset(cube, 0.25, 0.5);
   setMeshUVScale(cube, 2.0, 3.0);
   const m = getMesh(cube);
   if (Math.abs(m.uvOffsetU - 0.25) > 0.001) throw new Error('uvOffsetU mismatch: ' + m.uvOffsetU);
   if (Math.abs(m.uvOffsetV - 0.5) > 0.001) throw new Error('uvOffsetV mismatch: ' + m.uvOffsetV);
   if (Math.abs(m.uvScaleU - 2.0) > 0.001) throw new Error('uvScaleU mismatch: ' + m.uvScaleU);
   if (Math.abs(m.uvScaleV - 3.0) > 0.001) throw new Error('uvScaleV mismatch: ' + m.uvScaleV);
   ok = true;
}
export function update(dt) {}
export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('101 UV TRANSFORM', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
