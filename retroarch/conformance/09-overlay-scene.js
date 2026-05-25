let cube = 0
let sphere = 0
let floor = 0
let angle = 0

export function init() {
  floor = createPlane(rgba8(24, 214, 196, 255))
  setScale(floor, 5.2, 4.2, 1)
  rotateMesh(floor, -Math.PI / 2, 0, 0)
  setPosition(floor, 0, -1.15, -0.15)

  cube = createCube(rgba8(255, 82, 197, 255))
  setScale(cube, 1.05, 1.05, 1.05)
  setPosition(cube, -0.95, 0.02, 0)

  sphere = createSphere(rgba8(122, 245, 255, 255))
  setScale(sphere, 0.92, 0.92, 0.92)
  setPosition(sphere, 1.05, -0.02, 0.15)

  setCameraPosition(0, 1.55, 5.15)
  setCameraTarget(0, -0.08, 0)
  setCameraFOV(50)
  setAmbientLight(rgba8(7, 11, 22, 255))
  setLightDirection(-0.28, -0.92, -0.26)
}

export function update(dt) {
  angle += dt
  setRotation(cube, -0.35 + angle * 0.8, 0.78 + angle, 0.08)
  setRotation(sphere, angle * 0.35, -0.55 + angle * 0.65, 0.02)
}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  rect(12, 12, 202, 46, rgba8(7, 11, 22, 238), true)
  rect(12, 12, 202, 46, rgba8(122, 245, 255, 255), false)
  print("GLES OVERLAY", 22, 22, rgba8(255, 255, 255, 255))
  print("3D + HUD", 22, 38, rgba8(255, 82, 197, 255))
  rect(500, 300, 116, 34, rgba8(7, 11, 22, 238), true)
  rect(500, 300, 116, 34, rgba8(255, 82, 197, 255), false)
  print("MS3", 522, 312, rgba8(122, 245, 255, 255))
}
