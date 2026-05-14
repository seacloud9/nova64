// Conformance cart 85: 3D raycast
// raycast(ox,oy,oz, dx,dy,dz [,maxDist]) -> {handle,distance,point,normal} | null

let ok = false;
let cube;

export function init() {
   // Miss case: ray pointed away from cube must return null
   cube = createCube(1.0, rgba8(100, 200, 100, 255), [0, 0, -5]);

   // Ray aimed straight at the cube from z=0 toward -z
   const hit = raycast(0, 0, 0,  0, 0, -1,  20);
   if (!hit) throw new Error('expected hit, got null');
   if (typeof hit.handle !== 'number') throw new Error('hit.handle not number');
   if (typeof hit.distance !== 'number') throw new Error('hit.distance not number');
   if (!hit.point || typeof hit.point.x !== 'number') throw new Error('hit.point missing');
   if (!hit.normal || typeof hit.normal.x !== 'number') throw new Error('hit.normal missing');
   if (hit.distance <= 0) throw new Error('distance must be positive: ' + hit.distance);

   // Miss case: ray perpendicular to cube
   const miss = raycast(0, 100, 0,  1, 0, 0,  200);
   if (miss !== null) throw new Error('expected null for miss');

   // nova64.scene.raycast alias
   const hit2 = nova64.scene.raycast(0, 0, 0,  0, 0, -1,  20);
   if (!hit2) throw new Error('nova64.scene.raycast failed');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 18, 255));
   print('85 RAYCAST', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   const hit = raycast(0, 0, 0,  0, 0, -1,  20);
   if (hit) {
      print('dist=' + hit.distance.toFixed(2), 4, 24, rgba8(180, 200, 180, 255));
      print('nx=' + hit.normal.x.toFixed(2), 4, 34, rgba8(180, 200, 180, 255));
   }
}
