let cube = 0
let angle = 0

export function init() {
  cube = createCube(rgba8(255, 82, 197, 255))
  setScale(cube, 1.65, 1.65, 1.65)
  setCameraPosition(0, 1.35, 4.4)
  setCameraTarget(0, 0, 0)
  setCameraFOV(54)
  setAmbientLight(rgba8(10, 14, 26, 255))
  setLightDirection(-0.35, -0.9, -0.25)
}

export function update(dt) {
  angle += dt
  setRotation(cube, -0.48 + angle * 0.8, 0.72 + angle, 0.08)
}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  print("CUBE COMMANDS", 16, 16, rgba8(122, 245, 255, 255))
}
