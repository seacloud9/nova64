// ── Nova64 Shader Showcase ──
// Gallery of all 12 TSL material presets on rotating objects

let t = 0;
const meshIds = [];
const labels = [];

export function init() {
  // Camera — pulled back to see the full grid
  setCameraPosition(0, 8, 20);
  setCameraTarget(0, 1, 0);
  setCameraFOV(55);

  // Atmosphere
  setFog(0x0a0a1a, 15, 60);
  setAmbientLight(0x222244);
  createPointLight(0xffffff, 1.5, 50, [0, 12, 10]);
  createPointLight(0xff6600, 1.0, 40, [-10, 8, -5]);
  createPointLight(0x0066ff, 1.0, 40, [10, 8, -5]);

  enableBloom(0.8, 0.3, 0.4);

  // ── 12 presets: 2 rows × 6 columns ──
  // Top row: original 6 presets (on spheres)
  // Bottom row: new Phase 1 presets (on cubes)
  const presets = [
    // Row 1 — existing presets (spheres)
    { name: 'plasma', fn: () => createTSLMaterial('plasma', { speed: 2.0 }) },
    { name: 'galaxy', fn: () => createTSLMaterial('galaxy', { speed: 0.5 }) },
    { name: 'lava', fn: () => createTSLMaterial('lava', { speed: 1.0 }) },
    { name: 'electricity', fn: () => createTSLMaterial('electricity', { speed: 3.0 }) },
    { name: 'rainbow', fn: () => createTSLMaterial('rainbow', { speed: 1.0 }) },
    { name: 'void', fn: () => createTSLMaterial('void', { speed: 0.3 }) },
    // Row 2 — new Phase 1 presets (cubes, using convenience functions)
    { name: 'lava2', fn: () => createLavaMaterial({ speed: 0.2, intensity: 3.0 }) },
    { name: 'vortex', fn: () => createVortexMaterial({ speed: 1.0 }) },
    { name: 'plasma2', fn: () => createPlasmaMaterial({ speed: 1.0 }) },
    { name: 'water', fn: () => createWaterMaterial({ speed: 0.5 }) },
    { name: 'hologram', fn: () => createHologramMaterial({ speed: 1.0 }) },
    { name: 'shockwave', fn: () => createShockwaveMaterial({ speed: 0.3 }) },
  ];

  const cols = 6;
  const spacingX = 4.5;
  const spacingZ = 5.5;
  const startX = -(cols - 1) * spacingX * 0.5;

  for (let i = 0; i < presets.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacingX;
    const z = -row * spacingZ;
    const y = 2;

    // Row 0 = spheres, Row 1 = cubes
    let id;
    if (row === 0) {
      id = createSphere(1.2, 0xffffff, [x, y, z]);
    } else {
      id = createCube(2.0, 0xffffff, [x, y, z]);
    }

    const mesh = getMesh(id);
    if (mesh) {
      const mat = presets[i].fn();
      mesh.traverse(child => {
        if (child.isMesh) child.material = mat;
      });
    }

    meshIds.push(id);
    labels.push({ name: presets[i].name, col, row });
  }

  // Floor
  const floor = getMesh(createPlane(40, 20, 0x111122, [0, -0.1, -2.5]));
  if (floor) floor.rotation.x = -Math.PI / 2;
}

export function update(dt) {
  t += dt;

  // Slowly rotate all meshes
  for (const id of meshIds) {
    rotateMesh(id, 0, dt * 0.4, 0);
  }

  // Gentle camera sway
  const cx = Math.sin(t * 0.15) * 2;
  const cy = 8 + Math.sin(t * 0.08) * 0.5;
  setCameraPosition(cx, cy, 20);
}

export function draw() {
  const W = typeof screenWidth === 'function' ? screenWidth() : 640;

  // Title
  print('TSL Shader Pack — All Presets', 10, 8, 0x00ffcc, 2);

  // Row labels
  print('ORIGINAL', 10, 30, 0x888888);
  print('PHASE 1 (NEW)', 10, 190, 0x00ff88);

  // Per-shader labels
  const cols = 6;
  const labelStartX = 52;
  const labelSpacing = Math.floor((W - 100) / cols);

  for (const { name, col, row } of labels) {
    const lx = labelStartX + col * labelSpacing;
    const ly = row === 0 ? 165 : 325;
    print(name, lx, ly, row === 0 ? 0xaaaaaa : 0x44ffaa);
  }
}
