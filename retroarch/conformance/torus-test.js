// Torus mesh diagnostic — dump mesh fields and check visible pixels
let t;
export function init() {
   setCameraPosition(0, 0, 10);
   setCameraTarget(0, 0, 0);
   setCameraFOV(60);
   setLightDirection(0, -1, 0);
   t = createTorus(2, 0.5, rgba8(255, 0, 0, 255));
   setPosition(t, 0, 0, 0);
}
export function update(dt) {}
export function draw() {
   cls(rgba8(0, 0, 0, 255));
}
