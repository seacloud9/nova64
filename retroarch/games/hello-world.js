// Nova64 Game Cart: HELLO WORLD (RetroArch port)
// Spinning cube + HUD label. Mirror of examples/hello-world.

let cube;

export function init() {
   cube = createCube(1, 1, 1, rgba8(0, 170, 255, 255));
   setPosition(cube, 0, 0, -4);
   setAmbientLight(rgba8(255, 255, 255, 255), 1.5);
   setCameraPosition(0, 1, 4);
   setCameraTarget(0, 0, 0);
}

export function update(dt) {
   rotateMesh(cube, dt * 0.5, dt, 0);
}

export function draw() {
   printCentered('Hello, Nova64!', 320, 12, rgba8(255, 255, 255, 255));
}
