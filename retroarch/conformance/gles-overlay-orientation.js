let cube;

export function init() {
   cube = createCube(3, 3, 3, rgba8(0, 220, 255, 255));
   setMeshEmissive(cube, rgba8(0, 220, 255, 255), 0.35);
   setCameraPosition(0, 0, 9);
   setCameraTarget(0, 0, 0);
   nova64.post.setBloom(0.4);
}

export function update(dt) {
   setRotation(cube, dt * 0.0, dt * 0.0, 0);
}

export function draw() {
   cls(rgba8(0, 0, 0, 255));
   rectfill(0, 0, 160, 32, rgba8(255, 0, 0, 255));
   print('TOP LEFT', 8, 12, rgba8(255, 255, 255, 255));
   rectfill(0, 328, 190, 32, rgba8(0, 180, 0, 255));
   print('BOTTOM LEFT', 8, 340, rgba8(255, 255, 255, 255));
   rectfill(520, 0, 120, 32, rgba8(255, 255, 0, 255));
   print('TOP RIGHT', 528, 12, rgba8(0, 0, 0, 255));
}
