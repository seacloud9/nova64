// CYBER KNIGHT 3D - True 3D Platformer Adventure
// Nintendo 64 / PlayStation style 3D platforming with full GPU acceleration

// Game state
let gameTime = 0;
let gameState = 'start'; // 'start', 'playing'
let startScreenTime = 0;
let uiButtons = [];
let score = 0;
let level = 1;

// 3D Game objects
let playerKnight = null;
let platforms = [];
let enemies = [];
let coins = [];
let particles = [];
let environment = [];

// Player state
let player = {
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  onGround: false,
  health: 100,
  energy: 100,
  coins: 0,
  facingRight: true,
  jumpPower: 8,
  speed: 6,
  doubleJump: true,
  attackCooldown: 0
};

// Camera state
let camera = {
  x: 0, y: 8, z: 15,
  targetX: 0, targetY: 5, targetZ: 0,
  smoothing: 0.1
};

export async function init() {
  cls();
  
  // Setup 3D scene with N64-style aesthetics
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(camera.targetX, camera.targetY, camera.targetZ);
  setCameraFOV(65);
  
  // Setup dramatic lighting
  setLightDirection(-0.7, -1, -0.3);
  setFog(0x2233aa, 30, 100);
  
  // Enable retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Create player knight
  playerKnight = createPlayerKnight();
  
  // Create world environment
  await createWorld();
  
  // Create platforms and obstacles
  createPlatforms();
  
  // Spawn enemies and collectibles
  spawnEnemies();
  spawnCoins();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('Cyber Knight 3D - 3D Platformer initialized');
  console.log('Use ARROWS to move, UP to jump, Z to attack');
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(240), 150, 240, 60, '⚔ BEGIN QUEST', () => {
      console.log('🎯 BEGIN QUEST CLICKED! Changing gameState to playing...');
      gameState = 'playing';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(255, 100, 50, 255),
      hoverColor: rgba8(255, 130, 80, 255),
      pressedColor: rgba8(220, 70, 30, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 355, 200, 45, '🎮 CONTROLS', () => {
      console.log('Controls: Arrows=Move, UP=Jump, Z=Attack');
    }, {
      normalColor: rgba8(100, 150, 255, 255),
      hoverColor: rgba8(130, 180, 255, 255),
      pressedColor: rgba8(70, 120, 220, 255)
    })
  );
}

export function update(dt) {
  gameTime += dt;
  
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    
    // Animate scene in background
    updateEnemies(dt);
    updateCoins(dt);
    updateParticles(dt);
    return;
  }
  
  if (gameState === 'playing') {
    updateInput(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateCoins(dt);
    updateParticles(dt);
    updateCamera(dt);
    checkCollisions(dt);
    updateGameLogic(dt);
  }
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // 3D scene is automatically rendered by GPU backend
  // Draw UI overlay using 2D API
  drawUI();
}

function drawStartScreen() {
  // Action gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(60, 30, 20, 230),
    rgba8(30, 15, 10, 245),
    true
  );
  
  // Animated title
  setFont('huge');
  setTextAlign('center');
  const flash = Math.sin(startScreenTime * 4) * 0.4 + 0.6;
  const actionColor = rgba8(
    255,
    Math.floor(flash * 150),
    Math.floor(flash * 50),
    255
  );
  
  const shake = Math.sin(startScreenTime * 10) * 3;
  drawTextShadow('CYBER', 320 + shake, 50, actionColor, rgba8(0, 0, 0, 255), 7, 1);
  drawTextShadow('KNIGHT 3D', 320, 105, rgba8(150, 200, 255, 255), rgba8(0, 0, 0, 255), 7, 1);
  
  // Subtitle
  setFont('large');
  const pulse = Math.sin(startScreenTime * 3) * 0.2 + 0.8;
  drawTextOutline('⚔ 3D Platformer Adventure ⚔', 320, 165, 
    rgba8(255, 200, 100, Math.floor(pulse * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 210, 480, 190, {
    bgColor: rgba8(40, 20, 15, 210),
    borderColor: rgba8(255, 100, 50, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(60, 30, 20, 210)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('KNIGHT\'S MISSION', 320, 230, rgba8(255, 200, 100, 255), 1);
  
  setFont('small');
  drawText('⚔ Jump across platforms and defeat enemies', 320, 255, uiColors.light, 1);
  drawText('⚔ Collect coins and power-ups', 320, 270, uiColors.light, 1);
  drawText('⚔ Double jump and combat abilities', 320, 285, uiColors.light, 1);
  drawText('⚔ Nintendo 64 / PlayStation style graphics', 320, 300, uiColors.light, 1);
  
  setFont('tiny');
  drawText('Arrows: Move | UP: Jump | Z: Attack', 320, 320, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('⚔ EMBARK ON YOUR QUEST ⚔', 320, 430, rgba8(255, 150, 50, alpha), 1);
  
  // Info
  setFont('tiny');
  drawText('True 3D Platforming Action', 320, 345, rgba8(200, 150, 100, 150), 1);
}

function createPlayerKnight() {
  // Create main body
  const body = createCube(0.8, 0x4444aa, [0, 0, 0]);
  setScale(body, 0.8, 1.2, 0.6);
  
  // Create helmet
  const helmet = createSphere(0.4, 0xcccccc, [0, 0.8, 0]);
  setScale(helmet, 0.6, 0.5, 0.6);
  
  // Create sword
  const sword = createCube(0.1, 0xdddddd, [0.6, 0.5, 0]);
  setScale(sword, 0.15, 1.5, 0.1);
  
  // Create cape
  const cape = createCube(0.4, 0xaa2222, [0, 0, -0.4]);
  setScale(cape, 1.0, 1.4, 0.2);
  
  return { body, helmet, sword, cape };
}

async function createWorld() {
  // Create ground plane
  const ground = createPlane(100, 100, 0x336633, [0, -1, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
  
  // Create background mountains
  for (let i = 0; i < 8; i++) {
    const mountain = createCube(8, 10 + Math.random() * 8, 0x445566, [
      (i - 4) * 15 + (Math.random() - 0.5) * 5,
      3,
      -40 - Math.random() * 20
    ]);
    setScale(mountain, 1, 1 + Math.random() * 0.5, 1);
  }
  
  // Create crystal formations
  for (let i = 0; i < 12; i++) {
    const crystal = createCube(0.5, 2, 0x4488ff, [
      (Math.random() - 0.5) * 80,
      1,
      (Math.random() - 0.5) * 60
    ]);
    setScale(crystal, 0.3 + Math.random() * 0.4, 1.5 + Math.random(), 0.3);
    setRotation(crystal, 0, Math.random() * Math.PI, 0);
  }
  
  // Create ancient pillars
  for (let i = 0; i < 6; i++) {
    const pillar = createCube(1, 6, 0x888844, [
      (i - 3) * 12,
      3,
      -15 + (Math.random() - 0.5) * 10
    ]);
    setScale(pillar, 0.8, 1, 0.8);
  }
}

function createPlatforms() {
  platforms = [];
  
  // Ground level platforms
  for (let i = -5; i <= 5; i++) {
    const platform = {
      mesh: createCube(4, 0.5, 0x666666, [i * 8, -0.25, 0]),
      x: i * 8, y: -0.25, z: 0,
      width: 4, height: 0.5, depth: 4
    };
    setScale(platform.mesh, 1, 1, 4);
    platforms.push(platform);
  }
  
  // Floating platforms - create a jumping course
  const platformData = [
    { x: 15, y: 4, z: 5 },
    { x: 25, y: 7, z: 10 },
    { x: 35, y: 10, z: 8 },
    { x: 20, y: 13, z: -5 },
    { x: 5, y: 16, z: -10 },
    { x: -10, y: 12, z: -15 },
    { x: -25, y: 8, z: -8 },
    { x: -35, y: 5, z: 5 }
  ];
  
  platformData.forEach(data => {
    const platform = {
      mesh: createCube(3, 0.8, 0x8844aa, [data.x, data.y, data.z]),
      x: data.x, y: data.y, z: data.z,
      width: 3, height: 0.8, depth: 3
    };
    platforms.push(platform);
  });
}

function spawnEnemies() {
  enemies = [];
  
  // Ground patrol enemies
  for (let i = 0; i < 5; i++) {
    const enemy = {
      mesh: createCube(0.6, 0xff4444, [(i - 2) * 15, 0.5, 8]),
      x: (i - 2) * 15, y: 0.5, z: 8,
      vx: (Math.random() > 0.5 ? 1 : -1) * 2,
      health: 3,
      type: 'patrol',
      patrolRange: 10,
      originalX: (i - 2) * 15,
      attackCooldown: 0
    };
    setScale(enemy.mesh, 0.8, 0.8, 0.8);
    enemies.push(enemy);
  }
  
  // Flying enemies
  for (let i = 0; i < 3; i++) {
    const enemy = {
      mesh: createSphere(0.4, 0xff8844, [i * 20 - 20, 8 + i * 2, 0]),
      x: i * 20 - 20, y: 8 + i * 2, z: 0,
      vx: Math.sin(i) * 3, vy: 0, vz: Math.cos(i) * 2,
      health: 2,
      type: 'flyer',
      orbitCenter: { x: i * 20 - 20, y: 8 + i * 2, z: 0 },
      orbitRadius: 5,
      orbitAngle: i * 2,
      attackCooldown: 0
    };
    enemies.push(enemy);
  }
}

function spawnCoins() {
  coins = [];
  
  // Place coins on platforms
  platforms.forEach((platform, i) => {
    if (i > 8) { // Skip ground platforms
      const coin = {
        mesh: createSphere(0.3, 0xffdd00, [platform.x, platform.y + 1.5, platform.z]),
        x: platform.x, y: platform.y + 1.5, z: platform.z,
        collected: false,
        rotationY: 0,
        bobOffset: Math.random() * Math.PI * 2
      };
      coins.push(coin);
    }
  });
  
  // Bonus coins in hard to reach places
  for (let i = 0; i < 8; i++) {
    const coin = {
      mesh: createSphere(0.25, 0xffaa00, [
        (Math.random() - 0.5) * 60,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 30
      ]),
      x: 0, y: 0, z: 0,
      collected: false,
      rotationY: 0,
      bobOffset: Math.random() * Math.PI * 2
    };
    const pos = getPosition(coin.mesh);
    coin.x = pos[0]; coin.y = pos[1]; coin.z = pos[2];
    coins.push(coin);
  }
}

function updateInput(dt) {
  const moveSpeed = player.speed;
  
  // Movement
  if (btn(0)) { // Left
    player.vx = -moveSpeed;
    player.facingRight = false;
  } else if (btn(1)) { // Right
    player.vx = moveSpeed;
    player.facingRight = true;
  } else {
    player.vx *= 0.8; // Friction
  }
  
  // Forward/backward movement
  if (btn(3)) { // Down
    player.vz = moveSpeed * 0.7;
  } else if (btn(2) && player.onGround) { // Up - jump when on ground
    player.vy = player.jumpPower;
    player.onGround = false;
    player.doubleJump = true;
    createJumpParticles();
  } else if (btn(2) && player.doubleJump && player.energy >= 20) { // Double jump
    player.vy = player.jumpPower * 0.8;
    player.doubleJump = false;
    player.energy -= 20;
    createDoubleJumpParticles();
  } else {
    player.vz *= 0.8;
  }
  
  // Attack
  player.attackCooldown -= dt;
  if (btn(4) && player.attackCooldown <= 0) { // Z key
    performAttack();
    player.attackCooldown = 0.5;
  }
}

function updatePlayer(dt) {
  // Apply gravity
  player.vy -= 25 * dt;
  
  // Update position
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;
  
  // Platform collision detection
  player.onGround = false;
  
  for (const platform of platforms) {
    // Simple AABB collision
    if (player.x > platform.x - platform.width/2 && 
        player.x < platform.x + platform.width/2 &&
        player.z > platform.z - platform.depth/2 && 
        player.z < platform.z + platform.depth/2) {
      
      if (player.y <= platform.y + platform.height && 
          player.y + player.vy * dt > platform.y + platform.height) {
        player.y = platform.y + platform.height;
        player.vy = 0;
        player.onGround = true;
        player.doubleJump = true;
      }
    }
  }
  
  // World boundaries
  if (player.x < -50) player.x = -50;
  if (player.x > 50) player.x = 50;
  if (player.z < -30) player.z = -30;
  if (player.z > 30) player.z = 30;
  
  // Fall reset
  if (player.y < -10) {
    player.x = 0;
    player.y = 2;
    player.z = 0;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.health -= 20;
  }
  
  // Update knight meshes
  updatePlayerMeshes();
  
  // Regenerate energy
  if (player.energy < 100) {
    player.energy += 25 * dt;
  }
}

function updatePlayerMeshes() {
  setPosition(playerKnight.body, player.x, player.y, player.z);
  setPosition(playerKnight.helmet, player.x, player.y + 0.8, player.z);
  setPosition(playerKnight.cape, player.x, player.y, player.z - 0.4);
  
  // Sword position based on facing direction
  const swordX = player.facingRight ? player.x + 0.6 : player.x - 0.6;
  setPosition(playerKnight.sword, swordX, player.y + 0.5, player.z);
  
  // Animate based on movement
  const walkCycle = Math.sin(gameTime * 8) * 0.1;
  setRotation(playerKnight.body, walkCycle, player.facingRight ? 0 : Math.PI, 0);
  
  // Cape physics
  const capeSwing = Math.sin(gameTime * 4) * 0.2;
  setRotation(playerKnight.cape, 0, capeSwing, 0);
}

function performAttack() {
  // Create attack effect
  const attackEffect = createSphere(1.5, 0xffff44, [
    player.x + (player.facingRight ? 2 : -2),
    player.y + 0.5,
    player.z
  ]);
  
  setTimeout(() => destroyMesh(attackEffect), 200);
  
  // Check for enemy hits
  enemies.forEach(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dz = enemy.z - player.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (distance < 3) {
      enemy.health -= 2;
      createHitParticles(enemy.x, enemy.y, enemy.z);
      
      if (enemy.health <= 0) {
        destroyMesh(enemy.mesh);
        enemy.dead = true;
        score += 100;
      }
    }
  });
}

function updateEnemies(dt) {
  enemies.forEach(enemy => {
    if (enemy.dead) return;
    
    enemy.attackCooldown -= dt;
    
    switch (enemy.type) {
      case 'patrol':
        // Patrol back and forth
        enemy.x += enemy.vx * dt;
        
        if (Math.abs(enemy.x - enemy.originalX) > enemy.patrolRange) {
          enemy.vx *= -1;
        }
        
        setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
        
        // Attack player if close
        const distToPlayer = Math.sqrt(
          Math.pow(enemy.x - player.x, 2) + 
          Math.pow(enemy.z - player.z, 2)
        );
        
        if (distToPlayer < 4 && enemy.attackCooldown <= 0) {
          // Simple attack - damage player
          if (distToPlayer < 2) {
            player.health -= 10;
            enemy.attackCooldown = 2;
          }
        }
        break;
        
      case 'flyer':
        // Orbit around center point
        enemy.orbitAngle += dt * 2;
        enemy.x = enemy.orbitCenter.x + Math.cos(enemy.orbitAngle) * enemy.orbitRadius;
        enemy.z = enemy.orbitCenter.z + Math.sin(enemy.orbitAngle) * enemy.orbitRadius;
        enemy.y = enemy.orbitCenter.y + Math.sin(enemy.orbitAngle * 2) * 2;
        
        setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
        rotateMesh(enemy.mesh, 0, dt * 3, 0);
        break;
    }
  });
  
  // Remove dead enemies
  enemies = enemies.filter(enemy => !enemy.dead);
}

function updateCoins(dt) {
  coins.forEach(coin => {
    if (coin.collected) return;
    
    // Animate coins
    coin.rotationY += dt * 4;
    coin.bobOffset += dt * 3;
    const newY = coin.y + Math.sin(coin.bobOffset) * 0.3;
    
    setPosition(coin.mesh, coin.x, newY, coin.z);
    setRotation(coin.mesh, 0, coin.rotationY, 0);
    
    // Check collection
    const distance = Math.sqrt(
      Math.pow(coin.x - player.x, 2) +
      Math.pow(newY - player.y, 2) +
      Math.pow(coin.z - player.z, 2)
    );
    
    if (distance < 1.5) {
      coin.collected = true;
      destroyMesh(coin.mesh);
      player.coins += 10;
      score += 50;
      createCoinParticles(coin.x, coin.y, coin.z);
    }
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= dt;
    
    const pos = getPosition(particle.mesh);
    pos[0] += particle.vx * dt;
    pos[1] += particle.vy * dt;
    pos[2] += particle.vz * dt;
    particle.vy -= 10 * dt; // Gravity
    
    setPosition(particle.mesh, pos[0], pos[1], pos[2]);
    
    const scale = particle.life / particle.maxLife;
    setScale(particle.mesh, scale);
    
    if (particle.life <= 0) {
      destroyMesh(particle.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateCamera(dt) {
  // Smooth camera following
  camera.targetX = player.x;
  camera.targetY = player.y + 5;
  camera.targetZ = player.z;
  
  camera.x += (player.x - camera.x) * camera.smoothing;
  camera.y += (player.y + 8 - camera.y) * camera.smoothing;
  camera.z += (player.z + 15 - camera.z) * camera.smoothing;
  
  setCameraPosition(camera.x, camera.y, camera.z);
  setCameraTarget(camera.targetX, camera.targetY, camera.targetZ);
}

function checkCollisions(dt) {
  // Already handled in updatePlayer and updateEnemies
}

function updateGameLogic(dt) {
  // Check for level completion
  const remainingCoins = coins.filter(coin => !coin.collected).length;
  if (remainingCoins === 0) {
    level++;
    score += 1000;
    // Could spawn new level here
  }
  
  // Game over check
  if (player.health <= 0) {
    gameState = 'gameOver';
  }
}

function createJumpParticles() {
  for (let i = 0; i < 5; i++) {
    const particle = {
      mesh: createSphere(0.1, 0x88ccff, [player.x, player.y - 0.5, player.z]),
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 1
    };
    particles.push(particle);
  }
}

function createDoubleJumpParticles() {
  for (let i = 0; i < 8; i++) {
    const particle = {
      mesh: createSphere(0.15, 0xffff44, [player.x, player.y, player.z]),
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      vz: (Math.random() - 0.5) * 6,
      life: 1.5,
      maxLife: 1.5
    };
    particles.push(particle);
  }
}

function createHitParticles(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const particle = {
      mesh: createSphere(0.08, 0xff4444, [x, y, z]),
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6,
      vz: (Math.random() - 0.5) * 8,
      life: 0.8,
      maxLife: 0.8
    };
    particles.push(particle);
  }
}

function createCoinParticles(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const particle = {
      mesh: createSphere(0.05, 0xffdd00, [x, y, z]),
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 2,
      vz: (Math.random() - 0.5) * 5,
      life: 1.2,
      maxLife: 1.2
    };
    particles.push(particle);
  }
}

function drawUI() {
  // HUD Background
  rect(16, 16, 400, 80, rgba8(0, 0, 0, 150), true);
  rect(16, 16, 400, 80, rgba8(100, 50, 200, 100), false);
  
  // Score and Level
  print(`SCORE: ${score.toString().padStart(8, '0')}`, 24, 24, rgba8(255, 255, 0, 255));
  print(`LEVEL: ${level}`, 24, 40, rgba8(100, 255, 100, 255));
  print(`COINS: ${player.coins}`, 24, 56, rgba8(255, 215, 0, 255));
  
  // Health bar
  print('HEALTH:', 200, 24, rgba8(255, 255, 255, 255));
  rect(260, 22, 100, 8, rgba8(100, 0, 0, 255), true);
  rect(260, 22, Math.floor((player.health / 100) * 100), 8, rgba8(255, 0, 0, 255), true);
  
  // Energy bar  
  print('ENERGY:', 200, 40, rgba8(255, 255, 255, 255));
  rect(260, 38, 100, 8, rgba8(0, 0, 100, 255), true);
  rect(260, 38, Math.floor((player.energy / 100) * 100), 8, rgba8(0, 100, 255, 255), true);
  
  // 3D Stats
  const stats = get3DStats();
  if (stats) {
    print(`3D: ${stats.meshes || 0} meshes`, 450, 24, rgba8(150, 150, 150, 255));
    print(`GPU: ${stats.renderer || 'ThreeJS'}`, 450, 40, rgba8(150, 150, 150, 255));
  }
  
  // Position info
  print(`POS: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`, 200, 72, rgba8(150, 150, 150, 255));
  
  // Controls
  print('ARROWS=MOVE  UP=JUMP  Z=ATTACK', 24, 340, rgba8(150, 150, 150, 200));
  
  if (gameState === 'gameOver') {
    rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
    print('GAME OVER', 260, 150, rgba8(255, 50, 50, 255));
    print(`FINAL SCORE: ${score}`, 230, 180, rgba8(255, 255, 0, 255));
    print(`COINS COLLECTED: ${player.coins}`, 220, 200, rgba8(255, 215, 0, 255));
    print('PRESS R TO RESTART', 220, 240, rgba8(255, 255, 255, 255));
    
    if (btnp(17)) { // R key
      // Reset game
      score = 0;
      level = 1;
      player.health = 100;
      player.energy = 100;
      player.coins = 0;
      player.x = 0; player.y = 2; player.z = 0;
      gameState = 'playing';
      clearScene();
      init();
    }
  }
}