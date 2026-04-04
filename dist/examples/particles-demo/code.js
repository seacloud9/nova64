// GPU Particle System Demo — Nova64
// 5 stunning scenes: inferno, blizzard, electric forge, galaxy, waterfall
// Controls: 1-5 = scene, SPACE/TAP = burst, WASD = orbit, QE = zoom

let scene = 0;
let systemIds = [];
let lightIds = [];
let propIds = [];
let orbitAngle = 0.3;
let orbitDist = 18;
let orbitY = 8;
let frameCount = 0;
let burstCooldown = 0;
let sceneTime = 0;

const SCENES = [
  '\uD83D\uDD25 Inferno',
  '\u2745 Blizzard',
  '\u26A1 Forge',
  '\uD83C\uDF0C Galaxy',
  '\uD83C\uDF0A Waterfall',
];

export function init() {
  setCameraFOV(70);
  buildScene(scene);
}

function clearSystems() {
  systemIds.forEach(id => removeParticleSystem(id));
  systemIds = [];
  lightIds = [];
  propIds = [];
  sceneTime = 0;
}

function buildScene(idx) {
  clearSystems();
  clearScene();
  if (idx === 0) buildFire();
  else if (idx === 1) buildBlizzard();
  else if (idx === 2) buildForge();
  else if (idx === 3) buildGalaxy();
  else if (idx === 4) buildWaterfall();
}

// ── Scene 0: Inferno — 3 brazier fire columns with smoke and embers ───────────
function buildFire() {
  setAmbientLight(0x110400, 0.25);
  setFog(0x050100, 12, 50);
  enableBloom(2.5, 0.7, 0.2);

  const floor = createPlane(40, 40, 0x221100, [0, 0, 0], { material: 'standard', roughness: 1 });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  const cols = [
    [-5, 0, 0],
    [0, 0, -3],
    [5, 0, 0],
  ];
  const endColors = [0xff3300, 0xff6600, 0xff9900];
  for (const [px, , pz] of cols) {
    propIds.push(
      createCylinder(0.35, 2.5, 0x443322, [px, 1.25, pz], { material: 'standard', roughness: 0.9 })
    );
    propIds.push(
      createTorus(0.55, 0.15, 0x553300, [px, 2.6, pz], {
        material: 'standard',
        roughness: 0.6,
        metalness: 0.4,
      })
    );
  }

  for (let f = 0; f < 3; f++) {
    const [fpx, , fpz] = cols[f];
    // Core flames
    systemIds.push(
      createParticleSystem(280, {
        shape: 'sphere',
        segments: 3,
        gravity: -5,
        drag: 0.97,
        emitterX: fpx,
        emitterY: 2.7,
        emitterZ: fpz,
        emitRate: 75,
        minLife: 0.8,
        maxLife: 1.6,
        minSpeed: 2,
        maxSpeed: 5,
        spread: 0.35,
        minSize: 0.06,
        maxSize: 0.28,
        startColor: 0xffdd00,
        endColor: endColors[f],
      })
    );
    // Wide embers
    systemIds.push(
      createParticleSystem(100, {
        shape: 'sphere',
        segments: 3,
        gravity: -1.5,
        drag: 0.91,
        emitterX: fpx,
        emitterY: 3.0,
        emitterZ: fpz,
        emitRate: 20,
        minLife: 0.5,
        maxLife: 2.5,
        minSpeed: 3,
        maxSpeed: 10,
        spread: 1.2,
        minSize: 0.02,
        maxSize: 0.07,
        startColor: 0xffffff,
        endColor: 0xff1100,
      })
    );
    // Dark smoke
    systemIds.push(
      createParticleSystem(130, {
        shape: 'sphere',
        segments: 4,
        gravity: -0.8,
        drag: 0.99,
        emitterX: fpx,
        emitterY: 4.2,
        emitterZ: fpz,
        emitRate: 28,
        minLife: 2.0,
        maxLife: 3.5,
        minSpeed: 0.4,
        maxSpeed: 1.2,
        spread: 0.6,
        minSize: 0.15,
        maxSize: 0.55,
        startColor: 0x333333,
        endColor: 0x111111,
      })
    );
    // Flickering point light per column
    lightIds.push({
      id: createPointLight(0xff5500, 6, 18, fpx, 3.5, fpz),
      baseX: fpx,
      baseZ: fpz,
      phase: f * 2.1,
    });
  }
}

// ── Scene 1: Blizzard — howling wind-driven snow with aurora ──────────────────
function buildBlizzard() {
  setAmbientLight(0x0a1525, 0.5);
  setFog(0x060c18, 14, 50);
  enableBloom(1.2, 0.5, 0.3);

  const floor = createPlane(60, 60, 0x8899bb, [0, 0, 0], {
    material: 'standard',
    roughness: 0.3,
    metalness: 0.1,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  [
    [-8, 0.5, -4],
    [5, 0.8, 3],
    [-3, 0.4, 7],
    [9, 0.6, -2],
    [-6, 0.3, 5],
    [4, 0.5, -8],
  ].forEach(([rx, ry, rz]) =>
    propIds.push(
      createSphere(0.8, 0x99aabb, [rx, ry, rz], {
        material: 'standard',
        roughness: 0.4,
        metalness: 0.05,
      })
    )
  );

  // Wind-driven snow
  systemIds.push(
    createParticleSystem(900, {
      shape: 'sphere',
      segments: 3,
      gravity: 3.5,
      drag: 0.995,
      emitterX: -10,
      emitterY: 10,
      emitterZ: 0,
      emitRate: 200,
      minLife: 2.5,
      maxLife: 4.5,
      minSpeed: 7,
      maxSpeed: 15,
      spread: 0.85,
      minSize: 0.04,
      maxSize: 0.18,
      startColor: 0xffffff,
      endColor: 0xaabbdd,
    })
  );
  // Fine drifting mist
  systemIds.push(
    createParticleSystem(400, {
      shape: 'sphere',
      segments: 3,
      gravity: 1.0,
      drag: 0.998,
      emitterX: 0,
      emitterY: 8,
      emitterZ: 0,
      emitRate: 80,
      minLife: 4.0,
      maxLife: 7.0,
      minSpeed: 0.5,
      maxSpeed: 2.5,
      spread: Math.PI,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xddeeff,
      endColor: 0x6688aa,
    })
  );
  // Ground ice crystals blasted up by wind
  systemIds.push(
    createParticleSystem(200, {
      shape: 'sphere',
      segments: 3,
      gravity: 12,
      drag: 0.93,
      emitterX: 0,
      emitterY: 0.1,
      emitterZ: 0,
      emitRate: 35,
      minLife: 0.5,
      maxLife: 1.3,
      minSpeed: 2,
      maxSpeed: 8,
      spread: 0.6,
      minSize: 0.02,
      maxSize: 0.09,
      startColor: 0xeeffff,
      endColor: 0x3366aa,
    })
  );

  lightIds.push({
    id: createPointLight(0x0044ff, 3, 40, 0, 14, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    aurora: true,
  });
  lightIds.push({
    id: createPointLight(0x00ff88, 2, 30, 5, 11, -5),
    baseX: 5,
    baseZ: -5,
    phase: 1.7,
    aurora: true,
  });
}

// ── Scene 2: Forge — electric anvil with sparks and plasma ────────────────────
function buildForge() {
  setAmbientLight(0x050510, 0.2);
  setFog(0x020208, 12, 40);
  enableBloom(2.5, 0.7, 0.15);

  const floor = createPlane(30, 30, 0x1a1a2a, [0, 0, 0], {
    material: 'standard',
    roughness: 0.8,
    metalness: 0.6,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  propIds.push(
    createCube(2.5, 0.6, 0x222222, [0, 0.3, 0], {
      material: 'standard',
      roughness: 0.5,
      metalness: 0.9,
    })
  );
  propIds.push(
    createCube(2.0, 0.4, 0x333344, [0, 0.8, 0], {
      material: 'standard',
      roughness: 0.3,
      metalness: 1.0,
    })
  );
  propIds.push(
    createCylinder(0.5, 0.2, 0xff6600, [0, 1.1, 0], {
      material: 'standard',
      roughness: 0.6,
      metalness: 0.8,
      emissive: 0xff3300,
      emissiveIntensity: 3.0,
    })
  );

  // Gold sparks — burst only
  systemIds.push(
    createParticleSystem(700, {
      shape: 'sphere',
      segments: 3,
      gravity: 18,
      drag: 0.91,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.4,
      maxLife: 1.2,
      minSpeed: 6,
      maxSpeed: 24,
      spread: Math.PI * 0.7,
      minSize: 0.015,
      maxSize: 0.1,
      startColor: 0xffffff,
      endColor: 0xff2200,
    })
  );
  // Blue plasma arcs — burst only
  systemIds.push(
    createParticleSystem(300, {
      shape: 'sphere',
      segments: 3,
      gravity: 8,
      drag: 0.88,
      emitterX: 0,
      emitterY: 1.2,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.2,
      maxLife: 0.7,
      minSpeed: 8,
      maxSpeed: 20,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.06,
      startColor: 0xaaffff,
      endColor: 0x0000ff,
    })
  );
  // Constant embers from hot metal
  systemIds.push(
    createParticleSystem(150, {
      shape: 'sphere',
      segments: 3,
      gravity: 5,
      drag: 0.94,
      emitterX: 0,
      emitterY: 1.1,
      emitterZ: 0,
      emitRate: 40,
      minLife: 0.5,
      maxLife: 1.8,
      minSpeed: 1,
      maxSpeed: 5,
      spread: 0.8,
      minSize: 0.02,
      maxSize: 0.08,
      startColor: 0xffcc00,
      endColor: 0xff2200,
    })
  );
  // Lightning streaks — burst only
  systemIds.push(
    createParticleSystem(120, {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 0.85,
      emitterX: 0,
      emitterY: 3,
      emitterZ: 0,
      emitRate: 0,
      minLife: 0.08,
      maxLife: 0.25,
      minSpeed: 12,
      maxSpeed: 35,
      spread: 0.3,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0xffffff,
      endColor: 0x4444ff,
    })
  );

  lightIds.push({
    id: createPointLight(0xff4400, 8, 15, 0, 2, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    forge: true,
  });
  lightIds.push({
    id: createPointLight(0x4488ff, 5, 12, 0, 3, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    electric: true,
  });
  burstCooldown = 0.1; // kick off first hammer blow immediately
}

// ── Scene 3: Galaxy — swirling spiral arms with nebula dust and stellar nursery
function buildGalaxy() {
  setAmbientLight(0x020208, 0.15);
  setFog(0x000004, 40, 80);
  enableBloom(1.8, 0.6, 0.1);
  createSolidSkybox(0x000005);

  // Central black hole — emissive core
  const core = createSphere(0.6, 0x221144, [0, 0, 0], {
    material: 'standard',
    emissive: 0x6633ff,
    emissiveIntensity: 5.0,
  });
  propIds.push(core);

  // Accretion disc ring
  const disc = createTorus(2.0, 0.15, 0xff8800, [0, 0, 0], {
    material: 'standard',
    emissive: 0xff6600,
    emissiveIntensity: 2.5,
    metalness: 0.8,
  });
  setRotation(disc, Math.PI * 0.45, 0, 0);
  propIds.push(disc);

  // Spiral arm stars — 3 arms
  for (let arm = 0; arm < 3; arm++) {
    const armOffset = (arm * Math.PI * 2) / 3;
    const armColor = [0x8888ff, 0xff88ff, 0x88ffff][arm];
    const armEnd = [0x2222aa, 0xaa22aa, 0x22aaaa][arm];
    systemIds.push(
      createParticleSystem(600, {
        shape: 'sphere',
        segments: 3,
        gravity: 0,
        drag: 1.0,
        emitterX: Math.cos(armOffset) * 4,
        emitterY: 0,
        emitterZ: Math.sin(armOffset) * 4,
        emitRate: 80,
        minLife: 5.0,
        maxLife: 10.0,
        minSpeed: 0.1,
        maxSpeed: 0.6,
        spread: Math.PI,
        minSize: 0.02,
        maxSize: 0.12,
        startColor: armColor,
        endColor: armEnd,
      })
    );
  }

  // Central nebula dust — warm glow
  systemIds.push(
    createParticleSystem(400, {
      shape: 'sphere',
      segments: 4,
      gravity: 0,
      drag: 1.0,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 50,
      minLife: 4.0,
      maxLife: 8.0,
      minSpeed: 0.2,
      maxSpeed: 1.5,
      spread: Math.PI,
      minSize: 0.08,
      maxSize: 0.35,
      startColor: 0xff6644,
      endColor: 0x220044,
    })
  );

  // Stellar nursery — bright blue sparks
  systemIds.push(
    createParticleSystem(200, {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 0.995,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 30,
      minLife: 1.0,
      maxLife: 3.0,
      minSpeed: 2,
      maxSpeed: 6,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.05,
      startColor: 0xffffff,
      endColor: 0x4488ff,
    })
  );

  // Distant background stars — slow drift
  systemIds.push(
    createParticleSystem(500, {
      shape: 'sphere',
      segments: 3,
      gravity: 0,
      drag: 1.0,
      emitterX: 0,
      emitterY: 0,
      emitterZ: 0,
      emitRate: 35,
      minLife: 8.0,
      maxLife: 15.0,
      minSpeed: 0.05,
      maxSpeed: 0.3,
      spread: Math.PI,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0xffffff,
      endColor: 0x8888cc,
    })
  );

  lightIds.push({
    id: createPointLight(0x6633ff, 6, 25, 0, 0, 0),
    baseX: 0,
    baseZ: 0,
    phase: 0,
    galaxy: true,
  });
  lightIds.push({
    id: createPointLight(0xff6600, 3, 15, 3, 0, 0),
    baseX: 3,
    baseZ: 0,
    phase: 1.0,
    galaxy: true,
  });

  orbitY = 6;
  orbitDist = 20;
}

// ── Scene 4: Waterfall — cascading water with mist and rainbow spray ──────────
function buildWaterfall() {
  setAmbientLight(0x1a3322, 0.6);
  setFog(0x102818, 20, 55);
  enableBloom(0.8, 0.4, 0.35);

  // Ground
  const floor = createPlane(50, 50, 0x225522, [0, 0, 0], {
    material: 'standard',
    roughness: 0.9,
  });
  setRotation(floor, -Math.PI / 2, 0, 0);
  propIds.push(floor);

  // Cliff face
  propIds.push(
    createCube(8, 12, 0x444433, [0, 6, -6], {
      material: 'standard',
      roughness: 0.95,
      metalness: 0.1,
    })
  );
  // Ledge
  propIds.push(
    createCube(6, 0.5, 0x555544, [0, 12, -4], {
      material: 'standard',
      roughness: 0.8,
    })
  );

  // Pool at base
  const pool = createCylinder(5, 0.3, 0x224488, [0, 0.15, 4], {
    material: 'standard',
    roughness: 0.1,
    metalness: 0.3,
  });
  propIds.push(pool);

  // Rocks around pool
  [
    [-3, 0.4, 6],
    [3.5, 0.5, 5],
    [-2, 0.3, 8],
    [4, 0.3, 7],
    [-4.5, 0.6, 3],
  ].forEach(([rx, ry, rz]) =>
    propIds.push(
      createSphere(0.7, 0x555544, [rx, ry, rz], {
        material: 'standard',
        roughness: 0.85,
      })
    )
  );

  // Main waterfall stream — falling water
  systemIds.push(
    createParticleSystem(800, {
      shape: 'sphere',
      segments: 3,
      gravity: 14,
      drag: 0.99,
      emitterX: 0,
      emitterY: 12,
      emitterZ: -2.5,
      emitRate: 180,
      minLife: 1.0,
      maxLife: 1.8,
      minSpeed: 0.5,
      maxSpeed: 2.0,
      spread: 0.15,
      minSize: 0.05,
      maxSize: 0.2,
      startColor: 0xaaddff,
      endColor: 0x4488cc,
    })
  );

  // Splash at base — upward spray
  systemIds.push(
    createParticleSystem(500, {
      shape: 'sphere',
      segments: 3,
      gravity: 12,
      drag: 0.92,
      emitterX: 0,
      emitterY: 0.5,
      emitterZ: 2,
      emitRate: 100,
      minLife: 0.5,
      maxLife: 1.5,
      minSpeed: 3,
      maxSpeed: 10,
      spread: 0.9,
      minSize: 0.03,
      maxSize: 0.12,
      startColor: 0xffffff,
      endColor: 0x88bbdd,
    })
  );

  // Mist cloud — large slow particles
  systemIds.push(
    createParticleSystem(300, {
      shape: 'sphere',
      segments: 4,
      gravity: -0.3,
      drag: 0.998,
      emitterX: 0,
      emitterY: 1.5,
      emitterZ: 4,
      emitRate: 40,
      minLife: 3.0,
      maxLife: 6.0,
      minSpeed: 0.3,
      maxSpeed: 1.5,
      spread: Math.PI * 0.8,
      minSize: 0.15,
      maxSize: 0.6,
      startColor: 0xccddee,
      endColor: 0x446655,
    })
  );

  // Rainbow spray — colorful fine droplets
  systemIds.push(
    createParticleSystem(200, {
      shape: 'sphere',
      segments: 3,
      gravity: 6,
      drag: 0.95,
      emitterX: 2,
      emitterY: 2,
      emitterZ: 3,
      emitRate: 30,
      minLife: 0.8,
      maxLife: 2.0,
      minSpeed: 1,
      maxSpeed: 4,
      spread: 0.7,
      minSize: 0.02,
      maxSize: 0.06,
      startColor: 0xff8844,
      endColor: 0x4444ff,
    })
  );

  // Stream flowing away from pool
  systemIds.push(
    createParticleSystem(200, {
      shape: 'sphere',
      segments: 3,
      gravity: 2,
      drag: 0.97,
      emitterX: 0,
      emitterY: 0.2,
      emitterZ: 8,
      emitRate: 40,
      minLife: 2.0,
      maxLife: 4.0,
      minSpeed: 0.5,
      maxSpeed: 2.0,
      spread: 0.3,
      minSize: 0.03,
      maxSize: 0.1,
      startColor: 0x88ccee,
      endColor: 0x337755,
    })
  );

  lightIds.push({
    id: createPointLight(0x88bbff, 4, 20, 0, 6, -1),
    baseX: 0,
    baseZ: -1,
    phase: 0,
    waterfall: true,
  });
  lightIds.push({
    id: createPointLight(0x44aa66, 3, 18, 0, 2, 5),
    baseX: 0,
    baseZ: 5,
    phase: 1.5,
    waterfall: true,
  });

  orbitY = 6;
  orbitDist = 22;
}

export function update(dt) {
  frameCount++;
  sceneTime += dt;
  burstCooldown = Math.max(0, burstCooldown - dt);

  // Camera orbit
  if (key('KeyA') || key('ArrowLeft')) orbitAngle -= dt * 1.2;
  if (key('KeyD') || key('ArrowRight')) orbitAngle += dt * 1.2;
  if (key('KeyW') || key('ArrowUp')) orbitY = Math.min(20, orbitY + dt * 5);
  if (key('KeyS') || key('ArrowDown')) orbitY = Math.max(2, orbitY - dt * 5);
  if (key('KeyQ')) orbitDist = Math.min(40, orbitDist + dt * 8);
  if (key('KeyE')) orbitDist = Math.max(6, orbitDist - dt * 8);

  const cx = Math.sin(orbitAngle) * orbitDist;
  const cz = Math.cos(orbitAngle) * orbitDist;
  setCameraPosition(cx, orbitY, cz);
  setCameraTarget(0, scene === 3 ? 0 : 2, 0);

  // Scene switch
  for (let i = 0; i < 5; i++) {
    if (keyp('Digit' + (i + 1)) || keyp('Numpad' + (i + 1))) {
      scene = i;
      buildScene(i);
    }
  }

  // Manual burst
  if ((keyp('Space') || btnp(13)) && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 0.3;
  }

  // Animated lights
  for (const ldata of lightIds) {
    const t = sceneTime + ldata.phase;
    if (ldata.aurora) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.4) * 6,
        10 + Math.sin(t * 0.7) * 2,
        ldata.baseZ + Math.cos(t * 0.3) * 4
      );
    } else if (ldata.forge) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.4,
        1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4
      );
    } else if (ldata.electric) {
      setPointLightPosition(
        ldata.id,
        (Math.random() - 0.5) * 0.7,
        2.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.7
      );
    } else if (ldata.galaxy) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.3) * 2,
        Math.sin(t * 0.5) * 1.5,
        ldata.baseZ + Math.cos(t * 0.3) * 2
      );
    } else if (ldata.waterfall) {
      setPointLightPosition(
        ldata.id,
        ldata.baseX + Math.sin(t * 0.8) * 0.5,
        (ldata.phase === 0 ? 6 : 2) + Math.sin(t * 1.2) * 0.5,
        ldata.baseZ + Math.cos(t * 0.6) * 0.3
      );
    } else {
      // Fire column flicker
      setPointLightPosition(
        ldata.id,
        ldata.baseX + (Math.random() - 0.5) * 0.7,
        2.8 + Math.sin(t * 14 + ldata.phase) * 0.6,
        ldata.baseZ + (Math.random() - 0.5) * 0.5
      );
    }
  }

  // Blizzard: animate wind gust and periodic ice burst
  if (scene === 1) {
    if (systemIds[0]) {
      setParticleEmitter(systemIds[0], {
        emitterX: -10 + Math.sin(sceneTime * 0.25) * 5,
        emitterY: 9 + Math.sin(sceneTime * 0.5) * 2,
      });
    }
    if (frameCount % 75 === 0 && systemIds[2]) burstParticles(systemIds[2], 50);
  }

  // Forge: auto-hammer every 1.4s
  if (scene === 2 && burstCooldown <= 0) {
    triggerBurst();
    burstCooldown = 1.4;
  }

  // Galaxy: rotate spiral arm emitters around center
  if (scene === 3) {
    for (let arm = 0; arm < 3; arm++) {
      const baseAngle = (arm * Math.PI * 2) / 3 + sceneTime * 0.15;
      const r = 4 + Math.sin(sceneTime * 0.3 + arm) * 1.5;
      if (systemIds[arm]) {
        setParticleEmitter(systemIds[arm], {
          emitterX: Math.cos(baseAngle) * r,
          emitterY: Math.sin(sceneTime * 0.2 + arm) * 0.5,
          emitterZ: Math.sin(baseAngle) * r,
        });
      }
    }
  }

  // Waterfall: slight wind sway on mist and splash
  if (scene === 4) {
    const windX = Math.sin(sceneTime * 0.5) * 1.5;
    if (systemIds[1]) {
      setParticleEmitter(systemIds[1], {
        emitterX: windX * 0.3,
      });
    }
    if (systemIds[2]) {
      setParticleEmitter(systemIds[2], {
        emitterX: windX * 0.5,
      });
    }
    // Periodic big splash
    if (frameCount % 90 === 0 && systemIds[1]) burstParticles(systemIds[1], 60);
  }

  updateParticles(dt);
}

function triggerBurst() {
  if (scene === 0) {
    for (let i = 1; i < systemIds.length; i += 3) burstParticles(systemIds[i], 50);
  } else if (scene === 1) {
    if (systemIds[2]) burstParticles(systemIds[2], 90);
  } else if (scene === 2) {
    if (systemIds[0]) burstParticles(systemIds[0], 180);
    if (systemIds[1]) burstParticles(systemIds[1], 100);
    if (systemIds[3]) burstParticles(systemIds[3], 70);
  } else if (scene === 3) {
    // Supernova burst from center
    if (systemIds[4]) burstParticles(systemIds[4], 120);
    if (systemIds[3]) burstParticles(systemIds[3], 80);
  } else if (scene === 4) {
    // Big splash burst
    if (systemIds[1]) burstParticles(systemIds[1], 150);
    if (systemIds[3]) burstParticles(systemIds[3], 60);
  }
}

export function draw() {
  const total = systemIds.reduce((s, id) => {
    const st = getParticleStats(id);
    return s + (st ? st.active : 0);
  }, 0);

  drawRoundedRect(0, 0, 320, 14, 0, rgba8(0, 0, 0, 150));
  printCentered(
    '[1] Fire  [2] Snow  [3] Forge  [4] Galaxy  [5] Water',
    160,
    2,
    rgba8(220, 200, 150, 255)
  );

  drawRoundedRect(0, 220, 320, 20, 0, rgba8(0, 0, 0, 130));
  print('Scene: ' + SCENES[scene] + '   Particles: ' + total, 6, 222, rgba8(180, 255, 180, 255));
  print('TAP/[SPACE] Burst  [WASD] Orbit  [QE] Zoom', 6, 231, rgba8(110, 110, 110, 220));
}
