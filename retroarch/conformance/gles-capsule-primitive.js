let capsule = 0;
let squat = 0;
let t = 0;

export function init() {
   setCameraPosition(0, 1.15, 5.2);
   setCameraTarget(0, 0, 0);
   setCameraFOV(50);
   setAmbientLight(rgba8(24, 28, 40, 255), 1.0);
   setLightDirection(-0.3, -0.9, -0.25);
   setSkyColor(rgba8(4, 8, 18, 255), rgba8(0, 0, 0, 255));

   capsule = createCapsule(0.38, 1.65, rgba8(190, 120, 255, 255));
   setPosition(capsule, -0.68, 0, 0);
   setRotation(capsule, 0.2, 0.5, 0.0);
   setMeshEmissive(capsule, rgba8(130, 70, 255, 255), 0.14);

   squat = createCapsule(0.46, 1.05, rgba8(80, 235, 170, 255));
   setPosition(squat, 0.72, -0.08, -0.05);
   setRotation(squat, -0.15, -0.45, 0.12);
   setMeshEmissive(squat, rgba8(20, 190, 120, 255), 0.12);
}

export function update(dt) {
   t += dt;
   setRotation(capsule, 0.2, 0.5 + t * 0.24, Math.sin(t) * 0.05);
   setRotation(squat, -0.15, -0.45 - t * 0.2, 0.12 + Math.cos(t * 0.8) * 0.04);
}

export function draw() {
   cls(rgba8(2, 4, 10, 255));
   print('GLES CAPSULE', 16, 16, rgba8(220, 190, 255, 255));
}
