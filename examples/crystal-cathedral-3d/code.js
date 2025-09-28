// CRYSTAL CATHEDRAL 3D - Ultimate Nintendo 64/PlayStation visual showcase
// Demonstrates the most advanced graphics features: holographic materials, dynamic lighting, atmospheric effects

let cathedral = {
  pillars: [],
  crystals: [],
  floatingElements: [],
  lightBeams: [],
  particles: []
};

let camera = {
  angle: 0,
  height: 8,
  radius: 25,
  target: { x: 0, y: 5, z: 0 }
};

let time = 0;
let musicTime = 0;
let atmosphereIntensity = 0;

export async function init() {
  cls();
  
  console.log('🏛️ Initializing Crystal Cathedral - Ultimate Graphics Showcase...');
  
  // Setup dramatic camera
  setCameraPosition(25, 8, 0);
  setCameraTarget(0, 5, 0);
  setCameraFOV(70);
  
  // Enable all advanced effects
  enablePixelation(1);
  enableDithering(true);
  enableBloom(true);
  enableMotionBlur(0.3);
  
  // Build the magnificent cathedral
  await buildCathedral();
  await createFloatingCrystals();
  await addAtmosphericElements();
  
  // Set dramatic lighting
  setLightDirection(-0.3, -1, -0.2);
  setLightColor(0xffffff);
  setAmbientLight(0x202040);
  setFog(0x000011, 40, 120);
  
  console.log('✨ Crystal Cathedral loaded - Experience ultimate 3D graphics!');
}

async function buildCathedral() {
  console.log('🏗️ Building Crystal Cathedral...');
  
  // Create magnificent crystal floor
  const floor = createAdvancedCube(1, {
    color: 0x111144,
    emissive: 0x000022,
    emissiveIntensity: 0.3,
    metallic: true,
    animated: true
  }, [0, -1, 0]);
  setScale(floor, 60, 0.5, 60);
  
  // Create towering crystal pillars in a circle
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = Math.cos(angle) * 20;
    const z = Math.sin(angle) * 20;
    const height = 15 + Math.sin(i * 0.5) * 5;
    
    // Main pillar
    const pillar = createAdvancedCube(1, {
      color: 0x4488ff,
      emissive: 0x112244,
      emissiveIntensity: 0.6,
      metallic: true,
      holographic: i % 3 === 0,
      animated: true
    }, [x, height/2, z]);
    setScale(pillar, 2, height, 2);
    
    // Crystal cap
    const cap = createAdvancedSphere(1.5, {
      color: 0x88ddff,
      emissive: 0x224488,
      emissiveIntensity: 0.8,
      holographic: true,
      animated: true,
      transparent: true,
      opacity: 0.9
    }, [x, height + 1, z], 16);
    
    cathedral.pillars.push({
      main: pillar,
      cap: cap,
      x, z,
      height,
      glowPhase: Math.random() * Math.PI * 2,
      originalHeight: height
    });
  }
  
  // Create central altar with ultimate crystal
  const altarBase = createAdvancedCube(1, {
    color: 0x666699,
    emissive: 0x111133,
    emissiveIntensity: 0.4,
    metallic: true,
    animated: true
  }, [0, 1, 0]);
  setScale(altarBase, 6, 2, 6);
  
  const masterCrystal = createAdvancedSphere(2, {
    color: 0xffffff,
    emissive: 0x444488,
    emissiveIntensity: 1.2,
    holographic: true,
    animated: true,
    transparent: true,
    opacity: 0.8
  }, [0, 4, 0], 20);
  
  cathedral.masterCrystal = {
    mesh: masterCrystal,
    rotationSpeed: 0.5,
    pulsePhase: 0
  };
  
  // Create crystal archways
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Arch supports
    const support1 = createAdvancedCube(1, {
      color: 0x8844ff,
      emissive: 0x221144,
      emissiveIntensity: 0.5,
      holographic: true,
      animated: true
    }, [x - 3, 6, z]);
    setScale(support1, 1.5, 12, 1.5);
    
    const support2 = createAdvancedCube(1, {
      color: 0x8844ff,
      emissive: 0x221144,
      emissiveIntensity: 0.5,
      holographic: true,
      animated: true
    }, [x + 3, 6, z]);
    setScale(support2, 1.5, 12, 1.5);
    
    // Arch top
    const archTop = createAdvancedCube(1, {
      color: 0xaa66ff,
      emissive: 0x332244,
      emissiveIntensity: 0.7,
      holographic: true,
      animated: true,
      transparent: true,
      opacity: 0.9
    }, [x, 11, z]);
    setScale(archTop, 8, 2, 2);
  }
}

async function createFloatingCrystals() {
  console.log('💎 Creating floating crystal formation...');
  
  // Create floating crystal clusters at different heights
  for (let layer = 0; layer < 4; layer++) {
    const numCrystals = 8 - layer * 2;
    const radius = 12 + layer * 4;
    const height = 8 + layer * 6;
    
    for (let i = 0; i < numCrystals; i++) {
      const angle = (i / numCrystals) * Math.PI * 2 + layer * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const crystal = createAdvancedSphere(0.8 + layer * 0.2, {
        color: layer % 2 === 0 ? 0xff88aa : 0x88aaff,
        emissive: layer % 2 === 0 ? 0x441122 : 0x112244,
        emissiveIntensity: 0.9,
        holographic: true,
        animated: true,
        transparent: true,
        opacity: 0.85
      }, [x, height, z], 12);
      
      cathedral.floatingElements.push({
        mesh: crystal,
        x, y: height, z,
        originalY: height,
        rotationSpeed: 0.5 + Math.random() * 1,
        orbitSpeed: 0.2 + layer * 0.1,
        orbitRadius: radius,
        orbitPhase: angle,
        bobPhase: Math.random() * Math.PI * 2,
        layer
      });
    }
  }
  
  // Create spiral of energy crystals
  for (let i = 0; i < 20; i++) {
    const spiralPhase = (i / 20) * Math.PI * 4;
    const spiralRadius = 8 + Math.sin(spiralPhase) * 3;
    const x = Math.cos(spiralPhase) * spiralRadius;
    const z = Math.sin(spiralPhase) * spiralRadius;
    const y = 2 + i * 0.8;
    
    const energyCrystal = createAdvancedSphere(0.3, {
      color: 0xffff44,
      emissive: 0x444411,
      emissiveIntensity: 1.1,
      holographic: true,
      animated: true,
      transparent: true,
      opacity: 0.7
    }, [x, y, z], 8);
    
    cathedral.crystals.push({
      mesh: energyCrystal,
      x, y, z,
      spiralPhase,
      spiralIndex: i
    });
  }
}

async function addAtmosphericElements() {
  console.log('🌟 Adding atmospheric elements...');
  
  // Create light beam effects (simulated with transparent planes)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 15;
    const z = Math.sin(angle) * 15;
    
    const lightBeam = createPlane(2, 20, 0xffffff, [x, 10, z]);
    setRotation(lightBeam, 0, angle, 0);
    
    cathedral.lightBeams.push({
      mesh: lightBeam,
      angle,
      intensity: Math.random()
    });
  }
}

export function update(dt) {
  time += dt;
  musicTime += dt * 0.5; // Slower for atmospheric effect
  atmosphereIntensity = (Math.sin(musicTime) + 1) * 0.5;
  
  // Update camera orbit
  updateCamera(dt);
  
  // Update cathedral elements
  updatePillars(dt);
  updateFloatingElements(dt);
  updateMasterCrystal(dt);
  updateSpiral(dt);
  updateAtmosphere(dt);
  
  // Dynamic lighting effects
  updateDynamicLighting(dt);
}

function updateCamera(dt) {
  camera.angle += dt * 0.3;
  camera.height = 8 + Math.sin(time * 0.4) * 3;
  
  const x = Math.cos(camera.angle) * camera.radius;
  const z = Math.sin(camera.angle) * camera.radius;
  
  setCameraPosition(x, camera.height, z);
  setCameraTarget(camera.target.x, camera.target.y, camera.target.z);
}

function updatePillars(dt) {
  cathedral.pillars.forEach((pillar, index) => {
    pillar.glowPhase += dt * 2;
    
    // Subtle height animation
    const heightVariation = Math.sin(pillar.glowPhase + index) * 0.5;
    const newHeight = pillar.originalHeight + heightVariation;
    setScale(pillar.main, 2, newHeight, 2);
    setPosition(pillar.main, pillar.x, newHeight/2, pillar.z);
    setPosition(pillar.cap, pillar.x, newHeight + 1, pillar.z);
    
    // Rotation
    rotateMesh(pillar.cap, 0, dt * 0.5, 0);
  });
}

function updateFloatingElements(dt) {
  cathedral.floatingElements.forEach(element => {
    // Orbital motion
    element.orbitPhase += dt * element.orbitSpeed;
    element.x = Math.cos(element.orbitPhase) * element.orbitRadius;
    element.z = Math.sin(element.orbitPhase) * element.orbitRadius;
    
    // Vertical bobbing
    element.bobPhase += dt * 3;
    const bobY = Math.sin(element.bobPhase) * 1.5;
    element.y = element.originalY + bobY;
    
    // Update position and rotation
    setPosition(element.mesh, element.x, element.y, element.z);
    rotateMesh(element.mesh, dt * element.rotationSpeed, dt * element.rotationSpeed * 0.7, 0);
  });
}

function updateMasterCrystal(dt) {
  if (cathedral.masterCrystal) {
    cathedral.masterCrystal.pulsePhase += dt * 4;
    
    // Pulsing scale effect
    const pulseScale = 1 + Math.sin(cathedral.masterCrystal.pulsePhase) * 0.2;
    setScale(cathedral.masterCrystal.mesh, pulseScale, pulseScale, pulseScale);
    
    // Rotation
    rotateMesh(cathedral.masterCrystal.mesh, 0, dt * cathedral.masterCrystal.rotationSpeed, 0);
    
    // Vertical floating motion
    const floatY = 4 + Math.sin(time * 2) * 1;
    setPosition(cathedral.masterCrystal.mesh, 0, floatY, 0);
  }
}

function updateSpiral(dt) {
  cathedral.crystals.forEach(crystal => {
    crystal.spiralPhase += dt * 2;
    
    const spiralRadius = 8 + Math.sin(crystal.spiralPhase) * 3;
    const x = Math.cos(crystal.spiralPhase) * spiralRadius;
    const z = Math.sin(crystal.spiralPhase) * spiralRadius;
    const y = crystal.y + Math.sin(time + crystal.spiralIndex * 0.5) * 0.5;
    
    setPosition(crystal.mesh, x, y, z);
    rotateMesh(crystal.mesh, dt, dt * 2, dt * 0.5);
  });
}

function updateAtmosphere(dt) {
  // Update light beams
  cathedral.lightBeams.forEach((beam, index) => {
    beam.intensity += dt * 2;
    const alpha = (Math.sin(beam.intensity + index) + 1) * 0.3 + 0.1;
    // Note: In a real implementation, we would update material opacity here
  });
}

function updateDynamicLighting(dt) {
  // Cycle through different lighting moods
  const lightPhase = time * 0.3;
  
  // Main light color cycling
  const hue = Math.sin(lightPhase) * 180 + 180;
  const lightColor = hslToHex(hue, 70, 80);
  setLightColor(lightColor);
  
  // Ambient light pulsing
  const ambientIntensity = 0x202040 + Math.floor(atmosphereIntensity * 0x202020);
  setAmbientLight(ambientIntensity);
  
  // Fog color changes
  const fogHue = Math.sin(lightPhase * 0.7) * 60 + 240;  // Blue to purple range
  const fogColor = hslToHex(fogHue, 50, 10);
  setFog(fogColor, 40, 120);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

export function draw() {
  // Atmospheric UI with dynamic colors
  const titleColor = hslToHex(time * 50 % 360, 80, 70);
  const accentColor = hslToHex((time * 30 + 180) % 360, 70, 60);
  
  print('🏛️ CRYSTAL CATHEDRAL', 8, 8, titleColor);
  print('Ultimate Nintendo 64 / PlayStation Graphics Showcase', 8, 24, accentColor);
  
  // Atmosphere info
  const moodNames = ['Mystical', 'Ethereal', 'Transcendent', 'Divine', 'Cosmic'];
  const currentMood = moodNames[Math.floor(atmosphereIntensity * moodNames.length)];
  print(`Atmosphere: ${currentMood} | Intensity: ${(atmosphereIntensity * 100).toFixed(0)}%`, 8, 50, rgba8(200, 150, 255, 255));
  
  // Crystal count
  const totalCrystals = cathedral.floatingElements.length + cathedral.crystals.length + 1;
  print(`Sacred Crystals: ${totalCrystals} | Pillars: ${cathedral.pillars.length}`, 8, 66, rgba8(150, 200, 255, 255));
  
  // Visual effects status
  print('Effects: Holographic + Bloom + Motion + Dynamic Lighting', 8, 82, rgba8(255, 200, 100, 255));
  
  // Advanced 3D stats
  const stats = get3DStats();
  if (stats && stats.render) {
    const objectCount = cathedral.pillars.length * 2 + cathedral.floatingElements.length + cathedral.crystals.length + 10;
    print(`3D Objects: ${objectCount} | GPU: Three.js Advanced`, 8, 108, rgba8(150, 150, 255, 255));
    print(`Shadows: Ultra | Materials: Holographic | Lighting: Dynamic`, 8, 124, rgba8(150, 150, 255, 255));
  }
  
  // Experience description
  print('Witness the ultimate fusion of retro and modern 3D graphics!', 8, 300, rgba8(255, 255, 100, 200));
  print('Nintendo 64/PlayStation aesthetics with cutting-edge effects!', 8, 316, rgba8(100, 255, 255, 180));
  print('Camera automatically orbits - sit back and enjoy the show!', 8, 332, rgba8(100, 255, 100, 160));
  
  // Dynamic status indicators
  const pulseAlpha = Math.floor((Math.sin(time * 8) + 1) * 127 + 128);
  print('🔮 TRANSCENDENT EXPERIENCE ACTIVE 🔮', 200, 8, rgba8(255, 100, 255, pulseAlpha));
}