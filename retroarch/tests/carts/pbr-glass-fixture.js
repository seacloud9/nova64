// Create the lens before the background to catch creation-order rendering bugs.
export function init() {
  nova64.camera.setCameraFOV(60);
  nova64.camera.setCameraPosition(0, 0, 5);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.light.createSolidSkybox(0x101820);
  nova64.light.setAmbientLight(0, 0);
  nova64.light.setLightColor(0);
  nova64.light.setDirectionalLight([1, 1, 1], 0xffffff, 0);
  const createLens = () => {
    const lens = nova64.scene.createSphere(1.15, 0xffffff, [0, 0, 0]);
    nova64.scene.setPBRProperties(lens, {
      color: 0xffffff,
      metalness: 0,
      envMapIntensity: 0,
      transmission: globalThis.__glassTransmission ?? 1,
      thickness: globalThis.__glassThickness ?? 1.8,
      ior: globalThis.__glassIor ?? 1.5,
      roughness: globalThis.__glassRoughness ?? 0.02,
      attenuationColor: globalThis.__glassAttenuationColor ?? 0xffffff,
      attenuationDistance: globalThis.__glassAttenuationDistance ?? Infinity,
      opacity: 1,
    });
  };
  if (!globalThis.__glassLast) createLens();
  const colors = [0xff2233, 0xffcc22, 0x22cc55, 0x22bbff, 0x6644ff, 0xff44cc];
  colors.forEach((color, i) => {
    const stripe = nova64.scene.createCube(1, color, [(i - 2.5) * 0.75, 0, -2.5]);
    nova64.scene.setScale(stripe, 0.75, 4, 0.15);
    nova64.scene.setPBRProperties(stripe, {
      color: 0,
      emissive: color,
      emissiveIntensity: 1,
      envMapIntensity: 0,
      roughness: 1,
    });
  });
  if (globalThis.__glassLast) createLens();
  nova64.fx.enableBloom(0, 0.5, 0.95);
}
export function update() {}
export function draw() {}
