// 05-particles.js — fountain of glowing cubes via particles.create.

let elapsed = 0;

function call(method, payload) {
  const r = engine.call(method, payload || {});
  if (r && r.error) throw new Error(method + ' failed: ' + r.error);
  return r;
}

export function init() {
  const caps = call('engine.init').capabilities;
  print('[05-particles] booted on ' + caps.backend + ' adapter=' + caps.adapterVersion);

  call('light.createDirectional', { color: [1, 1, 1, 1], energy: 0.7 });

  const mat = call('material.create', {
    albedo: [1.0, 0.55, 0.15, 1.0],
    unshaded: true,
  }).handle;

  const geom = call('geometry.createBox', { size: [0.18, 0.18, 0.18] }).handle;

  call('particles.create', {
    geometry: geom,
    material: mat,
    amount: 512,
    lifetime: 2.5,
    emissionBoxExtents: [0.4, 0.05, 0.4],
    initialVelocityMin: 4,
    initialVelocityMax: 7,
    gravity: [0, -9.8, 0],
    scale: 1.0,
  });

  // Ground plane for context.
  const groundMat = call('material.create', { albedo: [0.10, 0.12, 0.18, 1.0], roughness: 0.9 }).handle;
  const groundGeom = call('geometry.createPlane', { size: [40, 40] }).handle;
  const ground = call('mesh.create', { geometry: groundGeom }).handle;
  call('mesh.setMaterial', { mesh: ground, material: groundMat });
  call('transform.set', { handle: ground, position: [0, -0.5, 0] });

  const cam = call('camera.create', {}).handle;
  call('transform.set', { handle: cam, position: [0, 4, 9], rotation: [-0.4, 0, 0] });
  call('camera.setActive', { handle: cam });

  print('[05-particles] ready');
}

export function update(dt) {
  elapsed += dt;
}
