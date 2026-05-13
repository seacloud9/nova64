let sphere = 0
let angle = 0

export function init() {
  sphere = createSphere(rgba8(122, 245, 255, 255))
  setScale(sphere, 1.7, 1.7, 1.7)

  setCameraPosition(0, 0.6, 4.6)
  setCameraTarget(0, 0, 0)
  setCameraFOV(50)
  setAmbientLight(rgba8(5, 8, 18, 255))
  setLightDirection(-0.25, -0.9, -0.35)
}

export function update(dt) {
  angle += dt
  setRotation(sphere, angle * 0.5, angle * 0.85, 0)
}

export function draw() {
  cls(rgba8(3, 6, 18, 255))
  print("SPHERE", 16, 16, rgba8(255, 82, 197, 255))
}
