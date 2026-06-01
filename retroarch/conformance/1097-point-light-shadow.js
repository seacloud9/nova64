// Conformance cart 1097: point-light shadow source for the GLES shadow map.

let errors = [];

export function init() {
  const needed = [
    'createCube',
    'createPointLight',
    'setCastShadow',
    'setReceiveShadow',
    'setShadowQuality',
    'setCameraPosition',
    'setCameraTarget',
    'setAmbientLight',
    'setLightDirection',
    'setLightColor',
    'getBackendCapabilities',
  ];
  for (const name of needed) {
    if (typeof globalThis[name] !== 'function') errors.push(name + '-missing');
  }
  if (errors.length > 0) return;

  setShadowQuality('medium');
  setCameraPosition(0, 2.8, 4.8);
  setCameraTarget(0, 0.1, -2.8);
  setAmbientLight(rgba8(18, 16, 22, 255), 0.65);
  setLightDirection(0, -1, -0.2);
  setLightColor(rgba8(45, 42, 55, 255));

  const floor = createCube(1, rgba8(84, 76, 64, 255), [0, -0.85, -3.1]);
  setScale(floor, 5.6, 0.12, 5.0);
  setReceiveShadow(floor, true);

  const blocker = createCube(1, rgba8(95, 52, 34, 255), [0, 0.25, -2.15]);
  setScale(blocker, 0.9, 1.9, 0.9);
  setCastShadow(blocker, true);

  const lamp = createCube(0.18, rgba8(255, 168, 58, 255), [0, 2.55, 1.05], {
    material: 'emissive',
    emissive: rgba8(255, 168, 58, 255),
    intensity: 2.0,
  });
  createPointLight(rgba8(255, 172, 72, 255), 3.4, 8.0, [0, 2.55, 1.05]);

  const caps = getBackendCapabilities();
  if (typeof caps.shadowMaps !== 'boolean') errors.push('shadowMaps-type');
  if (!floor || !blocker || !lamp) errors.push('mesh-handle');
}

export function update(dt) {}

export function draw() {
  cls(rgba8(5, 4, 8, 255));
  print('1097 POINT LIGHT SHADOW', 4, 4, rgba8(235, 225, 200, 255));
  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }
  print('point shadow ok', 4, 14, rgba8(255, 188, 92, 255));
}
