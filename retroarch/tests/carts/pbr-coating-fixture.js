// Environment-only light isolates the coat from legacy direct-light shading.
export function init() {
  nova64.camera.setCameraFOV(60);
  nova64.camera.setCameraPosition(0, 0, 5);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.light.setAmbientLight(0, 0);
  nova64.light.setLightColor(0);
  nova64.light.createEnvironmentSkybox('studio');
  const sphere = nova64.scene.createSphere(1.4, 0x901515, [0, 0, 0]);
  nova64.scene.setPBRProperties(sphere, {
    color: 0x901515,
    metalness: 0,
    roughness: 0.85,
    ...(globalThis.__coatAmount === 'omitted' ? {} : { clearcoat: globalThis.__coatAmount ?? 1 }),
    clearcoatRoughness: globalThis.__coatRoughness ?? 0.05,
  });
  nova64.fx.enableBloom(0, 0.5, 0.95);
}
export function update() {}
export function draw() {}
