// F-ZERO NOVA - Ultimate 3D Racing Experience 
// Nintendo 64 F-Zero style racing with full GPU acceleration and retro effects

let gameTime = 0;
let raceTrack = [];
let player = null;
let opponents = [];
let trackPieces = [];
let particles = [];
let powerUps = [];
let lapTime = 0;
let currentLap = 1;
let maxLaps = 3;
let racePosition = 1;
let speed = 0;
let maxSpeed = 120;
let boost = 0;
let health = 100;

// Track configuration
const TRACK_WIDTH = 20;
const TRACK_SEGMENTS = 200;
const TRACK_RADIUS = 150;
const OPPONENT_COUNT = 7;

// Colors (F-Zero inspired)
const COLORS = {
  player: 0x0088ff,
  opponents: [0xff4444, 0x44ff44, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff],
  track: [0x333366, 0x444477, 0x555588],
  powerup: [0xff0080, 0x80ff00, 0x0080ff, 0xff8000],
  particle: [0xff6600, 0x0066ff, 0x66ff00, 0xff0066]
};

export async function init() {
  cls();
  
  // Setup dramatic racing scene
  setCameraPosition(0, 8, -12);
  setCameraTarget(0, 2, 0);
  setCameraFOV(90); // Wide FOV for racing
  
  // High-speed lighting
  setLightDirection(-0.4, -0.8, -0.3);
  setLightColor(0xaaaaff);
  setAmbientLight(0x444466);
  
  // Speed blur fog
  setFog(0x220044, 50, 300);
  
  // Enable all N64 effects
  enablePixelation(1);
  enableDithering(true);
  enableBloom(true);
  enableMotionBlur(0.8);
  
  await buildRaceTrack();
  createPlayer();
  spawnOpponents();
  spawnPowerUps();
  initRaceParticles();
  
  console.log('🏁 F-ZERO NOVA - Ultimate 3D Racing Experience loaded!');
  console.log('Prepare for Nintendo 64 style high-speed racing!');
}

export function update(dt) {
  gameTime += dt;
  lapTime += dt;
  
  handleInput(dt);
  updatePlayer(dt);
  updateOpponents(dt);
  updateTrack(dt);
  updateParticles(dt);
  updatePowerUps(dt);
  updateCamera(dt);
  updateRaceLogic(dt);
}

export function draw() {
  // 3D scene automatically rendered
  drawRacingHUD();
}

async function buildRaceTrack() {
  // Create main track loop with elevation changes and banking
  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const angle = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const nextAngle = ((i + 1) / TRACK_SEGMENTS) * Math.PI * 2;
    
    // Track position with curves and elevation
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4; // Elevation changes
    
    const nextX = Math.cos(nextAngle) * TRACK_RADIUS;
    const nextZ = Math.sin(nextAngle) * TRACK_RADIUS;
    const nextY = Math.sin(nextAngle * 3) * 8 + Math.cos(nextAngle * 1.5) * 4;
    
    // Calculate banking angle
    const bankingAngle = Math.sin(angle * 2) * 0.3;
    
    // Create track segment
    const segment = createTrackSegment(x, y, z, nextX, nextY, nextZ, bankingAngle, i);
    trackPieces.push(segment);
    
    // Add track decorations
    if (i % 10 === 0) {
      await createTrackDecorations(x, y, z, angle);
    }
    
    // Start/finish line
    if (i === 0) {
      createStartFinishLine(x, y, z, angle);
    }
    
    // Boost pads
    if (i % 25 === 0) {
      createBoostPad(x, y + 0.5, z, angle);
    }
  }
  
  // Create outer barriers
  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const angle = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const outerRadius = TRACK_RADIUS + TRACK_WIDTH;
    const innerRadius = TRACK_RADIUS - TRACK_WIDTH;
    
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4;
    
    // Outer barrier
    const outerX = Math.cos(angle) * outerRadius;
    const outerZ = Math.sin(angle) * outerRadius;
    const outerBarrier = createCube(2, 6, 2, 0x666688, [outerX, y + 3, outerZ]);
    
    // Inner barrier  
    const innerX = Math.cos(angle) * innerRadius;
    const innerZ = Math.sin(angle) * innerRadius;
    const innerBarrier = createCube(2, 6, 2, 0x666688, [innerX, y + 3, innerZ]);
    
    // Add neon lighting to barriers
    if (i % 5 === 0) {
      const neonColor = COLORS.powerup[i % COLORS.powerup.length];
      const neonOuter = createCube(2.2, 0.5, 2.2, neonColor, [outerX, y + 5.5, outerZ]);
      const neonInner = createCube(2.2, 0.5, 2.2, neonColor, [innerX, y + 5.5, innerZ]);
    }
  }
}

function createTrackSegment(x, y, z, nextX, nextY, nextZ, banking, index) {
  // Main track surface
  const centerX = (x + nextX) / 2;
  const centerY = (y + nextY) / 2;  
  const centerZ = (z + nextZ) / 2;
  
  const length = Math.sqrt((nextX-x)**2 + (nextY-y)**2 + (nextZ-z)**2);
  const angle = Math.atan2(nextZ - z, nextX - x);
  
  const trackColor = COLORS.track[index % COLORS.track.length];
  const segment = createCube(length, 0.5, TRACK_WIDTH, trackColor, [centerX, centerY, centerZ]);
  
  setRotation(segment, 0, angle, banking);
  
  // Racing line markers
  if (index % 8 === 0) {
    const marker = createCube(length, 0.1, 1, 0xffffff, [centerX, centerY + 0.3, centerZ]);
    setRotation(marker, 0, angle, banking);
  }
  
  return {
    mesh: segment,
    x: centerX, y: centerY, z: centerZ,
    angle: angle,
    banking: banking,
    index: index
  };
}

async function createTrackDecorations(x, y, z, angle) {
  // Grandstands
  if (Math.random() < 0.3) {
    const standX = x + Math.cos(angle + Math.PI/2) * 40;
    const standZ = z + Math.sin(angle + Math.PI/2) * 40;
    const grandstand = createCube(20, 12, 8, 0x555577, [standX, y + 6, standZ]);
    
    // Stadium lights
    for (let i = 0; i < 4; i++) {
      const lightX = standX + (i - 1.5) * 6;
      const light = createSphere(1, 0xffffaa, [lightX, y + 18, standZ]);
    }
  }
  
  // Sponsor banners
  if (Math.random() < 0.4) {
    const bannerX = x + Math.cos(angle + Math.PI/2) * 25;
    const bannerZ = z + Math.sin(angle + Math.PI/2) * 25;
    const banner = createCube(12, 4, 0.5, COLORS.powerup[Math.floor(Math.random() * COLORS.powerup.length)], 
                             [bannerX, y + 8, bannerZ]);
    setRotation(banner, 0, angle, 0);
  }
}

function createStartFinishLine(x, y, z, angle) {
  // Checkered pattern start/finish
  for (let i = 0; i < 8; i++) {
    const stripX = x + Math.cos(angle + Math.PI/2) * (i - 4) * 2.5;
    const stripZ = z + Math.sin(angle + Math.PI/2) * (i - 4) * 2.5;
    const color = i % 2 === 0 ? 0xffffff : 0x000000;
    const strip = createCube(2, 0.1, 2, color, [stripX, y + 0.3, stripZ]);
  }
  
  // Start gantry
  const gantry = createCube(TRACK_WIDTH * 2, 8, 2, 0x888899, [x, y + 8, z]);
  setRotation(gantry, 0, angle + Math.PI/2, 0);
  
  // Digital display
  const display = createCube(16, 4, 0.5, 0x002200, [x, y + 10, z + 1]);
  setRotation(display, 0, angle + Math.PI/2, 0);
}

function createBoostPad(x, y, z, angle) {
  // Glowing boost pad
  const pad = createCube(8, 0.3, 4, 0x00ff88, [x, y, z]);
  setRotation(pad, 0, angle + Math.PI/2, 0);
  
  // Energy field effect
  const field = createCube(8.5, 1, 4.5, 0x0088ff, [x, y + 0.5, z]);
  setRotation(field, 0, angle + Math.PI/2, 0);
  
  trackPieces.push({
    type: 'boost',
    mesh: pad,
    field: field,
    x: x, y: y, z: z,
    angle: angle
  });
}

function createPlayer() {
  // Sleek F-Zero style racer
  const body = createCube(4, 0.8, 2, COLORS.player, [0, 2, 0]);
  const cockpit = createSphere(1.2, 0x004488, [0, 2.5, 0.3]);
  const wing = createCube(6, 0.2, 0.8, 0x0066aa, [0, 2.8, -1.5]);
  
  // Hover engines
  const engine1 = createCube(0.8, 0.6, 1.5, 0xff4400, [-1.5, 1.5, -0.8]);
  const engine2 = createCube(0.8, 0.6, 1.5, 0xff4400, [1.5, 1.5, -0.8]);
  
  // Underglow
  const glow = createCube(4.5, 0.2, 2.5, 0x00aaff, [0, 1, 0]);
  
  player = {
    body: body,
    cockpit: cockpit,
    wing: wing,
    engines: [engine1, engine2],
    glow: glow,
    x: 0, y: 2, z: -TRACK_RADIUS,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    tilt: 0,
    trackPosition: 0,
    lanePosition: 0,
    speed: 0,
    health: 100,
    boost: 0
  };
}

function spawnOpponents() {
  for (let i = 0; i < OPPONENT_COUNT; i++) {
    const opponent = createOpponent(i);
    opponents.push(opponent);
  }
}

function createOpponent(index) {
  const color = COLORS.opponents[index % COLORS.opponents.length];
  const startPos = (index + 1) * -15; // Stagger starting positions
  
  const body = createCube(4, 0.8, 2, color, [0, 2, startPos]);
  const cockpit = createSphere(1, color - 0x222222, [0, 2.4, startPos + 0.2]);
  const glow = createCube(4.2, 0.2, 2.2, color + 0x333333, [0, 1, startPos]);
  
  return {
    body: body,
    cockpit: cockpit,
    glow: glow,
    x: 0, y: 2, z: startPos,
    vx: 0, vy: 0, vz: 0,
    rotation: 0,
    trackPosition: startPos,
    lanePosition: (Math.random() - 0.5) * 8,
    speed: 40 + Math.random() * 30,
    maxSpeed: 80 + Math.random() * 40,
    aiType: Math.random() < 0.5 ? 'aggressive' : 'defensive',
    nextDecision: Math.random() * 2
  };
}

function spawnPowerUps() {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    const y = Math.sin(angle * 3) * 8 + Math.cos(angle * 1.5) * 4 + 3;
    
    const type = Math.floor(Math.random() * 4);
    const color = COLORS.powerup[type];
    const powerup = createSphere(1, color, [x, y, z]);
    
    powerUps.push({
      mesh: powerup,
      type: ['boost', 'health', 'shield', 'speed'][type],
      x: x, y: y, z: z,
      rotation: 0,
      active: true
    });
  }
}

function initRaceParticles() {
  // Create exhaust particles for all vehicles
  for (let i = 0; i < 50; i++) {
    createExhaustParticle(0, 0, 0);
  }
}

function handleInput(dt) {
  const acceleration = 80;
  const steering = 40;
  const braking = 60;
  
  // Acceleration
  if (btn(2)) { // Up
    speed = Math.min(speed + acceleration * dt, maxSpeed);
  } else {
    speed = Math.max(speed - 20 * dt, 0);
  }
  
  // Braking
  if (btn(3)) { // Down  
    speed = Math.max(speed - braking * dt, 0);
  }
  
  // Steering
  if (btn(0)) { // Left
    player.lanePosition = Math.max(player.lanePosition - steering * dt, -TRACK_WIDTH/2);
    player.tilt = Math.max(player.tilt - dt * 3, -0.5);
  } else if (btn(1)) { // Right
    player.lanePosition = Math.min(player.lanePosition + steering * dt, TRACK_WIDTH/2);
    player.tilt = Math.min(player.tilt + dt * 3, 0.5);
  } else {
    player.tilt *= 0.9;
  }
  
  // Boost
  if (btnp(5) && boost > 20) { // X
    speed += 40;
    boost -= 20;
    createBoostEffect();
  }
}

function updatePlayer(dt) {
  // Update track position
  player.trackPosition += speed * dt;
  
  // Wrap around track
  const trackLength = TRACK_SEGMENTS * 10; // Approximate
  if (player.trackPosition >= trackLength) {
    player.trackPosition -= trackLength;
    currentLap++;
    lapTime = 0;
  }
  
  // Calculate world position from track position
  const normalizedPos = (player.trackPosition / trackLength) * Math.PI * 2;
  const trackX = Math.cos(normalizedPos) * TRACK_RADIUS;
  const trackZ = Math.sin(normalizedPos) * TRACK_RADIUS;
  const trackY = Math.sin(normalizedPos * 3) * 8 + Math.cos(normalizedPos * 1.5) * 4;
  
  // Apply lane offset
  const laneX = trackX + Math.cos(normalizedPos + Math.PI/2) * player.lanePosition;
  const laneZ = trackZ + Math.sin(normalizedPos + Math.PI/2) * player.lanePosition;
  
  player.x = laneX;
  player.y = trackY + 2;
  player.z = laneZ;
  player.rotation = normalizedPos + Math.PI/2;
  
  // Update mesh positions
  setPosition(player.body, player.x, player.y, player.z);
  setPosition(player.cockpit, player.x, player.y + 0.5, player.z + 0.3);
  setPosition(player.wing, player.x, player.y + 0.8, player.z - 1.5);
  setPosition(player.glow, player.x, player.y - 1, player.z);
  
  setPosition(player.engines[0], player.x - 1.5, player.y - 0.5, player.z - 0.8);
  setPosition(player.engines[1], player.x + 1.5, player.y - 0.5, player.z - 0.8);
  
  // Apply rotations
  setRotation(player.body, player.tilt * 0.2, player.rotation, player.tilt);
  setRotation(player.cockpit, 0, player.rotation, 0);
  setRotation(player.wing, 0, player.rotation, player.tilt * 0.5);
  
  // Create exhaust particles
  if (speed > 10) {
    createExhaustParticle(player.x, player.y - 0.5, player.z - 2);
  }
  
  // Boost decay
  boost = Math.max(0, boost - 10 * dt);
  
  // Speed effects
  if (speed > 80) {
    createSpeedParticles();
  }
}

function updateOpponents(dt) {
  opponents.forEach((opponent, index) => {
    // AI decision making
    opponent.nextDecision -= dt;
    if (opponent.nextDecision <= 0) {
      // Change lane or adjust speed based on AI type
      if (opponent.aiType === 'aggressive') {
        opponent.speed = Math.min(opponent.speed + 10, opponent.maxSpeed);
        opponent.lanePosition += (Math.random() - 0.5) * 8;
      } else {
        opponent.speed = Math.max(opponent.speed - 5, 20);
        // Stay in lane more
      }
      
      opponent.lanePosition = Math.max(-TRACK_WIDTH/2, 
                                     Math.min(TRACK_WIDTH/2, opponent.lanePosition));
      opponent.nextDecision = 1 + Math.random() * 3;
    }
    
    // Update position similar to player
    opponent.trackPosition += opponent.speed * dt;
    
    const trackLength = TRACK_SEGMENTS * 10;
    if (opponent.trackPosition >= trackLength) {
      opponent.trackPosition -= trackLength;
    }
    
    const normalizedPos = (opponent.trackPosition / trackLength) * Math.PI * 2;
    const trackX = Math.cos(normalizedPos) * TRACK_RADIUS;
    const trackZ = Math.sin(normalizedPos) * TRACK_RADIUS;
    const trackY = Math.sin(normalizedPos * 3) * 8 + Math.cos(normalizedPos * 1.5) * 4;
    
    const laneX = trackX + Math.cos(normalizedPos + Math.PI/2) * opponent.lanePosition;
    const laneZ = trackZ + Math.sin(normalizedPos + Math.PI/2) * opponent.lanePosition;
    
    opponent.x = laneX;
    opponent.y = trackY + 2;
    opponent.z = laneZ;
    opponent.rotation = normalizedPos + Math.PI/2;
    
    // Update mesh positions
    setPosition(opponent.body, opponent.x, opponent.y, opponent.z);
    setPosition(opponent.cockpit, opponent.x, opponent.y + 0.4, opponent.z + 0.2);
    setPosition(opponent.glow, opponent.x, opponent.y - 1, opponent.z);
    
    setRotation(opponent.body, 0, opponent.rotation, 0);
    
    // Occasional exhaust
    if (Math.random() < 0.3) {
      createExhaustParticle(opponent.x, opponent.y - 0.5, opponent.z - 1.5);
    }
  });
}

function updateTrack(dt) {
  // Animate boost pads
  trackPieces.forEach(piece => {
    if (piece.type === 'boost') {
      piece.pulsePhase = (piece.pulsePhase || 0) + dt * 4;
      const intensity = 0.7 + 0.3 * Math.sin(piece.pulsePhase);
      // In real implementation, would modify material emission
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
    
    particle.vy -= 20 * dt; // Gravity
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
    }
  }
}

function updatePowerUps(dt) {
  powerUps.forEach(powerup => {
    if (!powerup.active) return;
    
    // Rotation animation
    powerup.rotation += dt * 3;
    setRotation(powerup.mesh, 0, powerup.rotation, 0);
    
    // Bob up and down
    const bobY = powerup.y + Math.sin(gameTime * 2 + powerup.x) * 0.5;
    setPosition(powerup.mesh, powerup.x, bobY, powerup.z);
    
    // Check collision with player
    const dx = powerup.x - player.x;
    const dy = powerup.y - player.y;
    const dz = powerup.z - player.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      collectPowerUp(powerup);
    }
  });
}

function updateCamera(dt) {
  // Dynamic racing camera
  const followDistance = 8 + speed * 0.1;
  const followHeight = 4 + speed * 0.02;
  const lookAhead = speed * 0.05;
  
  const cameraX = player.x - Math.sin(player.rotation) * followDistance;
  const cameraY = player.y + followHeight;
  const cameraZ = player.z - Math.cos(player.rotation) * followDistance;
  
  const targetX = player.x + Math.sin(player.rotation) * lookAhead;
  const targetY = player.y + 1;
  const targetZ = player.z + Math.cos(player.rotation) * lookAhead;
  
  setCameraPosition(cameraX, cameraY, cameraZ);
  setCameraTarget(targetX, targetY, targetZ);
  
  // Field of view based on speed
  const fov = 90 + speed * 0.2;
  setCameraFOV(Math.min(fov, 120));
}

function updateRaceLogic(dt) {
  // Calculate race position
  let position = 1;
  opponents.forEach(opponent => {
    if (opponent.trackPosition > player.trackPosition) {
      position++;
    }
  });
  racePosition = position;
  
  // Check for race completion
  if (currentLap > maxLaps) {
    // Race finished!
    console.log(`Race completed! Final position: ${racePosition}`);
  }
}

function collectPowerUp(powerup) {
  switch (powerup.type) {
    case 'boost':
      boost = Math.min(100, boost + 30);
      break;
    case 'health':
      health = Math.min(100, health + 25);
      break;
    case 'shield':
      // Temporary invincibility
      break;
    case 'speed':
      maxSpeed += 10;
      break;
  }
  
  // Hide powerup
  powerup.active = false;
  setScale(powerup.mesh, 0);
  
  // Create collection effect
  createCollectionEffect(powerup.x, powerup.y, powerup.z);
}

function createExhaustParticle(x, y, z) {
  const particle = createSphere(0.3, COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)], [x, y, z]);
  
  particles.push({
    mesh: particle,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 3,
    vz: -Math.random() * 12 - 5,
    life: 1.5,
    maxLife: 1.5,
    type: 'exhaust'
  });
}

function createSpeedParticles() {
  for (let i = 0; i < 3; i++) {
    const particle = createSphere(0.2, 0x00aaff, [
      player.x + (Math.random() - 0.5) * 6,
      player.y + (Math.random() - 0.5) * 2,
      player.z + (Math.random() - 0.5) * 4
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 5,
      vz: -Math.random() * 30 - 10,
      life: 0.8,
      maxLife: 0.8,
      type: 'speed'
    });
  }
}

function createBoostEffect() {
  for (let i = 0; i < 15; i++) {
    const particle = createSphere(0.4, 0x00ffaa, [
      player.x + (Math.random() - 0.5) * 4,
      player.y + (Math.random() - 0.5) * 2,
      player.z - 2
    ]);
    
    particles.push({
      mesh: particle,
      x: player.x, y: player.y, z: player.z - 2,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 8,
      vz: -Math.random() * 20 - 15,
      life: 1.2,
      maxLife: 1.2,
      type: 'boost'
    });
  }
}

function createCollectionEffect(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const particle = createSphere(0.2, 0xffffff, [x, y, z]);
    
    particles.push({
      mesh: particle,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * 8,
      vz: (Math.random() - 0.5) * 12,
      life: 1,
      maxLife: 1,
      type: 'collection'
    });
  }
}

function drawRacingHUD() {
  // Main race HUD
  rect(16, 16, 600, 140, rgba8(0, 0, 40, 200), true);
  rect(16, 16, 600, 140, rgba8(0, 150, 255, 120), false);
  
  // Title
  print('🏁 F-ZERO NOVA', 24, 24, rgba8(0, 255, 255, 255));
  print('ULTIMATE N64 RACING EXPERIENCE', 24, 40, rgba8(255, 200, 0, 255));
  
  // Race stats
  print(`LAP: ${currentLap}/${maxLaps}`, 24, 60, rgba8(255, 255, 100, 255));
  print(`POSITION: ${racePosition}/${OPPONENT_COUNT + 1}`, 24, 76, rgba8(255, 150, 50, 255));
  print(`LAP TIME: ${lapTime.toFixed(1)}s`, 24, 92, rgba8(100, 255, 100, 255));
  
  // Vehicle stats
  print(`SPEED: ${speed.toFixed(0)} KM/H`, 200, 60, rgba8(255, 100, 100, 255));
  print(`MAX SPEED: ${maxSpeed}`, 200, 76, rgba8(255, 200, 200, 255));
  print(`BOOST: ${boost.toFixed(0)}%`, 200, 92, rgba8(0, 200, 255, 255));
  print(`HEALTH: ${health.toFixed(0)}%`, 200, 108, rgba8(255, 255, 255, 255));
  
  // Technical stats
  print(`TRACK POS: ${player.trackPosition.toFixed(0)}`, 380, 60, rgba8(200, 200, 255, 255));
  print(`LANE: ${player.lanePosition.toFixed(1)}`, 380, 76, rgba8(200, 200, 255, 255));
  print(`TILT: ${player.tilt.toFixed(2)}`, 380, 92, rgba8(200, 200, 255, 255));
  
  // 3D Performance
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 500, 76, rgba8(150, 255, 150, 255));
    print(`GPU: ${stats.renderer || 'ThreeJS'}`, 500, 92, rgba8(150, 255, 150, 255));
  }
  
  // Speed gauge (circular)
  const gaugeX = 580;
  const gaugeY = 200;
  const gaugeRadius = 40;
  
  // Gauge background
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2 - Math.PI/2;
    const x1 = gaugeX + Math.cos(angle) * (gaugeRadius - 5);
    const y1 = gaugeY + Math.sin(angle) * (gaugeRadius - 5);
    const x2 = gaugeX + Math.cos(angle) * gaugeRadius;
    const y2 = gaugeY + Math.sin(angle) * gaugeRadius;
    
    const intensity = i < (speed / maxSpeed) * 32 ? 255 : 50;
    line(x1, y1, x2, y2, rgba8(intensity, intensity/2, 0, 255));
  }
  
  // Speed needle
  const needleAngle = (speed / maxSpeed) * Math.PI * 2 - Math.PI/2;
  const needleX = gaugeX + Math.cos(needleAngle) * (gaugeRadius - 8);
  const needleY = gaugeY + Math.sin(needleAngle) * (gaugeRadius - 8);
  line(gaugeX, gaugeY, needleX, needleY, rgba8(255, 255, 255, 255));
  
  print('SPEED', gaugeX - 15, gaugeY + gaugeRadius + 8, rgba8(255, 255, 255, 255));
  
  // Mini-map (track layout)
  const mapX = 500;
  const mapY = 300;
  const mapSize = 80;
  
  rect(mapX - mapSize/2, mapY - mapSize/2, mapSize, mapSize, rgba8(0, 0, 50, 150), true);
  
  // Draw track outline
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const x = mapX + Math.cos(angle) * mapSize * 0.3;
    const y = mapY + Math.sin(angle) * mapSize * 0.3;
    pset(x, y, rgba8(100, 100, 255, 200));
  }
  
  // Player position
  const playerAngle = (player.trackPosition / (TRACK_SEGMENTS * 10)) * Math.PI * 2;
  const playerMapX = mapX + Math.cos(playerAngle) * mapSize * 0.3;
  const playerMapY = mapY + Math.sin(playerAngle) * mapSize * 0.3;
  pset(playerMapX, playerMapY, rgba8(255, 255, 255, 255));
  
  // Opponent positions
  opponents.forEach(opponent => {
    const oppAngle = (opponent.trackPosition / (TRACK_SEGMENTS * 10)) * Math.PI * 2;
    const oppMapX = mapX + Math.cos(oppAngle) * mapSize * 0.3;
    const oppMapY = mapY + Math.sin(oppAngle) * mapSize * 0.3;
    pset(oppMapX, oppMapY, rgba8(255, 100, 100, 200));
  });
  
  print('TRACK', mapX - 15, mapY + mapSize/2 + 8, rgba8(255, 255, 255, 255));
  
  // Controls
  print('↑↓ ACCELERATE/BRAKE | ←→ STEER | X BOOST', 24, 340, rgba8(255, 255, 255, 200));
  print('Experience ultimate Nintendo 64 / F-Zero style 3D racing!', 24, 360, rgba8(100, 255, 100, 180));
}