let ok = false
let cube = 0
let light = 0

export function init() {
  setCameraPosition(0, 1.2, 4.8)
  nova64.camera.setCameraLookAt([0, -0.15, -1])
  setCameraFOV(52)

  setAmbientLight(rgba8(18, 22, 38, 255), 0.6)
  setLightColor(rgba8(255, 242, 210, 255))
  setDirectionalLight([-0.45, -0.8, -0.25], rgba8(255, 236, 198, 255), 1.35)
  setFog(rgba8(5, 9, 20, 255), 8, 42)
  clearFog()
  nova64.scene.setFog(rgba8(7, 12, 24, 255), 12, 48)

  const tempLight = createPointLight(rgba8(255, 0, 0, 255), 0.5, [0, 0, 0])
  clearScene()
  const tempCleared = setPointLightPosition(tempLight, 0, 0, 0) === false

  cube = createCube(1.2, rgba8(255, 176, 72, 255), [0, 0, 0])
  rotateMesh(cube, -0.35, 0.65, 0.05)

  light = nova64.lights.createPointLight(rgba8(80, 190, 255, 255), 1.25, 30, [0.75, 1.8, 0.4])
  const moved = nova64.light.setPointLightPosition(light, { x: -0.8, y: 1.4, z: 0.2 })
  const colored = setPointLightColor(light, rgba8(120, 220, 255, 255), 1.75)
  const removedInvalid = removeLight(999) === false
  const removedLight = createPointLight(rgba8(255, 255, 255, 255), 0.25, 6, [3, 3, 3])
  const removed = removeLight(removedLight)
  const removedGone = setPointLightColor(removedLight, rgba8(0, 0, 0, 255)) === false

  ok = tempCleared && moved && colored && removedInvalid && removed && removedGone
}

export function update() {}

export function draw() {
  cls(ok ? rgba8(4, 8, 18, 255) : rgba8(44, 0, 0, 255))
  print(ok ? "LIGHT FOG OK" : "LIGHT FOG FAIL", 16, 16, ok ? rgba8(214, 245, 255, 255) : rgba8(255, 120, 120, 255))
}
