let cone = 0;
let instanced = 0;
let t = 0;

export function init() {
   setCameraPosition(0, 1.2, 5.2);
   setCameraTarget(0, 0, 0);
   setCameraFOV(48);
   setAmbientLight(rgba8(24, 28, 40, 255), 1.0);
   setLightDirection(-0.35, -0.9, -0.25);
   setSkyColor(rgba8(4, 8, 18, 255), rgba8(0, 0, 0, 255));

   cone = createCone(0.75, 1.45, rgba8(255, 150, 70, 255));
   setPosition(cone, -0.75, 0, 0);
   setRotation(cone, 0.25, 0.45, 0.0);
   setMeshEmissive(cone, rgba8(255, 80, 20, 255), 0.12);

   instanced = createInstancedMesh('cone', 3);
   setMeshColor(instanced, rgba8(80, 210, 255, 255));
   setMeshEmissive(instanced, rgba8(40, 160, 255, 255), 0.18);
   for (let i = 0; i < 3; i++) {
      const s = 0.24 + i * 0.08;
      setInstanceTransform(instanced, i, [
         s, 0, 0, 0,
         0, s * 1.7, 0, 0,
         0, 0, s, 0,
         0.55 + i * 0.55, -0.25 + i * 0.08, -0.1 - i * 0.15, 1,
      ]);
      setInstanceColor(instanced, i, rgba8(70 + i * 40, 170 + i * 20, 255, 255));
   }
}

export function update(dt) {
   t += dt;
   setRotation(cone, 0.25, 0.45 + t * 0.35, Math.sin(t) * 0.08);
}

export function draw() {
   cls(rgba8(2, 4, 10, 255));
   print('GLES CONE', 16, 16, rgba8(255, 220, 120, 255));
}
