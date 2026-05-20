let cylinder = 0;
let tapered = 0;
let t = 0;

export function init() {
   setCameraPosition(0, 1.25, 5.4);
   setCameraTarget(0, 0, 0);
   setCameraFOV(48);
   setAmbientLight(rgba8(26, 30, 42, 255), 1.0);
   setLightDirection(-0.35, -0.85, -0.25);
   setSkyColor(rgba8(4, 8, 18, 255), rgba8(0, 0, 0, 255));

   cylinder = createCylinder(0.48, 0.48, 1.35, rgba8(70, 205, 255, 255));
   setPosition(cylinder, -0.65, 0, 0);
   setRotation(cylinder, 0.25, 0.4, 0.0);
   setMeshEmissive(cylinder, rgba8(20, 150, 255, 255), 0.12);

   tapered = createCylinder(0.28, 0.62, 1.45, rgba8(255, 120, 80, 255));
   setPosition(tapered, 0.75, 0, -0.1);
   setRotation(tapered, -0.15, -0.55, 0.06);
   setMeshEmissive(tapered, rgba8(255, 70, 25, 255), 0.14);
}

export function update(dt) {
   t += dt;
   setRotation(cylinder, 0.25, 0.4 + t * 0.28, Math.sin(t) * 0.05);
   setRotation(tapered, -0.15, -0.55 - t * 0.22, 0.06 + Math.cos(t * 0.7) * 0.04);
}

export function draw() {
   cls(rgba8(2, 4, 10, 255));
   print('GLES CYLINDER', 16, 16, rgba8(170, 230, 255, 255));
}
