// STAR COMBAT 64 - True 3D Space Fighter
// Nintendo 64 / PlayStation style 3D space combat with full GPU acceleration

// Game data with screen management
let gameData = {
  time: 0,
  score: 0,
  level: 1,
  lives: 3,
  playerShip: null,
  playerBullets: [],
  enemies: [],
  enemyBullets: [],
  powerups: [],
  explosions: [],
  stars: [],
  player: {
    x: 0, y: 0, z: -5,
    health: 100,
    shield: 100,
    energy: 100,
    fireCooldown: 0,
    weaponLevel: 1
  },
  inputState: {
    left: false, right: false, up: false, down: false,
    fire: false, charge: false
  }
};

export async function init() {
  console.log('🚀 Star Combat 64 - 3D Space Fighter with Screen Management');
  
  // Setup 3D scene with N64-style aesthetics
  setCameraPosition(0, 2, 0);
  setCameraTarget(0, 0, -10);
  setCameraFOV(75);
  
  // Setup dramatic space lighting
  setLightDirection(-0.5, -1, -0.8);
  setFog(0x000511, 20, 80);
  
  // Enable retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Setup screen management
  addScreen('title', {
    draw: drawTitleScreen,
    update: updateTitleScreen
  });
  
  addScreen('game', {
    draw: drawGameScreen,
    update: updateGameScreen,
    enter: enterGameScreen,
    exit: exitGameScreen
  });
  
  addScreen('gameover', {
    draw: drawGameOverScreen,
    update: updateGameOverScreen
  });
  
  // Start with title screen
  switchToScreen('title');
  
  console.log('✅ Star Combat 64 Screen System Ready!');
}

// === TITLE SCREEN ===
function drawTitleScreen() {
  cls(0x000011);
  
  fill(0xFF6600);
  textSize(36);
  textAlign('center');
  text('STAR COMBAT 64', width()/2, height()/2 - 60);
  
  fill(0x00FFFF);
  textSize(20);
  text('3D Space Fighter', width()/2, height()/2 - 20);
  
  fill(0xFFFF00);
  textSize(18);
  text('Press SPACE to Launch', width()/2, height()/2 + 20);
  
  fill(0xFFFFFF);
  textSize(14);
  text('ARROWS: Move • Z: Fire • X: Charge Shot', width()/2, height()/2 + 60);
}

function updateTitleScreen() {
  if (isKeyPressed(' ')) {
    switchToScreen('game');
  }
}

// === GAME SCREEN ===
async function enterGameScreen() {
  // Reset game state
  gameData.score = 0;
  gameData.level = 1;
  gameData.lives = 3;
  gameData.time = 0;
  
  // Reset player
  gameData.player = {
    x: 0, y: 0, z: -5,
    health: 100,
    shield: 100,
    energy: 100,
    fireCooldown: 0,
    weaponLevel: 1
  };
  
  // Clear arrays
  gameData.playerBullets = [];
  gameData.enemies = [];
  gameData.enemyBullets = [];
  gameData.powerups = [];
  gameData.explosions = [];
  gameData.stars = [];
  
  // Create player ship - sleek fighter
  gameData.playerShip = createPlayerShip();
  
  // Create star field environment
  await createStarField();
  
  // Create space environment
  await createSpaceEnvironment();
  
  // Spawn initial wave
  spawnEnemyWave();
}

function drawGameScreen() {
  // 3D scene is automatically rendered by GPU backend
  // Draw UI overlay using 2D API
  drawUI();
}

function updateGameScreen(dt) {
  gameData.time += dt;
  
  updateInput(dt);
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePowerups(dt);
  updateExplosions(dt);
  updateStarField(dt);
  checkCollisions(dt);
  updateGameLogic(dt);
  
  updateCamera(dt);
  
  // Check game over
  if (gameData.lives <= 0 || gameData.player.health <= 0) {
    switchToScreen('gameover');
  }
}

function exitGameScreen() {
  // Clean up 3D objects
  if (gameData.playerShip) {
    remove3D(gameData.playerShip);
  }
  
  // Clean up all other 3D objects
  [...gameData.playerBullets, ...gameData.enemies, ...gameData.enemyBullets, 
   ...gameData.powerups, ...gameData.explosions, ...gameData.stars].forEach(obj => {
    if (obj.mesh) remove3D(obj.mesh);
  });
}

// === GAME OVER SCREEN ===
function drawGameOverScreen() {
  cls(0x220000);
  
  fill(0xFF0000);
  textSize(32);
  textAlign('center');
  text('MISSION FAILED', width()/2, height()/2 - 60);
  
  fill(0xFFFFFF);
  textSize(20);
  text(`Final Score: ${gameData.score}`, width()/2, height()/2 - 10);
  text(`Level Reached: ${gameData.level}`, width()/2, height()/2 + 20);
  
  fill(0x00FFFF);
  textSize(16);
  text('Press SPACE to try again', width()/2, height()/2 + 80);
  text('Press ESC for title screen', width()/2, height()/2 + 110);
}

function updateGameOverScreen() {
  if (isKeyPressed(' ')) {
    switchToScreen('game');
  } else if (isKeyPressed('Escape')) {
    switchToScreen('title');
  }
}

export function update(dt) {
  // Screen management handles updates
}

export function draw() {
  // Screen management handles drawing
}

function createPlayerShip() {
  // Create main body
  const body = addCube(1.5, 0.6, 2.5, 0x4488ff);
  position3D(body, 0, 0, -5);
  
  // Create wings
  const leftWing = addCube(1.8, 0.3, 1.2, 0x2266dd);
  position3D(leftWing, -1.2, 0, -5);
  
  const rightWing = addCube(1.8, 0.3, 1.2, 0x2266dd);
  position3D(rightWing, 1.2, 0, -5);
  setScale(rightWing, 1.8, 0.3, 1.2);
  
  // Create cockpit
  const cockpit = createSphere(0.4, 0x88ccff, [0, 0.3, -4.5]);
  setScale(cockpit, 0.8, 0.6, 1.0);
  
  return { body, leftWing, rightWing, cockpit };
}

async function createStarField() {
  stars = [];
  
  // Create 3D starfield
  for (let i = 0; i < 200; i++) {
    const star = createSphere(0.05, 0xffffff, [
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 60, 
      -Math.random() * 100 - 10
    ]);
    
    const brightness = Math.random();
    const color = brightness > 0.8 ? 0xffffaa : 
                  brightness > 0.6 ? 0xaaaaff : 0xffffff;
    
    // Vary star sizes and colors
    setScale(star, brightness * 2 + 0.5);
    
    stars.push({
      mesh: star,
      originalZ: getPosition(star)[2],
      speed: 2 + Math.random() * 4,
      twinkle: Math.random() * Math.PI * 2
    });
  }
}

async function createSpaceEnvironment() {
  // Create distant nebula planes
  for (let i = 0; i < 5; i++) {
    const nebula = createPlane(40, 25, 0x220033 + (i * 0x001122), [
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 30,
      -60 - i * 10
    ]);
    setRotation(nebula, Math.random() * 0.5, Math.random() * 0.5, Math.random() * 6.28);
  }
  
  // Create space station or planet in distance
  const planet = createSphere(8, 0x664422, [30, -15, -70]);
  
  // Add some space debris
  for (let i = 0; i < 10; i++) {
    const debris = createCube(0.3, 0x444444, [
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 40,
      -20 - Math.random() * 40
    ]);
    setRotation(debris, Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
  }
}

function updateInput(dt) {
  inputState.left = btn(0);
  inputState.right = btn(1);
  inputState.up = btn(2);
  inputState.down = btn(3);
  inputState.charge = btn(4); // Z
  inputState.fire = btn(5);   // X
}

function updatePlayer(dt) {
  // Update player position
  const speed = 12 * dt;
  
  if (inputState.left && player.x > -12) player.x -= speed;
  if (inputState.right && player.x < 12) player.x += speed;
  if (inputState.up && player.y < 8) player.y += speed;
  if (inputState.down && player.y > -6) player.y += speed;
  
  // Update ship positions
  setPosition(playerShip.body, player.x, player.y, player.z);
  setPosition(playerShip.leftWing, player.x - 1.2, player.y, player.z);
  setPosition(playerShip.rightWing, player.x + 1.2, player.y, player.z);
  setPosition(playerShip.cockpit, player.x, player.y + 0.3, player.z + 0.5);
  
  // Tilt ship based on movement
  const tiltX = inputState.up ? 0.2 : inputState.down ? -0.2 : 0;
  const tiltZ = inputState.left ? 0.3 : inputState.right ? -0.3 : 0;
  
  setRotation(playerShip.body, tiltX, 0, tiltZ);
  setRotation(playerShip.leftWing, tiltX, 0, tiltZ);
  setRotation(playerShip.rightWing, tiltX, 0, tiltZ);
  
  // Handle firing
  player.fireCooldown -= dt;
  
  if (inputState.fire && player.fireCooldown <= 0) {
    fireBullet('normal');
    player.fireCooldown = 0.15;
  }
  
  if (inputState.charge && player.energy >= 20 && player.fireCooldown <= 0) {
    fireBullet('charged');
    player.energy -= 20;
    player.fireCooldown = 0.4;
  }
  
  // Regenerate energy and shield
  if (player.energy < 100) player.energy += 30 * dt;
  if (player.shield < 100) player.shield += 15 * dt;
  
  // Engine glow effect - animate engine exhaust
  rotateMesh(playerShip.body, 0, 0, Math.sin(gameTime * 20) * 0.02);
}

function fireBullet(type) {
  const bullet = {
    type: type,
    damage: type === 'charged' ? 3 : 1,
    speed: 25,
    mesh: null,
    life: 3.0
  };
  
  if (type === 'charged') {
    bullet.mesh = createSphere(0.15, 0x00ffff, [player.x, player.y, player.z + 1]);
    setScale(bullet.mesh, 1.5);
  } else {
    bullet.mesh = createCube(0.1, 0xffff00, [player.x, player.y, player.z + 1]);
    setScale(bullet.mesh, 0.3, 0.3, 1.0);
  }
  
  playerBullets.push(bullet);
}

function spawnEnemyWave() {
  const waveSize = 4 + level * 2;
  const formations = ['line', 'V', 'diamond', 'circle'];
  const formation = formations[level % formations.length];
  
  for (let i = 0; i < waveSize; i++) {
    let x, y, z;
    
    switch (formation) {
      case 'line':
        x = (i - waveSize/2) * 3;
        y = 6;
        z = -25;
        break;
      case 'V':
        x = (i - waveSize/2) * 2;
        y = 6 - Math.abs(i - waveSize/2) * 0.5;
        z = -25;
        break;
      case 'diamond':
        const angle = (i / waveSize) * Math.PI * 2;
        x = Math.cos(angle) * 8;
        y = Math.sin(angle) * 4 + 6;
        z = -25;
        break;
      case 'circle':
        const circleAngle = (i / waveSize) * Math.PI * 2;
        x = Math.cos(circleAngle) * 6;
        y = Math.sin(circleAngle) * 3 + 6;
        z = -25;
        break;
    }
    
    spawnEnemy(x, y, z, formation);
  }
}

function spawnEnemy(x, y, z, type) {
  // Create enemy ship geometry
  const body = createCube(0.6, 0xff4444, [x, y, z]);
  const engine = createSphere(0.3, 0xff8800, [x, y, z - 0.5]);
  
  const enemy = {
    type: type,
    health: 2 + level,
    mesh: { body, engine },
    x: x, y: y, z: z,
    vx: 0, vy: 0, vz: 8,
    fireCooldown: Math.random() * 2,
    behavior: type,
    alive: true
  };
  
  enemies.push(enemy);
}

function updateBullets(dt) {
  // Update player bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    bullet.life -= dt;
    
    const pos = getPosition(bullet.mesh);
    pos[2] -= bullet.speed * dt;
    setPosition(bullet.mesh, pos[0], pos[1], pos[2]);
    
    // Add bullet glow animation
    if (bullet.type === 'charged') {
      const glow = 1.2 + Math.sin(gameTime * 10) * 0.3;
      setScale(bullet.mesh, glow);
    }
    
    if (bullet.life <= 0 || pos[2] < -50) {
      destroyMesh(bullet.mesh);
      playerBullets.splice(i, 1);
    }
  }
  
  // Update enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.life -= dt;
    
    const pos = getPosition(bullet.mesh);
    pos[2] += bullet.speed * dt;
    setPosition(bullet.mesh, pos[0], pos[1], pos[2]);
    
    if (bullet.life <= 0 || pos[2] > 5) {
      destroyMesh(bullet.mesh);
      enemyBullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.alive) continue;
    
    // Update enemy AI and movement
    enemy.fireCooldown -= dt;
    enemy.z += enemy.vz * dt;
    
    // Simple AI behaviors
    switch (enemy.behavior) {
      case 'line':
        enemy.vx = Math.sin(gameTime + i) * 2;
        break;
      case 'V':
        enemy.vx = Math.sin(gameTime * 2 + i) * 3;
        enemy.vy = Math.cos(gameTime + i) * 1;
        break;
      case 'circle':
        enemy.vx = Math.cos(gameTime + i * 2) * 4;
        enemy.vy = Math.sin(gameTime + i * 2) * 2;
        break;
    }
    
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    
    // Update mesh positions
    setPosition(enemy.mesh.body, enemy.x, enemy.y, enemy.z);
    setPosition(enemy.mesh.engine, enemy.x, enemy.y, enemy.z - 0.5);
    
    // Rotate enemy ships
    rotateMesh(enemy.mesh.body, 0, dt * 2, 0);
    rotateMesh(enemy.mesh.engine, 0, dt * 4, 0);
    
    // Enemy firing
    if (enemy.fireCooldown <= 0 && enemy.z > -20 && Math.random() < 0.3 * dt) {
      fireEnemyBullet(enemy.x, enemy.y, enemy.z);
      enemy.fireCooldown = 1.5 + Math.random();
    }
    
    // Remove enemies that passed player
    if (enemy.z > 5) {
      destroyMesh(enemy.mesh.body);
      destroyMesh(enemy.mesh.engine);
      enemies.splice(i, 1);
      lives--; // Lose life when enemy escapes
    }
  }
}

function fireEnemyBullet(x, y, z) {
  const bullet = {
    speed: 25 * 0.7,
    mesh: createCube(0.08, 0xff4444, [x, y, z]),
    life: 2.0
  };
  
  setScale(bullet.mesh, 0.2, 0.2, 0.8);
  enemyBullets.push(bullet);
}

function updatePowerups(dt) {
  // Spawn random powerups
  if (Math.random() < 0.01 * dt && powerups.length < 3) {
    spawnPowerup();
  }
  
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    powerup.z += powerup.speed * dt;
    powerup.rotationY += dt * 3;
    
    setPosition(powerup.mesh, powerup.x, powerup.y, powerup.z);
    setRotation(powerup.mesh, 0, powerup.rotationY, 0);
    
    if (powerup.z > 5) {
      destroyMesh(powerup.mesh);
      powerups.splice(i, 1);
    }
  }
}

function spawnPowerup() {
  const types = ['health', 'shield', 'weapon', 'energy'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const colors = {
    health: 0x00ff00,
    shield: 0x0088ff,
    weapon: 0xffff00,
    energy: 0xff00ff
  };
  
  const powerup = {
    type: type,
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 12,
    z: -30,
    speed: 8 * 0.5,
    rotationY: 0,
    mesh: createCube(0.8, colors[type], [0, 0, 0])
  };
  
  powerups.push(powerup);
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.life -= dt;
    explosion.scale += dt * 3;
    
    setScale(explosion.mesh, explosion.scale);
    
    if (explosion.life <= 0) {
      destroyMesh(explosion.mesh);
      explosions.splice(i, 1);
    }
  }
}

function createExplosion(x, y, z) {
  const explosion = {
    mesh: createSphere(0.5, 0xff6600, [x, y, z]),
    life: 0.5,
    scale: 0.1
  };
  
  explosions.push(explosion);
}

function updateStarField(dt) {
  for (const star of stars) {
    const pos = getPosition(star.mesh);
    pos[2] += star.speed * dt;
    
    // Twinkle effect
    star.twinkle += dt * 5;
    const brightness = 0.5 + Math.sin(star.twinkle) * 0.5;
    setScale(star.mesh, brightness * 2 + 0.5);
    
    if (pos[2] > 10) {
      pos[2] = star.originalZ - 100;
    }
    
    setPosition(star.mesh, pos[0], pos[1], pos[2]);
  }
}

function checkCollisions(dt) {
  // Player bullets vs enemies
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    const bulletPos = getPosition(bullet.mesh);
    
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (!enemy.alive) continue;
      
      const distance = Math.sqrt(
        Math.pow(bulletPos[0] - enemy.x, 2) +
        Math.pow(bulletPos[1] - enemy.y, 2) +
        Math.pow(bulletPos[2] - enemy.z, 2)
      );
      
      if (distance < 1.5) {
        // Hit!
        enemy.health -= bullet.damage;
        destroyMesh(bullet.mesh);
        playerBullets.splice(i, 1);
        
        if (enemy.health <= 0) {
          // Enemy destroyed
          createExplosion(enemy.x, enemy.y, enemy.z);
          destroyMesh(enemy.mesh.body);
          destroyMesh(enemy.mesh.engine);
          enemies.splice(j, 1);
          score += 100;
        }
        break;
      }
    }
  }
  
  // Enemy bullets vs player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    const bulletPos = getPosition(bullet.mesh);
    
    const distance = Math.sqrt(
      Math.pow(bulletPos[0] - player.x, 2) +
      Math.pow(bulletPos[1] - player.y, 2) +
      Math.pow(bulletPos[2] - player.z, 2)
    );
    
    if (distance < 2.0) {
      if (player.shield > 0) {
        player.shield -= 15;
      } else {
        player.health -= 25;
      }
      
      destroyMesh(bullet.mesh);
      enemyBullets.splice(i, 1);
      
      if (player.health <= 0) {
        lives--;
        player.health = 100;
        if (lives <= 0) {
          gameState = 'gameOver';
        }
      }
    }
  }
  
  // Player vs powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    const distance = Math.sqrt(
      Math.pow(powerup.x - player.x, 2) +
      Math.pow(powerup.y - player.y, 2) +
      Math.pow(powerup.z - player.z, 2)
    );
    
    if (distance < 2.0) {
      // Collect powerup
      switch (powerup.type) {
        case 'health':
          player.health = Math.min(100, player.health + 25);
          break;
        case 'shield':
          player.shield = Math.min(100, player.shield + 50);
          break;
        case 'weapon':
          player.weaponLevel = Math.min(3, player.weaponLevel + 1);
          break;
        case 'energy':
          player.energy = 100;
          break;
      }
      
      destroyMesh(powerup.mesh);
      powerups.splice(i, 1);
      score += 50;
    }
  }
}

function updateGameLogic(dt) {
  // Spawn new wave when all enemies are cleared
  if (enemies.length === 0) {
    level++;
    spawnEnemyWave();
  }
  
  // Game over check
  if (lives <= 0) {
    gameState = 'gameOver';
  }
}

function updateCamera(dt) {
  // Dynamic camera movement based on player position
  const targetX = player.x * 0.1;
  const targetY = 2 + player.y * 0.05;
  
  setCameraPosition(targetX, targetY, 0);
  setCameraTarget(player.x * 0.3, player.y * 0.2, -10);
}

function drawUI() {
  // HUD Background
  rect(16, 16, 400, 70, rgba8(0, 0, 0, 150), true);
  rect(16, 16, 400, 70, rgba8(0, 100, 200, 100), false);
  
  // Score and Level
  print(`SCORE: ${score.toString().padStart(8, '0')}`, 24, 24, rgba8(255, 255, 0, 255));
  print(`LEVEL: ${level}`, 24, 40, rgba8(0, 255, 255, 255));
  print(`LIVES: ${lives}`, 24, 56, rgba8(255, 100, 100, 255));
  
  // Health bar
  print('HULL:', 200, 24, rgba8(255, 255, 255, 255));
  rect(240, 22, 100, 8, rgba8(100, 0, 0, 255), true);
  rect(240, 22, Math.floor((player.health / 100) * 100), 8, rgba8(255, 0, 0, 255), true);
  
  // Shield bar  
  print('SHIELD:', 200, 40, rgba8(255, 255, 255, 255));
  rect(260, 38, 100, 8, rgba8(0, 0, 100, 255), true);
  rect(260, 38, Math.floor((player.shield / 100) * 100), 8, rgba8(0, 100, 255, 255), true);
  
  // Energy bar
  print('ENERGY:', 200, 56, rgba8(255, 255, 255, 255));
  rect(260, 54, 100, 8, rgba8(100, 0, 100, 255), true);
  rect(260, 54, Math.floor((player.energy / 100) * 100), 8, rgba8(255, 0, 255, 255), true);
  
  // 3D Stats
  const stats = get3DStats();
  if (stats) {
    print(`3D: ${stats.meshes || 0} meshes`, 450, 24, rgba8(150, 150, 150, 255));
    print(`GPU: ${stats.renderer || 'ThreeJS'}`, 450, 40, rgba8(150, 150, 150, 255));
  }
  
  // Controls
  print('ARROWS=MOVE  X=FIRE  Z=CHARGE', 24, 340, rgba8(150, 150, 150, 200));
  
  if (gameState === 'gameOver') {
    rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
    print('GAME OVER', 260, 150, rgba8(255, 50, 50, 255));
    print(`FINAL SCORE: ${score}`, 230, 180, rgba8(255, 255, 0, 255));
    print(`LEVEL REACHED: ${level}`, 230, 200, rgba8(0, 255, 255, 255));
    print('PRESS R TO RESTART', 220, 240, rgba8(255, 255, 255, 255));
    
    if (btnp(17)) { // R key
      // Reset game
      score = 0;
      level = 1;
      lives = 3;
      player.health = 100;
      player.shield = 100;
      player.energy = 100;
      gameState = 'playing';
      clearScene();
      init();
    }
  }
}