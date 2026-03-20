// GPU Particle System Demo — Nova64
// Showcases createParticleSystem, burstParticles, setParticleEmitter, updateParticles
// Controls: 1/2/3 = preset, SPACE = burst, WASD = camera orbit

let scene = 0; // 0=fire, 1=snow, 2=sparks
let systemIds = [];
let orbitAngle = 0;
let orbitDist = 20;
let orbitY = 8;
let frameCount = 0;
let burstCooldown = 0;

const SCENES = ['🔥 Fire', '❄️ Snow', '⚡ Sparks'];

export function init() {
  setCameraPosition(0, orbitY, orbitDist);
  setCameraTarget(0, 2, 0);
  setCameraFOV(70);

  setAmbientLight(0x111111, 1.0);
  setFog(0x050505, 15, 60);
  enableBloom(2.0, 0.6, 0.1);

  // Ground
  const ground = createPlane(30, 30, 0x111111, [0, 0, 0], {
    material: 'standard',
    roughness: 0.9,
  });
  setRotation(ground, -Math.PI / 2, 0, 0);

  buildScene(scene);
}

function clearSystems() {
  systemIds.forEach(id => removeParticleSystem(id));
  systemIds = [];
}

function buildScene(idx) {
  clearSystems();

  if (idx === 0) {
    // Fire: rising orange/red particles with upward drift
    const fireBase = createParticleSystem(300, {
      shape: 'sphere',
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 3.0,
      gravity: -2, // slight upward pull
      drag: 0.98,
      emitterX: 0,
      emitterY: 0.2,
      emitterZ: 0,
      emitRate: 80,
      minLife: 0.6,
      maxLife: 1.4,
      minSpeed: 2,
      maxSpeed: 5,
      spread: 0.5,
      minSize: 0.08,
      maxSize: 0.35,
      startColor: 0xff6600,
      endColor: 0x440000,
    });
    systemIds.push(fireBase);

    // Embers (smaller, faster, wider spread)
    const embers = createParticleSystem(100, {
      shape: 'sphere',
      color: 0xffaa00,
      emissive: 0xffcc00,
      emissiveIntensity: 4.0,
      gravity: -1,
      drag: 0.92,
      emitterX: 0,
      emitterY: 1.0,
      emitterZ: 0,
      emitRate: 20,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 4,
      maxSpeed: 10,
      spread: 1.2,
      minSize: 0.03,
      maxSize: 0.1,
      startColor: 0xffffff,
      endColor: 0xff2200,
    });
    systemIds.push(embers);

    // Light
    createPointLight(0xff4400, 15, [0, 2, 0]);
  } else if (idx === 1) {
    // Snow: wide gentle drift downward
    const snow = createParticleSystem(500, {
      shape: 'sphere',
      color: 0xccddff,
      emissive: 0x8899cc,
      emissiveIntensity: 0.5,
      gravity: 2, // falls down
      drag: 0.99,
      emitterX: 0,
      emitterY: 12,
      emitterZ: 0,
      emitRate: 60,
      minLife: 3.0,
      maxLife: 5.0,
      minSpeed: 0.5,
      maxSpeed: 2,
      spread: Math.PI, // full hemisphere
      minSize: 0.05,
      maxSize: 0.2,
      startColor: 0xffffff,
      endColor: 0xaabbdd,
    });
    systemIds.push(snow);

    setAmbientLight(0x223355, 0.8);
    setFog(0x0a0a1a, 20, 50);
  } else if (idx === 2) {
    // Sparks: fast radial burst from center, with gravity
    const sparks = createParticleSystem(400, {
      shape: 'sphere',
      color: 0xffdd00,
      emissive: 0xffaa00,
      emissiveIntensity: 5.0,
      gravity: 15,
      drag: 0.93,
      emitterX: 0,
      emitterY: 2,
      emitterZ: 0,
      emitRate: 0, // manual burst only
      minLife: 0.5,
      maxLife: 1.5,
      minSpeed: 5,
      maxSpeed: 18,
      spread: Math.PI,
      minSize: 0.02,
      maxSize: 0.12,
      startColor: 0xffffff,
      endColor: 0xff2200,
    });
    systemIds.push(sparks);

    // Blue electric sparks (second system)
    const electric = createParticleSystem(200, {
      shape: 'sphere',
      color: 0x00aaff,
      emissive: 0x0055ff,
      emissiveIntensity: 6.0,
      gravity: 12,
      drag: 0.9,
      emitterX: 0,
      emitterY: 2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.3,
      maxLife: 0.9,
      minSpeed: 8,
      maxSpeed: 20,
      spread: Math.PI,
      minSize: 0.015,
      maxSize: 0.08,
      startColor: 0xaaffff,
      endColor: 0x000044,
    });
    systemIds.push(electric);

    // Auto-burst every 2s
    setParticleEmitter(sparks, { emitRate: 0 });
    setParticleEmitter(electric, { emitRate: 0 });
    burstParticles(sparks, 80);
    burstParticles(electric, 40);
  }
}

export function update(dt) {
  frameCount++;
  burstCooldown = Math.max(0, burstCooldown - dt);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(20, orbitY + dt * 5);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(1, orbitY - dt * 5);

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, 2, 0);

  // Scene switch
  if (keyp('Digit1') && scene !== 0) {
    scene = 0;
    buildScene(scene);
  }
  if (keyp('Digit2') && scene !== 1) {
    scene = 1;
    buildScene(scene);
  }
  if (keyp('Digit3') && scene !== 2) {
    scene = 2;
    buildScene(scene);
  }

  // Manual burst (SPACE)
  if (keyp('Space') && burstCooldown <= 0) {
    burstCooldown = 0.15;
    systemIds.forEach(id => burstParticles(id, 30));
  }

  // Auto-reburst sparks scene
  if (scene === 2 && frameCount % 120 === 0) {
    if (systemIds[0]) burstParticles(systemIds[0], 120);
    if (systemIds[1]) burstParticles(systemIds[1], 60);
  }

  // Step all particle physics + GPU upload
  updateParticles(dt);
}

export function draw() {
  // HUD
  const stats = systemIds[0] ? getParticleStats(systemIds[0]) : null;
  const total = systemIds.reduce((s, id) => {
    const st = getParticleStats(id);
    return s + (st ? st.active : 0);
  }, 0);

  print(`Scene: ${SCENES[scene]}`, 10, 10, 0xffffff);
  print('[1] Fire  [2] Snow  [3] Sparks', 10, 22, 0xaaaaaa);
  print('[SPACE] Burst  [WASD] Orbit', 10, 34, 0xaaaaaa);
  print(`Particles: ${total}`, 10, 50, 0x00ffaa);
  print('Nova64 GPU Particle System', 10, 220, 0x555555);
}
