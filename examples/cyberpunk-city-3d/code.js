// CYBERPUNK CITY 3D - Ultimate Nintendo 64 Style 3D City
// Full GPU-accelerated 3D world with dynamic lighting, flying vehicles, and retro effects

let gameTime = 0;
let cityObjects = [];
let vehicles = [];
let particles = [];
let buildings = [];
let player = null;
let camera = { x: 0, y: 20, z: 30, targetX: 0, targetY: 10, targetZ: 0 };
let cityLights = [];
let neonSigns = [];
let flying = false;
let speed = 0;

// City configuration
const CITY_SIZE = 100;
const BUILDING_COUNT = 50;
const VEHICLE_COUNT = 12;
const PARTICLE_COUNT = 200;

// Colors (N64 palette)
const COLORS = {
  building: [0x2a2a4a, 0x3a3a5a, 0x4a4a6a, 0x1a1a3a],
  neon: [0xff0066, 0x00ff66, 0x6600ff, 0xffff00, 0x00ffff, 0xff6600],
  vehicle: [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff00ff],
  particle: [0xff8800, 0x8800ff, 0x00ff88, 0xff0088]
};

export async function init() {
  cls();
  
  // Setup dramatic 3D scene
  setCameraPosition(0, 20, 30);
  setCameraTarget(0, 10, 0);
  setCameraFOV(75);
  
  // Cyberpunk lighting
  setLightDirection(-0.3, -0.7, -0.4);
  setLightColor(0x9966ff);
  setAmbientLight(0x220044);
  
  // Atmospheric fog
  setFog(0x110022, 30, 200);
  
  // Enable N64-style effects
  enablePixelation(1);
  enableDithering(true);
  enableBloom(true);
  
  await buildCyberpunkCity();
  createPlayer();
  spawnVehicles();
  initParticleSystem();
  
  console.log('🌃 CYBERPUNK CITY 3D - Ultimate retro 3D experience loaded!');
  console.log('WASD: Move | SHIFT: Fly Mode | SPACE: Boost | X: Switch Vehicle');
}

export function update(dt) {
  gameTime += dt;
  
  handleInput(dt);
  updatePlayer(dt);
  updateVehicles(dt);
  updateParticles(dt);
  updateCityLights(dt);
  updateCamera(dt);
  updateNeonSigns(dt);
}

export function draw() {
  // 3D scene automatically rendered by GPU
  drawHUD();
}

async function buildCyberpunkCity() {
  // Create ground with grid pattern
  const ground = createPlane(CITY_SIZE * 2, CITY_SIZE * 2, 0x111133, [0, 0, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
  
  // Add grid lines for cyberpunk aesthetic
  for (let i = -CITY_SIZE; i <= CITY_SIZE; i += 10) {
    // Horizontal lines
    const lineH = createCube(CITY_SIZE * 2, 0.1, 0.2, 0x004466, [0, 0.1, i]);
    // Vertical lines  
    const lineV = createCube(0.2, 0.1, CITY_SIZE * 2, 0x004466, [i, 0.1, 0]);
  }
  
  // Generate procedural buildings
  for (let i = 0; i < BUILDING_COUNT; i++) {
    await createBuilding(i);
  }
  
  // Create central megastructure
  await createMegaStructure();
  
  // Add flying platforms
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 40;
    const platform = createCube(8, 1, 8, 0x666699, [
      Math.cos(angle) * radius,
      15 + Math.sin(gameTime + i) * 3,
      Math.sin(angle) * radius
    ]);
    
    // Add neon underglow
    const glow = createCube(8.5, 0.2, 8.5, COLORS.neon[i % COLORS.neon.length], [
      Math.cos(angle) * radius,
      14.5 + Math.sin(gameTime + i) * 3,
      Math.sin(angle) * radius
    ]);
    
    cityObjects.push({ type: 'platform', mesh: platform, glow: glow, angle: angle, index: i });
  }
}

async function createBuilding(index) {
  const x = (Math.random() - 0.5) * CITY_SIZE * 1.5;
  const z = (Math.random() - 0.5) * CITY_SIZE * 1.5;
  
  // Avoid center area
  if (Math.abs(x) < 15 && Math.abs(z) < 15) return;
  
  const width = 3 + Math.random() * 6;
  const depth = 3 + Math.random() * 6; 
  const height = 8 + Math.random() * 25;
  
  // Main building
  const building = createCube(width, height, depth, COLORS.building[index % COLORS.building.length], [x, height/2, z]);
  
  // Add detail layers
  const detail1 = createCube(width * 0.9, height * 0.3, depth * 0.9, 0x555577, [x, height * 0.15, z]);
  const detail2 = createCube(width * 0.8, height * 0.2, depth * 0.8, 0x666688, [x, height * 0.9, z]);
  
  // Windows with animated lighting
  const windowRows = Math.floor(height / 3);
  const windows = [];
  
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < 3; col++) {
      const windowX = x + (col - 1) * width * 0.25;
      const windowY = 2 + row * 3;
      const windowZ = z + depth * 0.51;
      
      const window = createCube(0.8, 0.8, 0.1, 0xffffaa, [windowX, windowY, windowZ]);
      windows.push({ 
        mesh: window, 
        flickerTime: Math.random() * 10,
        baseColor: 0xffffaa,
        dimColor: 0x444422
      });
    }
  }
  
  // Neon sign on top
  if (Math.random() < 0.3) {
    const signColor = COLORS.neon[Math.floor(Math.random() * COLORS.neon.length)];
    const sign = createCube(width * 1.2, 1, 0.2, signColor, [x, height + 1, z]);
    neonSigns.push({
      mesh: sign,
      color: signColor,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }
  
  buildings.push({
    main: building,
    details: [detail1, detail2],
    windows: windows,
    x: x, z: z, height: height
  });
}

async function createMegaStructure() {
  // Central tower
  const tower = createCube(12, 60, 12, 0x2d2d4d, [0, 30, 0]);
  
  // Connecting bridges
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const bridgeX = Math.cos(angle) * 20;
    const bridgeZ = Math.sin(angle) * 20;
    
    const bridge = createCube(16, 2, 4, 0x444466, [bridgeX/2, 25, bridgeZ/2]);
    setRotation(bridge, 0, angle, 0);
  }
  
  // Antenna array on top
  for (let i = 0; i < 6; i++) {
    const antenna = createCube(0.3, 8, 0.3, 0xffffff, [
      Math.random() * 8 - 4,
      64,
      Math.random() * 8 - 4
    ]);
    
    // Blinking light on antenna
    const light = createSphere(0.5, 0xff0000, [
      Math.random() * 8 - 4,
      68,
      Math.random() * 8 - 4
    ]);
    
    cityLights.push({
      mesh: light,
      blinkTime: Math.random() * 2,
      isOn: true
    });
  }
}

function createPlayer() {
  // Sleek hovercar
  const body = createCube(3, 0.8, 1.5, 0x4444ff, [0, 2, 0]);
  const cockpit = createSphere(1, 0x2222aa, [0, 2.8, 0.2]);
  
  // Thrusters
  const thruster1 = createCube(0.4, 0.4, 0.8, 0xff4400, [-1.2, 1.8, -0.8]);
  const thruster2 = createCube(0.4, 0.4, 0.8, 0xff4400, [1.2, 1.8, -0.8]);
  
  // Underglow
  const glow = createCube(3.5, 0.2, 2, 0x00ffff, [0, 1.2, 0]);
  
  player = {
    body: body,
    cockpit: cockpit,
    thrusters: [thruster1, thruster2],
    glow: glow,
    x: 0, y: 2, z: 0,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    tilt: 0,
    boost: 1
  };
}

function spawnVehicles() {
  for (let i = 0; i < VEHICLE_COUNT; i++) {
    const vehicle = createTrafficVehicle(i);
    vehicles.push(vehicle);
  }
}

function createTrafficVehicle(index) {
  const x = (Math.random() - 0.5) * CITY_SIZE;
  const z = (Math.random() - 0.5) * CITY_SIZE;
  const y = 1.5 + Math.random() * 8;
  
  const color = COLORS.vehicle[index % COLORS.vehicle.length];
  const body = createCube(2.5, 0.6, 1.2, color, [x, y, z]);
  const glow = createCube(2.8, 0.2, 1.5, color + 0x222222, [x, y - 0.5, z]);
  
  return {
    body: body,
    glow: glow,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: 0,
    vz: (Math.random() - 0.5) * 8,
    target: { x: x, y: y, z: z },
    speed: 2 + Math.random() * 4,
    turnRate: Math.random() * 2 + 1,
    nextWaypoint: Math.random() * 10
  };
}

function initParticleSystem() {
  // Create ambient particles (dust, sparks, etc.)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    createAmbientParticle();
  }
}

function createAmbientParticle() {
  const x = (Math.random() - 0.5) * CITY_SIZE * 2;
  const y = Math.random() * 40;
  const z = (Math.random() - 0.5) * CITY_SIZE * 2;
  
  const particle = createSphere(0.1, COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)], [x, y, z]);
  
  particles.push({
    mesh: particle,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 0.5,
    vz: (Math.random() - 0.5) * 2,
    life: 5 + Math.random() * 10,
    maxLife: 15,
    type: 'ambient'
  });
}

function handleInput(dt) {
  const moveSpeed = flying ? 25 : 15;
  const turnSpeed = 3;
  
  // Movement
  if (btn(0)) { // Left
    player.vx -= moveSpeed * dt;
    player.tilt = Math.max(player.tilt - dt * 2, -0.3);
  }
  if (btn(1)) { // Right  
    player.vx += moveSpeed * dt;
    player.tilt = Math.min(player.tilt + dt * 2, 0.3);
  }
  if (btn(2)) { // Up
    player.vz -= moveSpeed * dt;
  }
  if (btn(3)) { // Down
    player.vz += moveSpeed * dt;
  }
  
  // Vertical movement
  if (btn(4)) { // Z - Down
    player.vy -= moveSpeed * dt * 0.5;
  }
  if (btn(5)) { // X - Up
    player.vy += moveSpeed * dt * 0.5;
  }
  
  // Boost
  if (btnp(6)) { // Space
    player.boost = 3;
    createBoostParticles();
  }
  
  // Flight mode toggle
  if (btnp(7)) { // Shift
    flying = !flying;
  }
}

function updatePlayer(dt) {
  // Apply boost
  if (player.boost > 1) {
    player.vx *= player.boost;
    player.vz *= player.boost;
    player.boost = Math.max(1, player.boost - dt * 3);
  }
  
  // Physics
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;
  
  // Hover physics
  if (!flying) {
    const groundHeight = 2;
    const hoverForce = (groundHeight - player.y) * 5;
    player.vy += hoverForce * dt;
  }
  
  // Damping
  player.vx *= 0.9;
  player.vy *= 0.95;
  player.vz *= 0.9;
  player.tilt *= 0.9;
  
  // Update rotation based on movement
  if (Math.abs(player.vx) > 0.1 || Math.abs(player.vz) > 0.1) {
    player.rotation = Math.atan2(player.vx, player.vz);
  }
  
  // Update mesh positions
  setPosition(player.body, player.x, player.y, player.z);
  setPosition(player.cockpit, player.x, player.y + 0.8, player.z + 0.2);
  setPosition(player.glow, player.x, player.y - 0.8, player.z);
  
  setPosition(player.thrusters[0], player.x - 1.2, player.y - 0.2, player.z - 0.8);
  setPosition(player.thrusters[1], player.x + 1.2, player.y - 0.2, player.z - 0.8);
  
  // Apply rotations
  setRotation(player.body, player.tilt * 0.3, player.rotation, player.tilt);
  setRotation(player.cockpit, 0, player.rotation, 0);
  
  // Create thruster particles
  if (Math.abs(player.vx) > 5 || Math.abs(player.vz) > 5) {
    createThrusterParticles();
  }
  
  // Boundary check
  const boundary = CITY_SIZE;
  if (Math.abs(player.x) > boundary) player.x = Math.sign(player.x) * boundary;
  if (Math.abs(player.z) > boundary) player.z = Math.sign(player.z) * boundary;
  if (player.y < 1) player.y = 1;
  if (player.y > 50) player.y = 50;
}

function updateVehicles(dt) {
  vehicles.forEach(vehicle => {
    // AI behavior - move to random waypoints
    vehicle.nextWaypoint -= dt;
    if (vehicle.nextWaypoint <= 0) {
      vehicle.target.x = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      vehicle.target.z = (Math.random() - 0.5) * CITY_SIZE * 0.8;
      vehicle.target.y = 1.5 + Math.random() * 8;
      vehicle.nextWaypoint = 3 + Math.random() * 5;
    }
    
    // Move towards target
    const dx = vehicle.target.x - vehicle.x;
    const dy = vehicle.target.y - vehicle.y;
    const dz = vehicle.target.z - vehicle.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance > 1) {
      vehicle.vx += (dx / distance) * vehicle.speed * dt;
      vehicle.vy += (dy / distance) * vehicle.speed * dt;
      vehicle.vz += (dz / distance) * vehicle.speed * dt;
    }
    
    // Apply physics
    vehicle.x += vehicle.vx * dt;
    vehicle.y += vehicle.vy * dt;
    vehicle.z += vehicle.vz * dt;
    
    // Damping
    vehicle.vx *= 0.95;
    vehicle.vy *= 0.98;
    vehicle.vz *= 0.95;
    
    // Update mesh positions
    setPosition(vehicle.body, vehicle.x, vehicle.y, vehicle.z);
    setPosition(vehicle.glow, vehicle.x, vehicle.y - 0.5, vehicle.z);
    
    // Occasional thruster particles
    if (Math.random() < 0.1) {
      createVehicleThrusterParticles(vehicle.x, vehicle.y, vehicle.z);
    }
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    // Physics
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    
    particle.life -= dt;
    
    // Update position
    setPosition(particle.mesh, particle.x, particle.y, particle.z);
    
    // Fade out
    const alpha = particle.life / particle.maxLife;
    setScale(particle.mesh, alpha);
    
    // Remove dead particles
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);
      
      // Respawn ambient particles
      if (particle.type === 'ambient') {
        createAmbientParticle();
      }
    }
  }
}

function updateCityLights(dt) {
  // Update blinking lights
  cityLights.forEach(light => {
    light.blinkTime -= dt;
    if (light.blinkTime <= 0) {
      light.isOn = !light.isOn;
      light.blinkTime = 0.5 + Math.random() * 1.5;
      
      // Change light color/visibility
      if (light.isOn) {
        setScale(light.mesh, 1);
      } else {
        setScale(light.mesh, 0.3);
      }
    }
  });
  
  // Update building windows
  buildings.forEach(building => {
    building.windows.forEach(window => {
      window.flickerTime -= dt;
      if (window.flickerTime <= 0) {
        // Random flicker
        const isOn = Math.random() < 0.8;
        // Note: In real implementation, you'd change material color
        window.flickerTime = 0.5 + Math.random() * 3;
      }
    });
  });
}

function updateCamera(dt) {
  // Smooth camera follow
  const followDistance = 15;
  const followHeight = 8;
  
  camera.targetX = player.x - Math.sin(player.rotation) * followDistance;
  camera.targetY = player.y + followHeight;
  camera.targetZ = player.z - Math.cos(player.rotation) * followDistance;
  
  // Smooth interpolation
  camera.x += (camera.targetX - camera.x) * 3 * dt;
  camera.y += (camera.targetY - camera.y) * 3 * dt;
  camera.z += (camera.targetZ - camera.z) * 3 * dt;
  
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(player.x, player.y + 2, player.z);
}

function updateNeonSigns(dt) {
  neonSigns.forEach(sign => {
    sign.pulsePhase += dt * 4;
    const intensity = 0.7 + 0.3 * Math.sin(sign.pulsePhase);
    // Note: In real implementation, you'd modify material emission
  });
  
  // Update floating platforms
  cityObjects.forEach(obj => {
    if (obj.type === 'platform') {
      const newY = 15 + Math.sin(gameTime * 0.5 + obj.index) * 3;
      setPosition(obj.mesh, 
        Math.cos(obj.angle) * 40,
        newY,
        Math.sin(obj.angle) * 40
      );
      setPosition(obj.glow,
        Math.cos(obj.angle) * 40,
        newY - 0.5,
        Math.sin(obj.angle) * 40
      );
    }
  });
}

function createBoostParticles() {
  for (let i = 0; i < 20; i++) {
    const particle = createSphere(0.2, 0x00ffff, [
      player.x + (Math.random() - 0.5) * 4,
      player.y + (Math.random() - 0.5) * 2,
      player.z + (Math.random() - 0.5) * 4
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 5,
      vz: (Math.random() - 0.5) * 15,
      life: 1.5,
      maxLife: 1.5,
      type: 'boost'
    });
  }
}

function createThrusterParticles() {
  for (let i = 0; i < 2; i++) {
    const thrusterX = player.x + (i === 0 ? -1.2 : 1.2);
    const particle = createSphere(0.15, 0xff4400, [
      thrusterX,
      player.y - 0.5,
      player.z - 1
    ]);
    
    particles.push({
      mesh: particle,
      x: thrusterX, y: player.y - 0.5, z: player.z - 1,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 2,
      vz: Math.random() * 8 + 5,
      life: 0.8,
      maxLife: 0.8,
      type: 'thruster'
    });
  }
}

function createVehicleThrusterParticles(x, y, z) {
  const particle = createSphere(0.1, 0x4488ff, [x, y - 0.3, z - 0.8]);
  
  particles.push({
    mesh: particle,
    x: x, y: y - 0.3, z: z - 0.8,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random(),
    vz: Math.random() * 3 + 2,
    life: 0.5,
    maxLife: 0.5,
    type: 'vehicle'
  });
}

function drawHUD() {
  // Main HUD background
  rect(16, 16, 500, 120, rgba8(0, 0, 20, 180), true);
  rect(16, 16, 500, 120, rgba8(0, 100, 200, 100), false);
  
  // Title
  print('🌃 CYBERPUNK CITY 3D', 24, 24, rgba8(0, 255, 255, 255));
  print('ULTIMATE N64/PSX FANTASY CONSOLE', 24, 40, rgba8(255, 100, 255, 255));
  
  // Player stats
  const speedMag = Math.sqrt(player.vx*player.vx + player.vz*player.vz);
  print(`SPEED: ${speedMag.toFixed(1)}`, 24, 60, rgba8(255, 255, 100, 255));
  print(`ALTITUDE: ${player.y.toFixed(1)}m`, 24, 76, rgba8(100, 255, 100, 255));
  print(`MODE: ${flying ? 'FLIGHT' : 'HOVER'}`, 24, 92, rgba8(255, 150, 50, 255));
  print(`BOOST: ${player.boost.toFixed(1)}x`, 24, 108, rgba8(255, 50, 50, 255));
  
  // Position
  print(`X: ${player.x.toFixed(1)}`, 200, 60, rgba8(200, 200, 255, 255));
  print(`Y: ${player.y.toFixed(1)}`, 200, 76, rgba8(200, 200, 255, 255));
  print(`Z: ${player.z.toFixed(1)}`, 200, 92, rgba8(200, 200, 255, 255));
  
  // Scene stats
  print(`BUILDINGS: ${buildings.length}`, 320, 60, rgba8(150, 255, 150, 255));
  print(`VEHICLES: ${vehicles.length}`, 320, 76, rgba8(255, 255, 150, 255));
  print(`PARTICLES: ${particles.length}`, 320, 92, rgba8(255, 150, 255, 255));
  print(`LIGHTS: ${cityLights.length}`, 320, 108, rgba8(150, 150, 255, 255));
  
  // Performance
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 420, 60, rgba8(100, 255, 255, 255));
    print(`RENDERER: ${stats.renderer || 'ThreeJS'}`, 420, 76, rgba8(100, 255, 255, 255));
  }
  
  // Controls
  rect(16, 350, 580, 60, rgba8(0, 0, 0, 150), true);
  print('WASD: Move | SHIFT: Flight Mode | SPACE: Boost | ZX: Up/Down', 24, 360, rgba8(255, 255, 255, 200));
  print('Experience true Nintendo 64 / PlayStation style 3D with GPU acceleration!', 24, 380, rgba8(100, 255, 100, 180));
  
  // Mini-map (simple radar)
  const radarSize = 80;
  const radarX = 540;
  const radarY = 200;
  
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 50, 0, 150), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 100), false);
  
  // Player dot
  pset(radarX, radarY, rgba8(255, 255, 255, 255));
  
  // Vehicle dots
  vehicles.forEach(vehicle => {
    const relX = (vehicle.x - player.x) / CITY_SIZE * radarSize * 0.4;
    const relZ = (vehicle.z - player.z) / CITY_SIZE * radarSize * 0.4;
    if (Math.abs(relX) < radarSize/2 && Math.abs(relZ) < radarSize/2) {
      pset(radarX + relX, radarY + relZ, rgba8(255, 100, 100, 200));
    }
  });
  
  print('RADAR', radarX - 15, radarY + radarSize/2 + 8, rgba8(0, 255, 0, 255));
}