let floor = 0
let marker = 0

export function init() {
  floor = createPlane(6, 2.5, rgba8(32, 210, 180, 255))
  rotateMesh(floor, -Math.PI / 2, 0, 0)
  setPosition(floor, 0, -0.9, 0)

  marker = createCube(rgba8(255, 210, 80, 255))
  setScale(marker, 0.45, 0.45, 0.45)
  setPosition(marker, 0, -0.45, 0)

  setCameraPosition(0, 2.1, 5.4)
  setCameraTarget(0, -0.45, 0)
  setCameraFOV(48)
  setAmbientLight(rgba8(8, 12, 24, 255))
  setLightDirection(-0.2, -0.9, -0.35)
}

export function update() {}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  print("PLANE 6x2.5", 16, 16, rgba8(180, 255, 235, 255))
}
