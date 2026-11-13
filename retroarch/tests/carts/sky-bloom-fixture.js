// A fixed camera and explicit seed isolate shader parity from gameplay RNG.
let elapsed = 0;
export async function init() {
  nova64.camera.setCameraFOV(60);
  nova64.camera.setCameraPosition(0, 0, 0);
  nova64.camera.setCameraTarget(0, 0, -1);
  if (globalThis.__skyFixtureMode === 'bloom') {
    nova64.light.createSolidSkybox(0);
    nova64.light.setAmbientLight(0, 0);
    nova64.light.setLightColor(0);
    const cube = nova64.scene.createCube(1, 0, [0, 0, -5], {
      emissive: 0xff4400,
      emissiveIntensity: 2,
      opacity: 1,
    });
    nova64.scene.setPBRProperties(cube, {
      color: 0,
      emissive: 0xff4400,
      emissiveIntensity: 2,
      metalness: 0,
      envMapIntensity: 0,
      roughness: 1,
      opacity: 1,
    });
    nova64.fx.enableBloom(1.2, 0.5, 0.2);
    return;
  }
  if (globalThis.__skyFixtureMode === 'space') {
    nova64.light.createSpaceSkybox({ seed: 42 });
  } else if (globalThis.__skyFixtureMode === 'aurora') {
    nova64.light.createSkyPreset('aurora', { seed: 42, reflect: false });
  } else if (globalThis.__skyFixtureMode === 'hdr') {
    await nova64.light.createHDRSkybox('/assets/sky/hdr/studio_small_09_1k.hdr', { rotation: 0.7 });
  } else if (globalThis.__skyFixtureMode === 'image') {
    await nova64.light.createImageSkybox(
      ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(face => '/assets/sky/studio/' + face + '.png')
    );
  } else if (globalThis.__skyFixtureMode === 'environment') {
    nova64.light.createEnvironmentSkybox('studio');
  } else nova64.light.createSkyPreset('highlands', { seed: 42, reflect: false });
  nova64.fx.enableBloom(0, 0.5, 0.95);
}
export function update(dt) {
  elapsed += dt;
  // Observe a second view direction without changing the sky's world position.
  if (globalThis.__skyFixtureMode !== 'bloom' && elapsed > 0.5)
    nova64.camera.setCameraTarget(1, 0.2, -1);
}
export function draw() {}
