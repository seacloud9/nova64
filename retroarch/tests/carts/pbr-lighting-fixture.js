// Shared studio environment and fixed direct light: diffuse/GGX/clearcoat.
export function init() {
  nova64.camera.setCameraFOV(60);
  nova64.camera.setCameraPosition(0, 0, 5);
  nova64.camera.setCameraTarget(0, 0, 0);
  if (globalThis.__lightingNoEnvironment) nova64.light.createSolidSkybox(0x101820);
  else nova64.light.createEnvironmentSkybox('studio');
  nova64.light.setAmbientLight(0xffffff, 0.05);
  nova64.light.setDirectionalLight([2, 3, 4], 0xffffff, globalThis.__lightingIntensity ?? 3);
  const sphere = nova64.scene.createSphere(1.4, 0x901515, [0, 0, 0]);
  nova64.scene.setPBRProperties(sphere, {
    color: 0x901515,
    envMapIntensity: 1,
    metalness: globalThis.__lightingMetalness ?? 0.5,
    roughness: globalThis.__lightingRoughness ?? 0.3,
    clearcoat: globalThis.__lightingClearcoat ?? 1,
    clearcoatRoughness: 0.15,
  });
  nova64.fx.enableBloom(0, 0.5, 0.95);
}
export function update() {}
export function draw() {}
