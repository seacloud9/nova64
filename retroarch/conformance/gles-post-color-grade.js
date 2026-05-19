// GLES regression: post shader uniforms must render a graded scene, not black.

let cube;

export function init() {
   setCameraPosition(0, 0, 6);
   setCameraTarget(0, 0, 0);
   setCameraFOV(55);
   setAmbientLight(rgba8(180, 210, 255, 255), 0.9);
   setLightDirection(-0.4, -0.9, -0.3);

   cube = createCube(rgba8(80, 220, 255, 255), [0, 0, 0]);
   setScale(cube, 2.2, 2.2, 2.2);

   nova64.post.setBloom(0.6);
   nova64.post.setChromatic(0.004);
   nova64.post.setColorGrade(0.7, 1.25, 1.4);
}

export function update(dt) {
   rotateMesh(cube, 0.2 * dt, 0.6 * dt, 0);
}

export function draw() {
   cls(rgba8(5, 8, 18, 255));
   draw3d();
}
