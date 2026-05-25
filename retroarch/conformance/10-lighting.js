let cube = 0
let sphere = 0
let floor = 0
let t = 0

export function init() {
  floor = createPlane(rgba8(44, 170, 124, 255))
  setScale(floor, 5.4, 4.6, 1)
  rotateMesh(floor, -Math.PI / 2, 0, 0)
  setPosition(floor, 0, -1.18, -0.2)

  cube = createCube(rgba8(255, 184, 72, 255))
  setScale(cube, 1.0, 1.35, 1.0)
  setPosition(cube, -1.05, 0.05, 0.1)

  sphere = createSphere(rgba8(92, 172, 255, 255))
  setScale(sphere, 1.0, 1.0, 1.0)
  setPosition(sphere, 1.1, 0.05, 0)

  setCameraPosition(0, 1.65, 5.35)
  setCameraTarget(0, -0.05, 0)
  setCameraFOV(49)
  setAmbientLight(rgba8(24, 18, 34, 255))
  setLightDirection(-0.65, -0.78, -0.2)
}

export function update(dt) {
  t += dt
  setRotation(cube, -0.42 + t * 0.65, 0.52 + t * 0.9, 0.05)
  setRotation(sphere, t * 0.42, -0.25 + t * 0.7, 0)
  setLightDirection(-0.65 + t * 0.35, -0.78, -0.2 - t * 0.18)
}

export function draw() {
  cls(rgba8(6, 8, 18, 255))
  rect(12, 12, 188, 44, rgba8(6, 8, 18, 238), true)
  rect(12, 12, 188, 44, rgba8(255, 184, 72, 255), false)
  print("LIGHTING", 24, 23, rgba8(255, 248, 220, 255))
  print("AMBIENT + DIR", 24, 39, rgba8(92, 172, 255, 255))
}
