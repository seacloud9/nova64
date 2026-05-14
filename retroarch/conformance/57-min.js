// Minimal test for destroyMesh / getMesh after destroy
export function init() {
   clearScene();
   const a = createCube(rgba8(200, 80, 80, 255), [0, 0, 0]);
   const b = createCube(rgba8(80, 200, 80, 255), [2, 0, 0]);
   destroyMesh(a);
   const x = getMesh(a);
   // x should be null
}
export function update(dt) {}
export function draw() {
   cls(0);
   print('ok', 4, 4, rgba8(255, 255, 255, 255));
}
