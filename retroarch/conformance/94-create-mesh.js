// Conformance cart 94: createMesh custom geometry
// createMesh(positions, normals, indices) returns a handle > 0.
// All mesh property setters work on it the same as built-in types.

let ok = false;
let meshHandle = 0;

function makeTetrahedron() {
   // 4 vertices, 4 triangles (12 indices)
   const s = 1.0;
   const positions = [
      0,  s, 0,
     -s, -s, s,
      s, -s, s,
      0, -s,-s
   ];
   // Approximate normals (face normals per-vertex for simplicity)
   const normals = [
      0, 1, 0,
      -1,-1, 1,
       1,-1, 1,
       0,-1,-1
   ];
   const indices = [
      0,1,2,
      0,2,3,
      0,3,1,
      1,3,2
   ];
   return { positions, normals, indices };
}

export function init() {
   // nova64.scene.createMesh or global createMesh
   const fn = typeof createMesh === 'function' ? createMesh
              : (nova64.scene && typeof nova64.scene.createMesh === 'function')
              ? nova64.scene.createMesh : null;
   if (!fn) throw new Error('createMesh not found');

   const { positions, normals, indices } = makeTetrahedron();
   meshHandle = fn(positions, normals, indices);
   if (!meshHandle || meshHandle <= 0) throw new Error('createMesh returned invalid handle');

   // Should support all standard mesh operations
   setPosition(meshHandle, 0, 0, -3);
   setScale(meshHandle, 0.8, 0.8, 0.8);
   setMeshColor(meshHandle, rgba8(200, 100, 60, 255));

   // Reject bad input
   const bad = fn([], [], []);
   if (bad !== 0) throw new Error('empty arrays should return 0');

   // Non-multiple of 3 positions should fail
   const bad2 = fn([1,2], normals, indices);
   if (bad2 !== 0) throw new Error('bad positions should return 0');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 10, 18, 255));
   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   print('94 CREATE MESH', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('handle=' + meshHandle, 4, 24, rgba8(180, 180, 220, 255));
}
