let cube = 0
let floor = 0
let angle = 0

export function init() {
  floor = createPlane(rgba8(20, 210, 190, 255))
  setScale(floor, 4.5, 1, 4.5)
  setPosition(floor, 0, -1.05, 0)

  cube = createCube(rgba8(255, 82, 197, 255))
  setScale(cube, 1.25, 1.25, 1.25)
  setPosition(cube, 0, 0.1, 0)

  setCameraPosition(0, 1.8, 5.2)
  setCameraTarget(0, -0.1, 0)
  setCameraFOV(52)
  setAmbientLight(rgba8(8, 12, 24, 255))
  setLightDirection(-0.35, -0.9, -0.25)
}

export function update(dt) {
  angle += dt
  setRotation(cube, -0.38 + angle * 0.7, 0.68 + angle, 0.05)
}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  print("CUBE PLANE", 16, 16, rgba8(122, 245, 255, 255))
}
