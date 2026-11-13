// Native regression: observable sky assets, emission and bloom settings.
function assert(value, message) {
  if (!value) throw new Error(message);
}
const near = (a, b) => Math.abs(a - b) < 0.0001;
export async function init() {
  const light = nova64.light;
  assert(light.getSkyPresets().includes('aurora'), 'missing sky preset');
  light.createSkyPreset('aurora', { seed: 3 });
  light.clearSkybox();
  light.createSpaceSkybox({ seed: 4, starCount: 16, nebulae: false });
  light.enableSkyboxAutoAnimate(-1);
  light.disableSkyboxAutoAnimate();
  light.animateSkybox(0.5);
  light.clearSkybox();
  await light.createHDRSkybox('/assets/sky/hdr/studio_small_09_1k.hdr', {
    intensity: 0.5,
    rotation: 1,
  });
  let rejected = false;
  try {
    await light.createHDRSkybox('/missing-sky-test.hdr');
  } catch (_) {
    rejected = true;
  }
  assert(rejected, 'missing HDR did not reject');
  await light.createImageSkybox(
    ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(face => '/assets/sky/studio/' + face + '.png')
  );
  light.createEnvironmentSkybox('studio', { intensity: 0.7 });
  const id = createCube(1, 0x2468ac, [0, 0, 0], {
    emissive: true,
    emissiveIntensity: 0,
    intensity: 3,
  });
  let mesh = getMesh(id);
  assert(near(mesh.emissiveIntensity, 0), 'canonical zero lost to intensity alias');
  assert(
    mesh.emissiveColor === rgba8(0x24, 0x68, 0xac, 255),
    'emissive true lost the mesh palette'
  );
  const dark = createCube(1, 0x2468ac, [2, 0, 0], { material: 'emissive', intensity: 0 });
  assert(near(getMesh(dark).emissiveIntensity, 0), 'material default overrode explicit alias zero');
  setPBRProperties(id, {
    color: 0xff8800,
    emissive: 0x112233,
    emissiveIntensity: 1.7,
    roughness: 0.2,
    metalness: 0.8,
  });
  mesh = getMesh(id);
  assert(near(mesh.clearcoat, 0) && near(mesh.clearcoatRoughness, 0), 'clearcoat defaults changed');
  setPBRProperties(id, { clearcoat: 0.8, clearcoatRoughness: 0.15 });
  setPBRProperties(id, { roughness: 0.2 });
  assert(
    near(getMesh(id).clearcoat, 0.8) && near(getMesh(id).clearcoatRoughness, 0.15),
    'partial PBR update lost clearcoat'
  );
  setPBRProperties(id, { clearcoat: 3, clearcoatRoughness: -1 });
  assert(
    near(getMesh(id).clearcoat, 1) && near(getMesh(id).clearcoatRoughness, 0),
    'clearcoat values were not clamped'
  );
  setPBRProperties(id, { clearcoat: 0 });
  assert(
    near(mesh.emissiveIntensity, 1.7) && near(mesh.roughness, 0.2) && near(mesh.metalness, 0.8),
    'PBR settings dropped'
  );
  setPBRProperties(id, { color: 0 });
  assert(getMesh(id).color === rgba8(0, 0, 0, 255), 'RGB black became transparent');
  nova64.fx.enableBloom({ strength: 2.2, radius: 0.95, threshold: 1.1 });
  const state = nova64.post.getState();
  assert(
    near(state.bloom, 2.2) && near(state.bloomRadius, 0.95) && near(state.bloomThreshold, 1.1),
    'bloom values capped or dropped'
  );
  assert(
    near(state.exposure, 1) && near(state.sharpness, 0) && state.colorGrade.every(v => near(v, 1)),
    'legacy visual overrides remain'
  );
  nova64.camera.setCameraPosition(0, 0, 5);
  nova64.camera.setCameraTarget(0, 0, 0);
  light.createSkyPreset('highlands', { seed: 42 });
  console.log('SKY_BLOOM_API_PASS');
}
export function update(dt) {}
export function draw() {}
