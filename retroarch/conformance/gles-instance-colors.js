// GLES regression: setInstanceColor() must affect each hardware instance.

let mesh = 0;

export function init() {
   setCameraPosition(0, 0, 7);
   setCameraTarget(0, 0, -4);
   setCameraFOV(55);
   setAmbientLight(rgba8(255, 255, 255, 255), 1.0);
   setLightDirection(0, 0, -1);

   mesh = createInstancedMesh('cube', 4);
   const positions = [
      [-2.4,  1.1, -4.5],
      [ 2.4,  1.1, -4.5],
      [-2.4, -1.1, -4.5],
      [ 2.4, -1.1, -4.5],
   ];
   const colors = [
      rgba8(255, 60, 60, 255),
      rgba8(60, 255, 90, 255),
      rgba8(70, 120, 255, 255),
      rgba8(255, 235, 70, 255),
   ];

   for (let i = 0; i < 4; i++) {
      const p = positions[i];
      setInstanceTransform(mesh, i, [
         1, 0, 0, 0,
         0, 1, 0, 0,
         0, 0, 1, 0,
         p[0], p[1], p[2], 1,
      ]);
      setInstanceScale(mesh, i, 0.9, 0.9, 0.9);
      setInstanceColor(mesh, i, colors[i]);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   draw3d();
}
