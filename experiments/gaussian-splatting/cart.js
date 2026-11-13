// This cart intentionally imports a Three-only feasibility module. No public
// nova64 Gaussian API or native/Godot/WASM compatibility is claimed yet.
import * as THREE from 'three';
import { GaussianPrototype } from '/experiments/gaussian-splatting/renderer.js';
import { decodeGaussianPly } from '/experiments/gaussian-splatting/data.js';
import { registerCartResetHook } from '/runtime/cart-reset.js';
let splats,
  first,
  second,
  time = 0;
const mode = globalThis.__gaussianMode || 'showcase';
function single(color, scale = [0.55, 0.12, 0.12], angle = Math.PI / 4) {
  return {
    positions: new Float32Array([0, 0, 0]),
    scales: new Float32Array(scale),
    rotations: new Float32Array([0, 0, Math.sin(angle / 2), Math.cos(angle / 2)]),
    colors: new Float32Array([...new THREE.Color(color).toArray(), 0.75]),
  };
}
export async function init() {
  time = 0;
  nova64.light.createSolidSkybox(0x080b15);
  nova64.camera.setCameraFOV(60);
  nova64.camera.setCameraPosition(0, 0, 5);
  nova64.camera.setCameraTarget(0, 0, 0);
  const scene = nova64.scene.getScene();
  if (!scene?.isScene || !nova64.scene.getRenderer()?.isWebGLRenderer)
    throw new Error('Gaussian feasibility requires the Three.js WebGL host');
  splats = new GaussianPrototype(scene);
  const unregisterReset = registerCartResetHook('gaussian-feasibility', () => {
    splats.dispose();
    delete globalThis.__gaussianProbe;
    unregisterReset();
  });
  if (mode === 'ellipse') first = splats.add(single(0xffffff));
  else if (mode === 'sort') {
    first = splats.add(single(0xff0000, [0.5, 0.5, 0.1], 0));
    first.position.z = -0.6;
    second = splats.add(single(0x0000ff, [0.5, 0.5, 0.1], 0));
    second.position.z = 0.6;
  } else if (mode === 'occlusion') {
    first = splats.add(single(0xff0000, [0.5, 0.5, 0.1], 0));
    first.position.z = -1;
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x2244ff })
    );
    cube.position.z = 1;
    scene.add(cube);
  } else {
    const response = await fetch('/experiments/gaussian-splatting/synthetic.ply');
    if (!response.ok) throw new Error('Gaussian fixture fetch failed');
    const data = decodeGaussianPly(new Uint8Array(await response.arrayBuffer()));
    first = splats.add(data);
    first.rotation.x = 0.25;
    second = splats.add(data);
    second.rotation.x = Math.PI / 2;
    second.position.set(0.75, 0.2, 0.2);
    second.scale.setScalar(0.8);
    const cube = nova64.scene.createCube(0.9, 0x273c65, [0, -0.2, 1.5]);
    nova64.scene.setPBRProperties(cube, {
      color: 0x273c65,
      metalness: 0.5,
      roughness: 0.25,
      clearcoat: 1,
    });
    nova64.light.createEnvironmentSkybox('studio', { intensity: 0.25 });
    nova64.camera.setCameraPosition(5, 2, 6);
  }
  globalThis.__gaussianProbe = { splats, first, second, mode };
  nova64.fx.enableBloom(0, 0.5, 0.95);
}
export function update(dt) {
  time += dt;
  if (mode === 'showcase') {
    nova64.camera.setCameraPosition(
      Math.sin(time * 0.18 + 0.7) * 7,
      1.4 + Math.sin(time * 0.13) * 0.8,
      Math.cos(time * 0.18 + 0.7) * 7
    );
    nova64.camera.setCameraTarget(0, 0, 0);
  }
}
export function draw() {
  if (mode !== 'showcase') return;
  nova64.draw.rectfill(0, 0, 640, 24, nova64.draw.rgba8(4, 7, 14, 230));
  nova64.draw.print(
    'GAUSSIAN FEASIBILITY / THREE.JS ONLY',
    8,
    8,
    nova64.draw.rgba8(220, 235, 255, 255)
  );
  nova64.draw.print(
    `SYNTHETIC PLY / ${splats.stats.visible} GAUSSIANS / CPU SORT`,
    8,
    342,
    nova64.draw.rgba8(220, 235, 255, 255)
  );
}
