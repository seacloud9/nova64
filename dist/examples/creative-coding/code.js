// CREATIVE CODING 3D — Nova64
// 4 immersive generative 3D scenes:
//   1) Impossible Architecture — floating geometric structures
//   2) Crystal Growth — recursive crystalline formations
//   3) Sound Sculpture — audio-reactive abstract forms
//   4) Organic Forms — tentacles, blobs, and living shapes
// Controls: 1-4 = scene, SPACE = reset, WASD = orbit

let scene = 0;
let meshes = [];
let lights = [];
let time = 0;
let orbitAngle = 0;
let orbitDist = 20;
let orbitY = 6;
let initialized = false;

const SCENE_NAMES = [
  'Impossible Architecture',
  'Crystal Growth',
  'Sound Sculpture',
  'Organic Forms',
];

export function init() {
  initialized = false;
  setCameraFOV(65);
  buildScene(0);
}

function clearAll() {
  for (const id of meshes) removeMesh(id);
  meshes = [];
  lights = [];
  time = 0;
}

function buildScene(idx) {
  clearAll();
  clearScene();
  scene = idx;
  if (idx === 0) buildArchitecture();
  else if (idx === 1) buildCrystals();
  else if (idx === 2) buildSoundSculpture();
  else if (idx === 3) buildOrganicForms();
  initialized = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 0: IMPOSSIBLE ARCHITECTURE
// Floating staircases, rotating platforms, and Escher-like structures
// ═══════════════════════════════════════════════════════════════════════════

function buildArchitecture() {
  setAmbientLight(0x334455, 0.4);
  setFog(0x0a0a1e, 15, 60);
  enableBloom(1.2, 0.4, 0.15);
  createGradientSkybox(0x05051a, 0x0a0a2e, 0x151540);

  // Central tower of rotating cubes
  for (let i = 0; i < 12; i++) {
    const y = i * 2.5 - 12;
    const size = 2.5 - i * 0.12;
    const hue = (i * 30) % 360;
    const r = hue < 120 ? 255 : hue < 240 ? Math.floor(255 * (1 - (hue - 120) / 120)) : 0;
    const g =
      hue < 120
        ? Math.floor((255 * hue) / 120)
        : hue < 240
          ? 255
          : Math.floor(255 * (1 - (hue - 240) / 120));
    const b = hue >= 240 ? 255 : hue >= 120 ? Math.floor((255 * (hue - 120)) / 120) : 0;
    const color = (r << 16) | (g << 8) | b;
    const id = createCube(size, color, [0, y, 0], { material: 'holographic' });
    meshes.push(id);
  }

  // Floating stairs spiral
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 4;
    const radius = 8 + i * 0.3;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = i * 0.8 - 10;
    const id = createCube(1.5, 0x6644aa, [x, y, z], { material: 'metallic' });
    meshes.push(id);
  }

  // Floating arches
  for (let a = 0; a < 6; a++) {
    const baseAngle = (a / 6) * Math.PI * 2;
    const dist = 14;
    for (let p = 0; p < 8; p++) {
      const archAngle = (p / 7) * Math.PI;
      const ax = Math.cos(baseAngle) * dist + Math.cos(archAngle) * 3 * Math.cos(baseAngle);
      const az = Math.sin(baseAngle) * dist + Math.cos(archAngle) * 3 * Math.sin(baseAngle);
      const ay = Math.sin(archAngle) * 6;
      const id = createSphere(0.5, 0x88aaff, [ax, ay, az], { material: 'emissive' });
      meshes.push(id);
    }
  }

  const pl = createPointLight(0x6688ff, 2, 40, [0, 5, 0]);
  lights.push(pl);
  const pl2 = createPointLight(0xff6644, 1.5, 30, [10, -5, 10]);
  lights.push(pl2);

  orbitDist = 25;
  orbitY = 5;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: CRYSTAL GROWTH
// Recursive crystalline structures growing from a central seed
// ═══════════════════════════════════════════════════════════════════════════

function buildCrystals() {
  setAmbientLight(0x112233, 0.3);
  setFog(0x050510, 20, 70);
  enableBloom(1.8, 0.5, 0.2);
  createGradientSkybox(0x020208, 0x0a0a20, 0x101030);

  // Central crystal cluster
  _growCrystal(0, 0, 0, 4, 0, 3);

  // Satellite clusters
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const dist = 10 + Math.random() * 5;
    _growCrystal(
      Math.cos(angle) * dist,
      -3 + Math.random() * 2,
      Math.sin(angle) * dist,
      2 + Math.random() * 2,
      angle,
      2
    );
  }

  // Ground plane
  const ground = createPlane(40, 40, 0x0a0a1a, [0, -6, 0], { material: 'metallic' });
  meshes.push(ground);

  const pl = createPointLight(0x4488ff, 2.5, 50, [0, 8, 0]);
  lights.push(pl);
  const pl2 = createPointLight(0xff44aa, 1.5, 30, [-8, 3, 8]);
  lights.push(pl2);
  const pl3 = createPointLight(0x44ffaa, 1, 25, [8, 3, -8]);
  lights.push(pl3);

  orbitDist = 22;
  orbitY = 4;
}

function _growCrystal(x, y, z, size, baseAngle, depth) {
  if (depth <= 0 || size < 0.3) return;
  // Main crystal shard (tall thin cube)
  const height = size * (2 + Math.random());
  const colors = [0x4488ff, 0x88aaff, 0x44ddff, 0xaa88ff, 0x44ffdd];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const id = createCube(size * 0.5, color, [x, y + height / 2, z], { material: 'holographic' });
  meshes.push(id);
  // Scale to make it crystal-shaped
  setScale(id, size * 0.5, height, size * 0.5);
  // Slight random rotation
  rotateMesh(id, (Math.random() - 0.5) * 0.3, baseAngle, (Math.random() - 0.5) * 0.3);

  // Spawn children
  const children = 2 + Math.floor(Math.random() * 2);
  for (let c = 0; c < children; c++) {
    const cAngle = baseAngle + (c / children) * Math.PI * 2 + Math.random() * 0.5;
    const cDist = size * (0.8 + Math.random() * 0.5);
    const cx = x + Math.cos(cAngle) * cDist;
    const cz = z + Math.sin(cAngle) * cDist;
    const cy = y + height * (0.3 + Math.random() * 0.4);
    _growCrystal(cx, cy, cz, size * (0.4 + Math.random() * 0.2), cAngle, depth - 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: SOUND SCULPTURE
// Audio-reactive pulsing shapes (simulated waveform data)
// ═══════════════════════════════════════════════════════════════════════════

let waveRings = [];
let wavePillars = [];
const RING_COUNT = 6;
const PILLAR_COUNT = 32;

function buildSoundSculpture() {
  setAmbientLight(0x220022, 0.3);
  setFog(0x050008, 15, 50);
  enableBloom(2.0, 0.6, 0.25);
  createGradientSkybox(0x050005, 0x100010, 0x0a000a);
  waveRings = [];
  wavePillars = [];

  // Concentric rings of torus shapes
  for (let r = 0; r < RING_COUNT; r++) {
    const radius = 3 + r * 2.5;
    const id = createTorus(radius, 0.15, 0xff00ff, [0, 0, 0], { material: 'emissive' });
    meshes.push(id);
    waveRings.push({ id, baseRadius: radius, ring: r });
  }

  // Pillar ring
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2;
    const dist = 10;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const id = createCylinder(0.2, 1, 0x00ffaa, [x, 0, z], { material: 'emissive' });
    meshes.push(id);
    wavePillars.push({ id, angle, baseHeight: 1, idx: i });
  }

  // Central sphere
  const center = createSphere(1.5, 0xff44ff, [0, 0, 0], { material: 'holographic' });
  meshes.push(center);
  waveRings.push({ id: center, baseRadius: 1.5, ring: -1 });

  const pl = createPointLight(0xff00ff, 3, 40, [0, 5, 0]);
  lights.push(pl);
  const pl2 = createPointLight(0x00ffaa, 2, 30, [0, -3, 0]);
  lights.push(pl2);

  orbitDist = 18;
  orbitY = 6;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: ORGANIC FORMS
// Living tendrils, blobby masses, and alien flora
// ═══════════════════════════════════════════════════════════════════════════

let tendrils = [];
let blobNodes = [];

function buildOrganicForms() {
  setAmbientLight(0x0a2020, 0.4);
  setFog(0x030808, 15, 55);
  enableBloom(1.5, 0.5, 0.2);
  createGradientSkybox(0x020505, 0x051010, 0x0a1a1a);
  tendrils = [];
  blobNodes = [];

  // Central blob cluster
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 1 + Math.random() * 2;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = (Math.random() - 0.5) * 2;
    const size = 0.8 + Math.random() * 1.2;
    const id = createSphere(size, 0x22aa66, [x, y, z], { material: 'holographic' });
    meshes.push(id);
    blobNodes.push({ id, baseX: x, baseY: y, baseZ: z, size, phase: Math.random() * Math.PI * 2 });
  }

  // Tendrils — chains of small spheres
  for (let t = 0; t < 6; t++) {
    const baseAngle = (t / 6) * Math.PI * 2;
    const tendril = [];
    for (let s = 0; s < 12; s++) {
      const progress = s / 11;
      const dist = 2 + progress * 8;
      const twist = baseAngle + Math.sin(progress * Math.PI * 2) * 0.5;
      const x = Math.cos(twist) * dist;
      const z = Math.sin(twist) * dist;
      const y = Math.sin(progress * Math.PI) * 4 - 1;
      const size = 0.6 * (1 - progress * 0.6);
      const id = createSphere(size, 0x44cc88, [x, y, z], { material: 'emissive' });
      meshes.push(id);
      tendril.push({ id, baseX: x, baseY: y, baseZ: z, progress, phase: t + s * 0.3 });
    }
    tendrils.push(tendril);
  }

  // Floor fungal pads
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 8;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const size = 1 + Math.random() * 2;
    const id = createCylinder(size, 0.3, 0x115533, [x, -4, z], { material: 'metallic' });
    meshes.push(id);
  }

  // Ground
  const ground = createPlane(40, 40, 0x081810, [0, -4.5, 0], { material: 'metallic' });
  meshes.push(ground);

  const pl = createPointLight(0x44ffaa, 2, 40, [0, 6, 0]);
  lights.push(pl);
  const pl2 = createPointLight(0x22ff66, 1.5, 30, [-5, 2, 5]);
  lights.push(pl2);

  orbitDist = 20;
  orbitY = 5;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════

export function update(dt) {
  if (!initialized) return;
  time += dt;

  // Scene switching
  for (let i = 1; i <= 4; i++) {
    if (keyp('Digit' + i)) buildScene(i - 1);
  }
  if (keyp('Space')) buildScene(scene);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.5;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.5;
  if (key('KeyW') || key('ArrowUp')) orbitY += dt * 4;
  if (key('KeyS') || key('ArrowDown')) orbitY -= dt * 4;
  orbitY = Math.max(-5, Math.min(20, orbitY));

  // Auto-rotate slowly
  orbitAngle += dt * 0.15;

  const cx = Math.cos(orbitAngle) * orbitDist;
  const cz = Math.sin(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, 0, 0);

  // Scene-specific updates
  if (scene === 0) _updateArchitecture(dt);
  else if (scene === 1) _updateCrystals(dt);
  else if (scene === 2) _updateSoundSculpture(dt);
  else if (scene === 3) _updateOrganicForms(dt);
}

function _updateArchitecture(_dt) {
  // Rotate tower cubes
  for (let i = 0; i < Math.min(12, meshes.length); i++) {
    const speed = 0.3 + i * 0.08;
    const dir = i % 2 === 0 ? 1 : -1;
    rotateMesh(meshes[i], 0, speed * _dt * dir, 0);
  }
}

function _updateCrystals(_dt) {
  // Gentle pulse on crystals
  for (let i = 0; i < meshes.length; i++) {
    const pulse = 1 + Math.sin(time * 1.5 + i * 0.5) * 0.05;
    // Can't easily re-scale without storing original scale, so rotate slightly
    rotateMesh(meshes[i], 0, _dt * 0.1 * (i % 2 === 0 ? 1 : -1), 0);
  }
}

function _updateSoundSculpture(_dt) {
  // Simulate audio waveform
  for (const ring of waveRings) {
    if (ring.ring === -1) {
      // Central sphere pulses
      const pulse = 1 + Math.sin(time * 3) * 0.3 + Math.sin(time * 7) * 0.1;
      setScale(ring.id, pulse * ring.baseRadius, pulse * ring.baseRadius, pulse * ring.baseRadius);
    } else {
      const wave = Math.sin(time * 2 + ring.ring * 0.8) * 0.5;
      setPosition(ring.id, 0, wave, 0);
      const s = 1 + Math.sin(time * 3 + ring.ring) * 0.1;
      setScale(ring.id, s, s, s);
    }
  }

  // Pillars react to simulated audio
  for (const p of wavePillars) {
    const freq = Math.sin(time * 4 + p.angle * 3) * 0.5 + 0.5;
    const bass = Math.sin(time * 1.5) * 0.3 + 0.5;
    const height = 1 + freq * 6 + bass * 2;
    setScale(p.id, 1, height, 1);
    const x = Math.cos(p.angle) * 10;
    const z = Math.sin(p.angle) * 10;
    setPosition(p.id, x, height / 2 - 1, z);
  }
}

function _updateOrganicForms(_dt) {
  // Breathing blobs
  for (const b of blobNodes) {
    const breath = 1 + Math.sin(time * 1.2 + b.phase) * 0.2;
    const wobble = Math.sin(time * 0.8 + b.phase * 2) * 0.5;
    setPosition(b.id, b.baseX + wobble, b.baseY + Math.sin(time + b.phase) * 0.5, b.baseZ);
    setScale(b.id, breath * b.size, breath * b.size * 0.8, breath * b.size);
  }

  // Undulating tendrils
  for (const tendril of tendrils) {
    for (const seg of tendril) {
      const wave = Math.sin(time * 2 + seg.phase) * (1 + seg.progress * 2);
      const sway = Math.cos(time * 1.5 + seg.phase * 1.3) * seg.progress * 1.5;
      setPosition(seg.id, seg.baseX + sway, seg.baseY + wave * 0.5, seg.baseZ + wave * 0.3);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAW — 2D HUD overlay
// ═══════════════════════════════════════════════════════════════════════════

export function draw() {
  const name = SCENE_NAMES[scene];
  drawPanel(8, 4, 240, 28, {
    bgColor: rgba8(0, 0, 0, 140),
    borderLight: rgba8(80, 80, 120, 100),
    borderDark: rgba8(40, 40, 60, 100),
  });
  print(`${scene + 1}/4  ${name}`, 16, 12, rgba8(200, 200, 255));
  print('[1-4] SCENE  [SPACE] RESET  [WASD] ORBIT', 10, H - 18, rgba8(100, 100, 140));
  print('CREATIVE CODING 3D', W - 170, 12, rgba8(120, 80, 180));
}
