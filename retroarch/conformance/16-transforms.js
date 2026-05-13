let ok = false
let cube = 0
let hidden = 0

function close(a, b) {
  return Math.abs(a - b) < 0.0001
}

export function init() {
  cube = createCube(1, rgba8(255, 120, 80, 255), [0, 0, 0])
  setPosition(cube, { x: -0.45, y: 0.1, z: 0.2 })
  setRotation(cube, [0.1, 0.2, 0.3])
  setScale(cube, 1.4)
  moveMesh(cube, 0.25, -0.05, -0.1)
  rotateMesh(cube, 0.2, 0.1, 0.0)

  hidden = createSphere(0.45, rgba8(120, 220, 255, 255), [1.1, 0, 0])
  setMeshVisible(hidden, false)

  const pos = getPosition(cube)
  const rot = nova64.scene.getRotation(cube)
  const mesh = getMesh(cube)
  const hiddenMesh = nova64.scene.getMesh(hidden)
  const removed = createCube(rgba8(255, 255, 255, 255))
  removeMesh(removed)

  ok =
    pos &&
    Array.isArray(pos) &&
    close(pos[0], -0.2) &&
    close(pos[1], 0.05) &&
    close(pos[2], 0.1) &&
    rot &&
    Array.isArray(rot) &&
    close(rot[0], 0.3) &&
    close(rot[1], 0.3) &&
    close(rot[2], 0.3) &&
    mesh &&
    mesh.type === "cube" &&
    mesh.visible === true &&
    close(mesh.scale[0], 1.4) &&
    close(mesh.scale[1], 1.4) &&
    close(mesh.scale[2], 1.4) &&
    hiddenMesh &&
    hiddenMesh.visible === false &&
    getMesh(removed) === null

  setCameraPosition(0, 1.4, 4.2)
  setCameraTarget(0, 0, 0)
  setCameraFOV(48)
  setAmbientLight(rgba8(8, 12, 24, 255))
  setLightDirection(-0.3, -0.9, -0.25)
}

export function update() {}

export function draw() {
  cls(ok ? rgba8(3, 8, 18, 255) : rgba8(40, 0, 0, 255))
  print(ok ? "TRANSFORMS OK" : "TRANSFORMS FAIL", 16, 16, ok ? rgba8(200, 255, 220, 255) : rgba8(255, 120, 120, 255))
}
