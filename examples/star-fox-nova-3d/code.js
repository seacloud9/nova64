// STAR FOX NOVA - Ultimate 3D Space Combat
// Nintendo 64 Star Fox style 3D space combat with full GPU acceleration

let gameTime = 0;
let player = null;
let enemies = [];
let bullets = [];
let asteroids = [];
let stars = [];
let planets = [];
let explosions = [];
let powerUps = [];
let score = 0;
let lives = 3;
let wave = 1;
let waveTimer = 0;
let barrelRoll = 0;
let boost = 0;

// Space combat configuration
const SPACE_SIZE = 500;
const STAR_COUNT = 200;
const ASTEROID_COUNT = 30;
const ENEMY_COUNT = 8;
const BULLET_SPEED = 80;
const PLAYER_SPEED = 40;

// Colors (Star Fox inspired)
const COLORS = {
  player: 0x4488ff,
  enemy: [0xff4444, 0xff8844, 0x8844ff, 0x44ff88],
  bullet: [0x00ffff, 0xff00ff, 0xffff00, 0xff0080],
  asteroid: [0x666666, 0x555555, 0x777777, 0x444444],
  star: [0xffffff, 0xffffaa, 0xaaffff, 0xffaaaa],
  planet: [0x4466aa, 0xaa6644, 0x66aa44, 0xaa4466],
  explosion: [0xff6600, 0xff0066, 0xffff00, 0xff3300]
};

export async function init() {
  cls();
  
  // Setup dramatic space combat scene
  setCameraPosition(0, 5, -15);
  setCameraTarget(0, 0, 0);
  setCameraFOV(100); // Wide FOV for space combat
  
  // Space lighting
  setLightDirection(-0.5, -0.3, -0.8);
  setLightColor(0xaabbff);
  setAmbientLight(0x112244);
  
  // Deep space fog
  setFog(0x000022, 100, 800);
  
  // Enable all effects for ultimate experience
  enablePixelation(1);
  enableDithering(true);
  enableBloom(true);
  enableMotionBlur(0.6);
  
  await createSpaceEnvironment();
  createPlayer();
  spawnEnemyWave();
  
  console.log('🚀 STAR FOX NOVA - Ultimate 3D Space Combat loaded!');
  console.log('Prepare for Nintendo 64 style space warfare!');
}

export function update(dt) {
  gameTime += dt;
  waveTimer += dt;
  
  handleInput(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateAsteroids(dt);
  updateExplosions(dt);
  updatePowerUps(dt);
  updateSpaceEnvironment(dt);
  updateCamera(dt);
  updateWaveLogic(dt);
}

export function draw() {
  // 3D scene automatically rendered
  drawSpaceCombatHUD();
}

async function createSpaceEnvironment() {
  // Create starfield
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = (Math.random() - 0.5) * SPACE_SIZE * 2;
    const y = (Math.random() - 0.5) * SPACE_SIZE * 2;
    const z = (Math.random() - 0.5) * SPACE_SIZE * 2;
    
    const size = 0.1 + Math.random() * 0.3;
    const color = COLORS.star[Math.floor(Math.random() * COLORS.star.length)];
    const star = createSphere(size, color, [x, y, z]);
    
    stars.push({
      mesh: star,
      x: x, y: y, z: z,
      brightness: Math.random(),
      twinkleSpeed: 0.5 + Math.random() * 2
    });
  }
  
  // Create asteroid field
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    await createAsteroid();
  }
  
  // Create distant planets
  for (let i = 0; i < 5; i++) {
    const distance = 200 + Math.random() * 300;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 100;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = height;
    
    const size = 8 + Math.random() * 15;
    const color = COLORS.planet[i % COLORS.planet.length];
    const planet = createSphere(size, color, [x, y, z]);
    
    planets.push({
      mesh: planet,
      x: x, y: y, z: z,
      size: size,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      orbitSpeed: (Math.random() - 0.5) * 0.1
    });
  }
  
  // Create nebula effects (particle clouds)
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * SPACE_SIZE;
    const y = (Math.random() - 0.5) * SPACE_SIZE * 0.5;
    const z = (Math.random() - 0.5) * SPACE_SIZE;
    
    const nebula = createSphere(5, 0x442266, [x, y, z]);
    // In real implementation, would use transparent material
  }
}

async function createAsteroid() {
  const x = (Math.random() - 0.5) * SPACE_SIZE;
  const y = (Math.random() - 0.5) * SPACE_SIZE * 0.5;
  const z = (Math.random() - 0.5) * SPACE_SIZE;
  
  const size = 1 + Math.random() * 4;
  const color = COLORS.asteroid[Math.floor(Math.random() * COLORS.asteroid.length)];
  
  // Use cube for irregular asteroid shape
  const asteroid = createCube(size, size * (0.8 + Math.random() * 0.4), size, color, [x, y, z]);
  
  asteroids.push({
    mesh: asteroid,
    x: x, y: y, z: z,
    vx: (Math.random() - 0.5) * 5,
    vy: (Math.random() - 0.5) * 2,
    vz: (Math.random() - 0.5) * 5,
    rotX: Math.random() * 0.5,
    rotY: Math.random() * 0.5,
    rotZ: Math.random() * 0.5,
    size: size,
    health: size * 2
  });
}

function createPlayer() {
  // Classic Arwing-style fighter
  const body = createCube(3, 0.8, 6, COLORS.player, [0, 0, 0]);
  const cockpit = createSphere(1, 0x2266aa, [0, 0.5, 1]);
  
  // Wings
  const leftWing = createCube(8, 0.3, 3, 0x3377bb, [-4, 0, -1]);
  const rightWing = createCube(8, 0.3, 3, 0x3377bb, [4, 0, -1]);
  
  // Engines
  const leftEngine = createCube(1, 1, 2, 0xff4400, [-3, 0, -3]);
  const rightEngine = createCube(1, 1, 2, 0xff4400, [3, 0, -3]);
  
  // Weapon mounts
  const leftGun = createCube(0.3, 0.3, 2, 0xaaaaaa, [-2, 0, 2]);
  const rightGun = createCube(0.3, 0.3, 2, 0xaaaaaa, [2, 0, 2]);
  
  player = {
    body: body,
    cockpit: cockpit,
    wings: [leftWing, rightWing],
    engines: [leftEngine, rightEngine],
    guns: [leftGun, rightGun],
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    rotX: 0, rotY: 0, rotZ: 0,
    health: 100,
    shield: 100,
    speed: PLAYER_SPEED,
    fireRate: 0.1,
    lastShot: 0,
    barrelRoll: 0
  };
}

function spawnEnemyWave() {
  // Clear existing enemies
  enemies.forEach(enemy => destroyMesh(enemy.body));
  enemies = [];
  
  // Spawn new wave
  const waveSize = Math.min(4 + wave * 2, 12);
  
  for (let i = 0; i < waveSize; i++) {
    createEnemy(i);
  }
}

function createEnemy(index) {
  const spawnRadius = 80 + Math.random() * 60;
  const angle = (index / ENEMY_COUNT) * Math.PI * 2 + Math.random() * 0.5;
  
  const x = Math.cos(angle) * spawnRadius;
  const z = Math.sin(angle) * spawnRadius;
  const y = (Math.random() - 0.5) * 40;
  
  const color = COLORS.enemy[index % COLORS.enemy.length];
  
  // Enemy fighter design
  const body = createCube(2.5, 0.6, 4, color, [x, y, z]);
  const cockpit = createSphere(0.8, color - 0x222222, [x, y + 0.3, z + 0.5]);
  
  // Enemy wings (smaller than player)
  const leftWing = createCube(4, 0.2, 2, color + 0x111111, [x - 2, y, z - 0.5]);
  const rightWing = createCube(4, 0.2, 2, color + 0x111111, [x + 2, y, z - 0.5]);
  
  const enemy = {
    body: body,
    cockpit: cockpit,
    wings: [leftWing, rightWing],
    x: x, y: y, z: z,
    vx: 0, vy: 0, vz: 0,
    rotX: 0, rotY: 0, rotZ: 0,
    health: 30 + wave * 10,
    maxHealth: 30 + wave * 10,
    speed: 20 + Math.random() * 20,
    aiType: Math.random() < 0.5 ? 'aggressive' : 'evasive',
    target: { x: 0, y: 0, z: 0 },
    fireRate: 0.5 + Math.random() * 1,
    lastShot: Math.random() * 2,
    maneuverTime: Math.random() * 3
  };
  
  enemies.push(enemy);
}

function handleInput(dt) {
  const maneuverSpeed = 60;
  const rollSpeed = 4;
  
  // Movement
  if (btn(0)) { // Left
    player.vx -= maneuverSpeed * dt;
    player.rotZ = Math.max(player.rotZ - dt * rollSpeed, -1);
  } else if (btn(1)) { // Right
    player.vx += maneuverSpeed * dt;
    player.rotZ = Math.min(player.rotZ + dt * rollSpeed, 1);
  } else {
    player.rotZ *= 0.9;
  }
  
  if (btn(2)) { // Up
    player.vy += maneuverSpeed * dt;
    player.rotX = Math.max(player.rotX - dt * rollSpeed, -0.8);
  } else if (btn(3)) { // Down
    player.vy -= maneuverSpeed * dt;
    player.rotX = Math.min(player.rotX + dt * rollSpeed, 0.8);
  } else {
    player.rotX *= 0.9;
  }
  
  // Firing
  if (btn(5)) { // X - Fire
    fireBullet();
  }
  
  // Barrel roll
  if (btnp(4)) { // Z - Barrel roll
    barrelRoll = 2; // 2 second barrel roll
    boost = 1.5;   // Speed boost during roll
  }
  
  // Boost
  if (btn(6)) { // Space - Boost
    boost = Math.max(boost, 1.2);
  }
}

function updatePlayer(dt) {
  // Apply boost
  if (boost > 1) {
    player.vx *= boost;
    player.vy *= boost;
    player.vz *= boost;
    boost = Math.max(1, boost - dt * 2);
  }
  
  // Apply barrel roll
  if (barrelRoll > 0) {
    barrelRoll -= dt;
    const rollAmount = Math.sin(barrelRoll * Math.PI * 4) * 2;
    player.rotZ += rollAmount * dt * 10;
    
    // Invincibility during barrel roll
    player.invulnerable = barrelRoll > 0;
  }
  
  // Physics
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;
  
  // Forward movement
  player.z += player.speed * dt;
  
  // Damping
  player.vx *= 0.9;
  player.vy *= 0.9;
  
  // Boundaries
  const boundary = SPACE_SIZE / 4;
  if (Math.abs(player.x) > boundary) player.x = Math.sign(player.x) * boundary;
  if (Math.abs(player.y) > boundary) player.y = Math.sign(player.y) * boundary;
  
  // Update mesh positions
  updatePlayerMeshes();
  
  // Create engine trail
  if (Math.random() < 0.5) {
    createEngineTrail();
  }
  
  // Update fire rate
  player.lastShot -= dt;
}

function updatePlayerMeshes() {
  setPosition(player.body, player.x, player.y, player.z);
  setPosition(player.cockpit, player.x, player.y + 0.5, player.z + 1);
  
  setPosition(player.wings[0], player.x - 4, player.y, player.z - 1);
  setPosition(player.wings[1], player.x + 4, player.y, player.z - 1);
  
  setPosition(player.engines[0], player.x - 3, player.y, player.z - 3);
  setPosition(player.engines[1], player.x + 3, player.y, player.z - 3);
  
  setPosition(player.guns[0], player.x - 2, player.y, player.z + 2);
  setPosition(player.guns[1], player.x + 2, player.y, player.z + 2);
  
  // Apply rotations
  setRotation(player.body, player.rotX, player.rotY, player.rotZ);
  setRotation(player.cockpit, player.rotX * 0.5, player.rotY, player.rotZ * 0.3);
  
  player.wings.forEach(wing => {
    setRotation(wing, player.rotX * 0.3, player.rotY, player.rotZ * 0.7);
  });
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // AI behavior
    enemy.maneuverTime -= dt;
    if (enemy.maneuverTime <= 0) {
      // Choose new target
      if (enemy.aiType === 'aggressive') {
        enemy.target.x = player.x + (Math.random() - 0.5) * 20;
        enemy.target.y = player.y + (Math.random() - 0.5) * 20;
        enemy.target.z = player.z + (Math.random() - 0.5) * 20;
      } else {
        // Evasive - move away from player
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dz = enemy.z - player.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance > 0) {
          enemy.target.x = enemy.x + (dx / distance) * 50;
          enemy.target.y = enemy.y + (dy / distance) * 50;
          enemy.target.z = enemy.z + (dz / distance) * 50;
        }
      }
      
      enemy.maneuverTime = 2 + Math.random() * 3;
    }
    
    // Move towards target
    const dx = enemy.target.x - enemy.x;
    const dy = enemy.target.y - enemy.y;
    const dz = enemy.target.z - enemy.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance > 1) {
      enemy.vx += (dx / distance) * enemy.speed * dt;
      enemy.vy += (dy / distance) * enemy.speed * dt;
      enemy.vz += (dz / distance) * enemy.speed * dt;
    }
    
    // Physics
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.z += enemy.vz * dt;
    
    // Damping
    enemy.vx *= 0.95;
    enemy.vy *= 0.95;
    enemy.vz *= 0.95;
    
    // Rotation based on movement
    if (Math.abs(enemy.vx) > 0.1) {
      enemy.rotZ = -enemy.vx * 0.02;
    }
    if (Math.abs(enemy.vy) > 0.1) {
      enemy.rotX = -enemy.vy * 0.02;
    }
    
    // Update mesh positions
    setPosition(enemy.body, enemy.x, enemy.y, enemy.z);
    setPosition(enemy.cockpit, enemy.x, enemy.y + 0.3, enemy.z + 0.5);
    setPosition(enemy.wings[0], enemy.x - 2, enemy.y, enemy.z - 0.5);
    setPosition(enemy.wings[1], enemy.x + 2, enemy.y, enemy.z - 0.5);
    
    setRotation(enemy.body, enemy.rotX, enemy.rotY, enemy.rotZ);
    
    // Enemy firing
    enemy.lastShot -= dt;
    if (enemy.lastShot <= 0) {
      const distToPlayer = Math.sqrt((enemy.x - player.x)**2 + (enemy.y - player.y)**2 + (enemy.z - player.z)**2);
      if (distToPlayer < 100 && Math.random() < 0.3) {
        fireEnemyBullet(enemy);
        enemy.lastShot = enemy.fireRate;
      }
    }
    
    // Remove distant enemies
    if (Math.abs(enemy.x - player.x) > 200 || Math.abs(enemy.z - player.z) > 200) {
      destroyMesh(enemy.body);
      destroyMesh(enemy.cockpit);
      enemy.wings.forEach(wing => destroyMesh(wing));
      enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // Physics
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.z += bullet.vz * dt;
    
    bullet.life -= dt;
    
    // Update position
    setPosition(bullet.mesh, bullet.x, bullet.y, bullet.z);
    
    // Check collisions
    if (bullet.owner === 'player') {
      // Check enemy collisions
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dz = bullet.z - enemy.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < 3) {
          // Hit enemy
          enemy.health -= 25;
          createExplosion(bullet.x, bullet.y, bullet.z, 'small');
          
          if (enemy.health <= 0) {
            destroyEnemy(enemy, j);
            score += 100 * wave;
          }
          
          // Remove bullet
          destroyMesh(bullet.mesh);
          bullets.splice(i, 1);
          break;
        }
      }
      
      // Check asteroid collisions
      asteroids.forEach(asteroid => {
        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        const dz = bullet.z - asteroid.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < asteroid.size + 1) {
          asteroid.health -= 10;
          createExplosion(bullet.x, bullet.y, bullet.z, 'small');
          
          if (asteroid.health <= 0) {
            createExplosion(asteroid.x, asteroid.y, asteroid.z, 'large');
            // Break asteroid into smaller pieces
          }
        }
      });
    } else {
      // Enemy bullet - check player collision
      if (!player.invulnerable) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const dz = bullet.z - player.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < 4) {
          player.health -= 15;
          player.shield -= 10;
          createExplosion(bullet.x, bullet.y, bullet.z, 'small');
          
          if (player.health <= 0) {
            lives--;
            player.health = 100;
            player.shield = 100;
            
            if (lives <= 0) {
              // Game over
              console.log('Game Over! Final Score:', score);
            }
          }
          
          destroyMesh(bullet.mesh);
          bullets.splice(i, 1);
          continue;
        }
      }
    }
    
    // Remove old bullets
    if (bullet.life <= 0 || Math.abs(bullet.z - player.z) > 200) {
      destroyMesh(bullet.mesh);
      bullets.splice(i, 1);
    }
  }
}

function updateAsteroids(dt) {
  asteroids.forEach(asteroid => {
    // Rotation
    asteroid.rotX += asteroid.vx * dt * 0.1;
    asteroid.rotY += asteroid.vy * dt * 0.1;
    asteroid.rotZ += asteroid.vz * dt * 0.1;
    
    // Movement
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    asteroid.z += asteroid.vz * dt;
    
    // Update mesh
    setPosition(asteroid.mesh, asteroid.x, asteroid.y, asteroid.z);
    setRotation(asteroid.mesh, asteroid.rotX, asteroid.rotY, asteroid.rotZ);
    
    // Wrap around space
    if (Math.abs(asteroid.x) > SPACE_SIZE) asteroid.x *= -0.9;
    if (Math.abs(asteroid.y) > SPACE_SIZE/2) asteroid.y *= -0.9;
    if (Math.abs(asteroid.z) > SPACE_SIZE) asteroid.z *= -0.9;
  });
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.life -= dt;
    explosion.scale += dt * 5;
    
    // Update explosion particles
    explosion.particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      
      setPosition(particle.mesh, particle.x, particle.y, particle.z);
      setScale(particle.mesh, explosion.scale * (explosion.life / 2));
    });
    
    if (explosion.life <= 0) {
      explosion.particles.forEach(particle => destroyMesh(particle.mesh));
      explosions.splice(i, 1);
    }
  }
}

function updatePowerUps(dt) {
  powerUps.forEach(powerup => {
    // Rotation and movement
    powerup.rotation += dt * 2;
    powerup.y += Math.sin(gameTime * 2 + powerup.x) * dt;
    
    setPosition(powerup.mesh, powerup.x, powerup.y, powerup.z);
    setRotation(powerup.mesh, 0, powerup.rotation, 0);
    
    // Check player collision
    const dx = powerup.x - player.x;
    const dy = powerup.y - player.y;
    const dz = powerup.z - player.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      collectPowerUp(powerup);
    }
  });
}

function updateSpaceEnvironment(dt) {
  // Twinkling stars
  stars.forEach(star => {
    star.brightness += Math.sin(gameTime * star.twinkleSpeed) * dt * 0.5;
    star.brightness = Math.max(0.3, Math.min(1, star.brightness));
    
    // In real implementation, would modify material emission
    const scale = 0.5 + star.brightness * 0.5;
    setScale(star.mesh, scale);
  });
  
  // Rotating planets
  planets.forEach(planet => {
    planet.rotationSpeed += dt;
    setRotation(planet.mesh, planet.rotationSpeed, planet.rotationSpeed * 0.7, 0);
  });
}

function updateCamera(dt) {
  // Dynamic combat camera
  const followDistance = 12 + boost * 3;
  const followHeight = 3 + Math.abs(player.vy) * 0.1;
  const shakeFactor = barrelRoll > 0 ? Math.sin(barrelRoll * 20) * 0.5 : 0;
  
  const cameraX = player.x - Math.sin(player.rotY) * followDistance + shakeFactor;
  const cameraY = player.y + followHeight + shakeFactor * 0.5;
  const cameraZ = player.z - Math.cos(player.rotY) * followDistance;
  
  setCameraPosition(cameraX, cameraY, cameraZ);
  setCameraTarget(player.x, player.y, player.z + 10);
  
  // FOV based on speed
  const fov = 100 + boost * 10;
  setCameraFOV(Math.min(fov, 130));
}

function updateWaveLogic(dt) {
  // Check if wave is complete
  if (enemies.length === 0 && waveTimer > 3) {
    wave++;
    waveTimer = 0;
    spawnEnemyWave();
    
    // Spawn power-ups between waves
    if (Math.random() < 0.5) {
      spawnPowerUp();
    }
  }
}

function fireBullet() {
  if (player.lastShot <= 0) {
    // Fire from both guns
    for (let i = 0; i < 2; i++) {
      const gunX = player.x + (i === 0 ? -2 : 2);
      const bullet = createSphere(0.3, COLORS.bullet[0], [gunX, player.y, player.z + 2]);
      
      bullets.push({
        mesh: bullet,
        x: gunX,
        y: player.y,
        z: player.z + 2,
        vx: 0,
        vy: 0,
        vz: BULLET_SPEED,
        life: 3,
        owner: 'player'
      });
    }
    
    player.lastShot = player.fireRate;
  }
}

function fireEnemyBullet(enemy) {
  const bullet = createSphere(0.25, COLORS.bullet[1], [enemy.x, enemy.y, enemy.z]);
  
  // Aim at player
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dz = player.z - enemy.z;
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  const speed = 60;
  bullets.push({
    mesh: bullet,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    vz: (dz / distance) * speed,
    life: 4,
    owner: 'enemy'
  });
}

function createExplosion(x, y, z, size) {
  const particleCount = size === 'large' ? 15 : 8;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const color = COLORS.explosion[Math.floor(Math.random() * COLORS.explosion.length)];
    const particle = createSphere(0.5, color, [x, y, z]);
    
    particles.push({
      mesh: particle,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      vz: (Math.random() - 0.5) * 20
    });
  }
  
  explosions.push({
    particles: particles,
    life: 2,
    scale: size === 'large' ? 2 : 1
  });
}

function destroyEnemy(enemy, index) {
  createExplosion(enemy.x, enemy.y, enemy.z, 'large');
  
  // Destroy meshes
  destroyMesh(enemy.body);
  destroyMesh(enemy.cockpit);
  enemy.wings.forEach(wing => destroyMesh(wing));
  
  enemies.splice(index, 1);
  
  // Chance to spawn power-up
  if (Math.random() < 0.3) {
    spawnPowerUpAt(enemy.x, enemy.y, enemy.z);
  }
}

function spawnPowerUp() {
  const x = (Math.random() - 0.5) * 100;
  const y = (Math.random() - 0.5) * 50;
  const z = player.z + 50 + Math.random() * 100;
  
  spawnPowerUpAt(x, y, z);
}

function spawnPowerUpAt(x, y, z) {
  const types = ['health', 'shield', 'fireRate', 'speed'];
  const type = types[Math.floor(Math.random() * types.length)];
  const color = COLORS.powerup[types.indexOf(type)];
  
  const powerup = createCube(1.5, 1.5, 1.5, color, [x, y, z]);
  
  powerUps.push({
    mesh: powerup,
    type: type,
    x: x, y: y, z: z,
    rotation: 0
  });
}

function collectPowerUp(powerup) {
  switch (powerup.type) {
    case 'health':
      player.health = Math.min(100, player.health + 30);
      break;
    case 'shield':
      player.shield = Math.min(100, player.shield + 40);
      break;
    case 'fireRate':
      player.fireRate = Math.max(0.05, player.fireRate - 0.02);
      break;
    case 'speed':
      player.speed += 5;
      break;
  }
  
  destroyMesh(powerup.mesh);
  const index = powerUps.indexOf(powerup);
  if (index > -1) powerUps.splice(index, 1);
  
  createExplosion(powerup.x, powerup.y, powerup.z, 'small');
}

function createEngineTrail() {
  const trail1 = createSphere(0.2, 0xff4400, [player.x - 3, player.y, player.z - 4]);
  const trail2 = createSphere(0.2, 0xff4400, [player.x + 3, player.y, player.z - 4]);
  
  [trail1, trail2].forEach(trail => {
    explosions.push({
      particles: [{
        mesh: trail,
        x: player.x, y: player.y, z: player.z - 4,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        vz: -10 - Math.random() * 10
      }],
      life: 0.5,
      scale: 1
    });
  });
}

function drawSpaceCombatHUD() {
  // Main combat HUD
  rect(16, 16, 600, 160, rgba8(0, 0, 60, 200), true);
  rect(16, 16, 600, 160, rgba8(0, 200, 255, 120), false);
  
  // Title
  print('🚀 STAR FOX NOVA', 24, 24, rgba8(0, 255, 255, 255));
  print('ULTIMATE N64 SPACE COMBAT', 24, 40, rgba8(255, 150, 0, 255));
  
  // Player stats
  print(`HEALTH: ${player.health.toFixed(0)}%`, 24, 60, rgba8(255, 100, 100, 255));
  print(`SHIELD: ${player.shield.toFixed(0)}%`, 24, 76, rgba8(100, 100, 255, 255));
  print(`LIVES: ${lives}`, 24, 92, rgba8(255, 255, 100, 255));
  
  // Combat stats
  print(`SCORE: ${score}`, 200, 60, rgba8(255, 255, 255, 255));
  print(`WAVE: ${wave}`, 200, 76, rgba8(100, 255, 100, 255));
  print(`ENEMIES: ${enemies.length}`, 200, 92, rgba8(255, 150, 150, 255));
  
  // Speed and position
  const speedMag = Math.sqrt(player.vx**2 + player.vy**2 + player.vz**2);
  print(`SPEED: ${(speedMag + player.speed).toFixed(0)}`, 350, 60, rgba8(255, 255, 100, 255));
  print(`BOOST: ${boost.toFixed(1)}x`, 350, 76, rgba8(0, 255, 200, 255));
  print(`ALTITUDE: ${player.y.toFixed(0)}`, 350, 92, rgba8(200, 200, 255, 255));
  
  // Special status
  if (barrelRoll > 0) {
    print('BARREL ROLL!', 350, 108, rgba8(255, 255, 0, 255));
  }
  if (player.invulnerable) {
    print('INVULNERABLE', 200, 108, rgba8(0, 255, 0, 255));
  }
  
  // 3D Performance
  const stats = get3DStats();
  if (stats) {
    print(`3D MESHES: ${stats.meshes || 0}`, 480, 76, rgba8(150, 255, 150, 255));
    print(`RENDERER: ${stats.renderer || 'ThreeJS'}`, 480, 92, rgba8(150, 255, 150, 255));
  }
  
  // Health bar
  const healthBarWidth = 200;
  const healthBarHeight = 8;
  const healthBarX = 24;
  const healthBarY = 130;
  
  rect(healthBarX, healthBarY, healthBarWidth, healthBarHeight, rgba8(100, 0, 0, 200), true);
  rect(healthBarX, healthBarY, (player.health / 100) * healthBarWidth, healthBarHeight, rgba8(255, 0, 0, 255), true);
  print('HEALTH', healthBarX, healthBarY + 12, rgba8(255, 255, 255, 200));
  
  // Shield bar
  const shieldBarX = healthBarX + healthBarWidth + 20;
  rect(shieldBarX, healthBarY, healthBarWidth, healthBarHeight, rgba8(0, 0, 100, 200), true);
  rect(shieldBarX, healthBarY, (player.shield / 100) * healthBarWidth, healthBarHeight, rgba8(0, 100, 255, 255), true);
  print('SHIELD', shieldBarX, healthBarY + 12, rgba8(255, 255, 255, 200));
  
  // Radar display
  const radarX = 550;
  const radarY = 250;
  const radarSize = 60;
  
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 50, 0, 150), true);
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 255, 0, 100), false);
  
  // Radar sweep line
  const sweepAngle = gameTime * 2;
  const sweepX = radarX + Math.cos(sweepAngle) * radarSize * 0.4;
  const sweepY = radarY + Math.sin(sweepAngle) * radarSize * 0.4;
  line(radarX, radarY, sweepX, sweepY, rgba8(0, 255, 0, 150));
  
  // Player dot (center)
  pset(radarX, radarY, rgba8(255, 255, 255, 255));
  
  // Enemy dots
  enemies.forEach(enemy => {
    const relX = (enemy.x - player.x) / 100 * radarSize * 0.4;
    const relZ = (enemy.z - player.z) / 100 * radarSize * 0.4;
    if (Math.abs(relX) < radarSize/2 && Math.abs(relZ) < radarSize/2) {
      pset(radarX + relX, radarY + relZ, rgba8(255, 100, 100, 200));
    }
  });
  
  print('RADAR', radarX - 15, radarY + radarSize/2 + 8, rgba8(0, 255, 0, 255));
  
  // Crosshair
  const centerX = 320;
  const centerY = 180;
  line(centerX - 10, centerY, centerX + 10, centerY, rgba8(255, 255, 255, 150));
  line(centerX, centerY - 10, centerX, centerY + 10, rgba8(255, 255, 255, 150));
  
  // Controls
  print('WASD: Maneuver | X: Fire | Z: Barrel Roll | SPACE: Boost', 24, 340, rgba8(255, 255, 255, 200));
  print('Experience ultimate Nintendo 64 / Star Fox style 3D space combat!', 24, 360, rgba8(100, 255, 100, 180));
}