let cube = 0
let box = 0
let sphere = 0
let plane = 0

export function init() {
  cube = createCube(1.2, rgba8(255, 90, 190, 255), [-1.2, 0.0, 0.0])
  box = createCube(0.65, 1.35, 0.9, rgba8(255, 210, 80, 255), { x: 1.05, y: -0.05, z: 0.05 })
  sphere = createSphere(0.5, rgba8(120, 230, 255, 255), [0.05, 0.15, -0.9])
  plane = createPlane(3.8, 1.6, rgba8(35, 210, 170, 255), { x: 0, y: -1.05, z: 0 })
  rotateMesh(plane, -Math.PI / 2, 0, 0)

  setCameraPosition(0, 1.8, 5.3)
  setCameraTarget(0, -0.2, 0)
  setCameraFOV(50)
  setAmbientLight(rgba8(8, 12, 24, 255))
  setLightDirection(-0.3, -0.9, -0.25)
}

export function update() {}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  print("PRIMITIVE ARGS", 16, 16, rgba8(200, 250, 255, 255))
}
