let ok = false

function close(a, b) {
  return Math.abs(a - b) < 0.0001
}

export function init() {
  clearScene()

  const cube = createCube(1, rgba8(255, 132, 72, 255), [-0.75, 0, 0])
  const sphere = createSphere(0.45, rgba8(120, 210, 255, 255), [0.8, 0, 0])
  const plane = createPlane(3, 2, rgba8(40, 110, 92, 255), [0, -0.72, 0])
  rotateMesh(plane, -Math.PI / 2, 0, 0)

  setFlatShading(cube)
  setMeshOpacity(cube, 0.5)
  setCastShadow(cube, true)
  setReceiveShadow(plane, true)
  nova64.scene.setMeshVisible(sphere, false)

  const stats = get3DStats()
  const caps = nova64.scene.getBackendCapabilities()
  const mesh = getMesh(cube)
  const hidden = nova64.scene.getMesh(sphere)
  const missingOpacity = setMeshOpacity(999, 0.5) === false

  ok =
    mesh &&
    close(mesh.opacity, 0.5) &&
    mesh.flatShading === true &&
    mesh.castShadow === true &&
    mesh.receiveShadow === false &&
    hidden &&
    hidden.visible === false &&
    stats &&
    stats.meshes === 3 &&
    stats.visibleMeshes === 2 &&
    stats.triangles === 110 &&
    caps &&
    caps.primitives === true &&
    caps.meshOpacity === true &&
    caps.postProcessing === false &&
    missingOpacity

  setCameraPosition(0, 1.2, 4.4)
  setCameraTarget(0, -0.1, 0)
  setCameraFOV(50)
  setAmbientLight(rgba8(12, 16, 28, 255), 0.8)
  setLightDirection(-0.35, -0.85, -0.2)
}

export function update() {}

export function draw() {
  cls(ok ? rgba8(4, 7, 16, 255) : rgba8(42, 0, 0, 255))
  print(ok ? "MESH HELPERS OK" : "MESH HELPERS FAIL", 16, 16, ok ? rgba8(210, 255, 220, 255) : rgba8(255, 120, 120, 255))
}
