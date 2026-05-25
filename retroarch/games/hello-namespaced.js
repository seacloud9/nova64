// Nova64 Game Cart: HELLO NAMESPACED (RetroArch port)
// Exercises the nova64.* namespace API with a small orbiting 3D scene.

const CUBE_COLORS = [
  rgba8(255, 68, 68, 255),
  rgba8(68, 255, 96, 255),
  rgba8(68, 120, 255, 255),
  rgba8(255, 235, 68, 255),
  rgba8(255, 68, 220, 255),
  rgba8(68, 235, 255, 255),
];

let cubes = [];
let ground = 0;
let time = 0;

export function init() {
  cubes = [];
  time = 0;

  nova64.camera.setCameraPosition(0, 6, 12);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.camera.setCameraFOV(60);
  nova64.light.setAmbientLight(rgba8(90, 92, 130, 255), 0.9);
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  nova64.light.setFog(rgba8(26, 26, 46, 255), 15, 60);
  nova64.light.createPointLight(rgba8(255, 255, 255, 255), 1.5, [0, 8, 0]);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const mesh = nova64.scene.createCube(1.5, CUBE_COLORS[i], [
      Math.cos(angle) * 5,
      0,
      Math.sin(angle) * 5,
    ]);
    cubes.push({
      mesh,
      angle,
      speed: 0.75 + i * 0.17,
    });
  }

  ground = nova64.scene.createPlane(30, 30, rgba8(51, 51, 85, 255), [0, -1.5, 0]);
  nova64.scene.setRotation(ground, -Math.PI / 2, 0, 0);
}

export function update(dt) {
  time += dt;

  for (const cube of cubes) {
    const y = Math.sin(time * 2 + cube.angle) * 1.5;
    nova64.scene.setPosition(
      cube.mesh,
      Math.cos(cube.angle) * 5,
      y,
      Math.sin(cube.angle) * 5
    );
    nova64.scene.rotateMesh(cube.mesh, dt * cube.speed, dt * cube.speed * 0.5, 0);
  }

  const cx = Math.cos(time * 0.4) * 12;
  const cz = Math.sin(time * 0.4) * 12;
  nova64.camera.setCameraPosition(cx, 6, cz);
  nova64.camera.setCameraTarget(0, 0, 0);
}

export function draw() {
  nova64.draw.print('HELLO NAMESPACED', 8, 8, rgba8(0, 255, 255, 255));
  nova64.draw.print('nova64.scene / nova64.camera / nova64.light', 8, 24, rgba8(200, 200, 220, 220));
  nova64.draw.print(
    'cubes: ' + cubes.length + '  time: ' + time.toFixed(1) + 's',
    8,
    40,
    rgba8(100, 255, 120, 255)
  );
}
