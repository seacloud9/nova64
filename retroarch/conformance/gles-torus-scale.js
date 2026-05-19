// GLES regression: torus radius is baked into geometry and must not be scaled twice.

let ring;

export function init() {
   setCameraPosition(0, 0, 10);
   setCameraTarget(0, 0, 0);
   setCameraFOV(60);
   setAmbientLight(rgba8(255, 255, 255, 255), 1.0);
   setLightDirection(-0.2, -0.8, -0.3);

   ring = createTorus(2.0, 0.45, rgba8(255, 80, 180, 255), [0, 0, 0]);
   rotateMesh(ring, 0.6, 0.25, 0.0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 12, 255));
   draw3d();
}
