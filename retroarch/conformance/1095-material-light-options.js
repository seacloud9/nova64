// Conformance cart 1095: web-style mesh options plus point lights.

let errors = [];
let cube = 0;
let sphere = 0;
let lights = [];

function near(value, expected, eps = 0.001) {
  return Math.abs(value - expected) <= eps;
}

export function init() {
  const needed = [
    'createCube',
    'createSphere',
    'createPointLight',
    'setPointLightPosition',
    'setPointLightColor',
    'getMesh',
    'get3DStats',
  ];
  for (const name of needed) {
    if (typeof globalThis[name] !== 'function') errors.push(name + '-missing');
  }
  if (errors.length > 0) return;

  setCameraPosition(0, 2.1, 7.2);
  setCameraTarget(0, 0.25, 0);
  setAmbientLight(rgba8(18, 20, 28, 255));
  setDirectionalLight(rgba8(80, 92, 115, 255), -0.35, -0.9, -0.25);

  cube = createCube(1.25, rgba8(52, 46, 40, 255), [-1.45, 0.15, 0], {
    material: 'emissive',
    emissive: rgba8(255, 132, 34, 255),
    intensity: 2.25,
    roughness: 0.18,
    metalness: 0.42,
    flatShading: true,
  });

  sphere = createSphere(0.72, rgba8(58, 86, 130, 255), [1.35, 0.1, -0.15], {
    emissiveColor: rgba8(28, 90, 255, 255),
    emissiveIntensity: 0.65,
    roughness: 0.82,
    metalness: 0.08,
    flatShading: false,
  });

  const cubeInfo = getMesh(cube);
  const sphereInfo = getMesh(sphere);
  if (!cubeInfo) errors.push('cube-getMesh-null');
  if (!sphereInfo) errors.push('sphere-getMesh-null');

  if (cubeInfo) {
    if (cubeInfo.emissiveColor !== rgba8(255, 132, 34, 255)) errors.push('cube-emissive');
    if (!near(cubeInfo.emissiveIntensity, 2.25)) errors.push('cube-emissive-intensity:' + cubeInfo.emissiveIntensity);
    if (!near(cubeInfo.roughness, 0.18)) errors.push('cube-roughness:' + cubeInfo.roughness);
    if (!near(cubeInfo.metalness, 0.42)) errors.push('cube-metalness:' + cubeInfo.metalness);
    if (cubeInfo.flatShading !== true) errors.push('cube-flat');
  }

  if (sphereInfo) {
    if (sphereInfo.emissiveColor !== rgba8(28, 90, 255, 255)) errors.push('sphere-emissive');
    if (!near(sphereInfo.emissiveIntensity, 0.65)) errors.push('sphere-emissive-intensity:' + sphereInfo.emissiveIntensity);
    if (!near(sphereInfo.roughness, 0.82)) errors.push('sphere-roughness:' + sphereInfo.roughness);
    if (!near(sphereInfo.metalness, 0.08)) errors.push('sphere-metalness:' + sphereInfo.metalness);
    if (sphereInfo.flatShading !== false) errors.push('sphere-flat');
  }

  const warm = nova64.light.createPointLight(rgba8(255, 168, 70, 255), 1.8, 9, [-2.2, 1.8, 1.2]);
  const cool = createPointLight(rgba8(80, 150, 255, 255), 1.25, 8, 2.1, 1.5, 1.1);
  lights = [warm, cool];

  if (warm <= 0 || cool <= 0 || warm === cool) errors.push('light-handles');
  setPointLightPosition(cool, { x: 1.8, y: 1.9, z: 0.9 });
  setPointLightColor(warm, rgba8(255, 190, 92, 255), 2.0);

  const stats = get3DStats();
  if (stats.pointLights !== 2) errors.push('pointLights:' + stats.pointLights);
}

export function update(dt) {}

export function draw() {
  cls(rgba8(7, 7, 13, 255));
  print('1095 MATERIAL LIGHT OPTS', 4, 4, rgba8(225, 230, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  print('lights:' + lights.length, 4, 14, rgba8(255, 198, 110, 255));
  print('opts ok', 4, 24, rgba8(80, 255, 130, 255));
}
