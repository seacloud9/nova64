let near = 0;
let far = 0;
let t = 0;

export function init() {
   setCameraPosition(0, 0, 4.5);
   setCameraTarget(0, 0, -4);
   setCameraFOV(46);
   setAmbientLight(rgba8(220, 220, 220, 255), 1.0);
   setLightDirection(-0.25, -0.8, -0.3);
   setSkyColor(rgba8(4, 8, 16, 255), rgba8(0, 0, 0, 255));

   const back = createCube(rgba8(40, 70, 120, 255), [0, 0, -5.4]);
   setScale(back, 3.4, 2.4, 0.08);

   // Near is allocated before far. A depth-writing transparent path hides far.
   near = createCube(rgba8(255, 90, 70, 255), [-0.18, 0.02, -3.0]);
   setScale(near, 1.55, 1.65, 0.08);
   setMeshOpacity(near, 0.48);

   far = createCube(rgba8(70, 180, 255, 255), [0.22, -0.02, -3.85]);
   setScale(far, 1.65, 1.55, 0.08);
   setMeshOpacity(far, 0.48);
}

export function update(dt) {
   t += dt;
   setRotation(near, 0, Math.sin(t * 0.5) * 0.03, 0);
   setRotation(far, 0, -Math.sin(t * 0.5) * 0.03, 0);
}

export function draw() {
   cls(rgba8(2, 4, 10, 255));
   print('GLES Z SORT', 16, 16, rgba8(210, 235, 255, 255));
}
