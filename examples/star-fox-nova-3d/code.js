// ⭐ STAR FOX NOVA 64 ⭐
// Epic space combat with proper environment switching support

let gameData = {
  score: 0,
  health: 100,
  wave: 1,
  kills: 0,
  arwing: { x: 0, y: 0, z: 0, mesh: null },
  enemies: [],
  projectiles: [],
  time: 0,
  initialized: false
};

let uiData = {
  time: 0,
  startButtonHover: false,
  mouseX: 0,
  mouseY: 0
};

// Track all created meshes for cleanup
let allMeshes = [];

function trackMesh(mesh) {
  if (mesh && !allMeshes.includes(mesh)) {
    allMeshes.push(mesh);
  }
  return mesh;
}

function cleanupAllMeshes() {
  allMeshes.forEach(mesh => {
    if (mesh && typeof destroyMesh === 'function') {
      destroyMesh(mesh);
    }
  });
  allMeshes = [];
}

export async function init() {
  console.log('🚀 Initializing STAR FOX NOVA 64...');
  
  // Clean up any existing meshes from previous loads
  cleanupAllMeshes();
  
  // Reset all game state
  gameData = {
    score: 0,
    health: 100,
    wave: 1,
    kills: 0,
    arwing: { x: 0, y: 0, z: 0, mesh: null },
    enemies: [],
    projectiles: [],
    time: 0,
    initialized: true
  };
  
  uiData = {
    time: 0,
    startButtonHover: false,
    mouseX: 0,
    mouseY: 0
  };
  
  // Add mouse event listeners for button clicks
  setupMouseHandlers();
  
  // Title Screen with clickable start button
  addScreen('start', {
    enter: function() {
      // Setup safe 3D environment for title
      if (typeof setCameraPosition === 'function') {
        setCameraPosition(0, 2, 8);
        setCameraTarget(0, 0, 0);
        setCameraFOV(75);
      }
    },
    draw: function() {
      drawStartScreen();
    },
    update: function(dt) {
      updateStartScreen(dt);
    }
  });
  
  // Game Screen
  addScreen('game', {
    enter: function() {
      startGame();
      // Create player ship
      gameData.arwing.mesh = createCube(1.5, 0x0099FF, [0, 0, 0]);
      spawnEnemyWave();
    },
    draw: function() {
      cls(0x000022);
      drawHUD();
    },
    update: function(dt) {
      gameData.time += dt;
      updateArwing(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      
      // Check for next wave
      if (gameData.enemies.length === 0) {
        gameData.wave++;
        spawnEnemyWave();
      }
      
      // Check game over
      if (gameData.health <= 0) {
        switchToScreen('gameover');
      }
      
      if (isKeyPressed('Escape')) {
        switchToScreen('gameover');
      }
    }
  });
  
  // Game Over Screen
  addScreen('gameover', {
    enter: function() {
      uiData.time = 0; // Reset for animations
    },
    draw: function() {
      drawGameOverScreen();
    },
    update: function(dt) {
      uiData.time += dt;
      if (isKeyPressed(' ')) {
        switchToScreen('game');
      } else if (isKeyPressed('Escape')) {
        switchToScreen('start');
      }
    }
  });
  
  // Start with start screen
  switchToScreen('start');
  console.log('✅ STAR FOX NOVA 64 Ready - Click START to begin!');
}

// === MOUSE HANDLING ===
function setupMouseHandlers() {
  // Add mouse move handler for button hover detection
  if (typeof document !== 'undefined') {
    const canvas = document.getElementById('screen');
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        uiData.mouseX = ((e.clientX - rect.left) / rect.width) * 640;
        uiData.mouseY = ((e.clientY - rect.top) / rect.height) * 360;
        
        // Check if mouse is over start button (300x200, 160x40 size)
        const buttonX = 300, buttonY = 200, buttonW = 160, buttonH = 40;
        uiData.startButtonHover = (
          uiData.mouseX >= buttonX && uiData.mouseX <= buttonX + buttonW &&
          uiData.mouseY >= buttonY && uiData.mouseY <= buttonY + buttonH
        );
      });
      
      canvas.addEventListener('click', (e) => {
        if (uiData.startButtonHover && getCurrentScreen && getCurrentScreen() === 'start') {
          switchToScreen('game');
        }
      });
    }
  }
}

// === START SCREEN ===
function drawStartScreen() {
  cls(0x000033);
  
  uiData.time += 0.016; // Approximate delta time
  
  // Animated background
  for (let i = 0; i < 8; i++) {
    let alpha = Math.sin(uiData.time * 0.5 + i * 0.8) * 0.1 + 0.1;
    let color = rgba8(10, 20, 50, Math.floor(alpha * 255));
    rect(i * 80, 0, 80, 360, color, true);
  }
  
  // Main title with glow effect
  let titleGlow = Math.sin(uiData.time * 2) * 0.3 + 0.7;
  let titleColor = rgba8(0, Math.floor(titleGlow * 255), 255, 255);
  
  // Title shadow for glow effect
  print('STAR FOX NOVA 64', 262, 122, rgba8(0, 50, 100, 150));
  print('STAR FOX NOVA 64', 258, 118, rgba8(0, 80, 150, 150));
  print('STAR FOX NOVA 64', 260, 120, titleColor);
  
  // Subtitle
  print('Ultimate 3D Space Combat', 245, 150, rgba8(150, 200, 255, 200));
  
  // Clickable START button
  let buttonX = 300, buttonY = 200, buttonW = 160, buttonH = 40;
  let buttonHover = uiData.startButtonHover;
  
  // Button background with hover effect
  let buttonBgColor = buttonHover ? rgba8(80, 80, 0, 200) : rgba8(50, 50, 0, 150);
  let buttonBorderColor = buttonHover ? rgba8(255, 255, 0, 255) : rgba8(200, 200, 0, 200);
  let buttonTextColor = buttonHover ? rgba8(255, 255, 255, 255) : rgba8(200, 200, 0, 255);
  
  // Button with border
  rect(buttonX, buttonY, buttonW, buttonH, buttonBgColor, true);
  rect(buttonX, buttonY, buttonW, buttonH, buttonBorderColor, false);
  
  // Button text
  print('START MISSION', buttonX + 20, buttonY + 15, buttonTextColor);
  
  // Instructions
  print('Click START button above or press SPACE', 220, 270, rgba8(150, 150, 150, 255));
  
  // Controls info
  print('CONTROLS:', 50, 300, rgba8(100, 200, 255, 255));
  print('WASD/Arrows: Move  |  SPACE: Fire  |  ESC: Menu', 50, 320, rgba8(200, 200, 200, 255));
  
  // Mission info
  print('MISSION: Defend against enemy invasion!', 300, 320, rgba8(255, 150, 100, 255));
  
  // Animated corner decorations
  drawCornerDecorations();
}

function updateStartScreen(dt) {
  // Check for keyboard start
  if (isKeyPressed(' ') || isKeyPressed('Enter')) {
    switchToScreen('game');
  }
}

function drawCornerDecorations() {
  let pulse = Math.sin(uiData.time * 3) * 0.3 + 0.7;
  let cornerColor = rgba8(0, Math.floor(pulse * 200), 255, 150);
  
  // Animated corner brackets
  line(20, 20, 60, 20, cornerColor);
  line(20, 20, 20, 60, cornerColor);
  line(580, 20, 620, 20, cornerColor);
  line(620, 20, 620, 60, cornerColor);
  line(20, 300, 60, 300, cornerColor);
  line(20, 300, 20, 340, cornerColor);
  line(580, 300, 620, 300, cornerColor);
  line(620, 300, 620, 340, cornerColor);
}

// === GAME LOGIC ===
function resetGame() {
  // Clean up existing game
  cleanupGame();
  
  // Reset all game data
  gameData.score = 0;
  gameData.health = 100;
  gameData.wave = 1;
  gameData.kills = 0;
  gameData.time = 0;
  gameData.enemies = [];
  gameData.projectiles = [];
  gameData.arwing = { x: 0, y: 0, z: 0, mesh: null };
}

function startGame() {
  // Clean up any existing game objects
  cleanupGame();
  
  // Setup 3D environment for gameplay
  if (typeof setCameraPosition === 'function') {
    setCameraPosition(0, 2, 8);
    setCameraTarget(0, 0, 0);
    setCameraFOV(75);
    setLightDirection(-0.3, -0.8, -0.5);
  }
  
  // Reset game state
  gameData.score = 0;
  gameData.health = 100;
  gameData.wave = 1;
  gameData.kills = 0;
  gameData.time = 0;
  gameData.enemies = [];
  gameData.projectiles = [];
  
  // Create player ship
  if (typeof createCube === 'function') {
    gameData.arwing.mesh = trackMesh(createCube(1.5, 0x0099FF, [0, 0, 0]));
  }
  
  // Spawn first wave
  spawnEnemyWave();
}

function cleanupGame() {
  // Clean up all game meshes
  if (gameData.arwing.mesh) {
    destroyMesh(gameData.arwing.mesh);
    gameData.arwing.mesh = null;
  }
  
  gameData.enemies.forEach(enemy => {
    if (enemy.mesh) destroyMesh(enemy.mesh);
  });
  
  gameData.projectiles.forEach(proj => {
    if (proj.mesh) destroyMesh(proj.mesh);
  });
  
  gameData.enemies = [];
  gameData.projectiles = [];
}
function resetGame() {
  gameData.score = 0;
  gameData.health = 100;
  gameData.wave = 1;
  gameData.kills = 0;
  gameData.arwing = { x: 0, y: 0, z: 0, mesh: null };
  gameData.enemies = [];
  gameData.projectiles = [];
  gameData.time = 0;
}

function updateArwing(dt) {
  let arwing = gameData.arwing;
  
  // Movement controls
  if (isKeyDown('ArrowLeft') || isKeyDown('a')) {
    arwing.x = Math.max(-10, arwing.x - 8 * dt);
  }
  if (isKeyDown('ArrowRight') || isKeyDown('d')) {
    arwing.x = Math.min(10, arwing.x + 8 * dt);
  }
  if (isKeyDown('ArrowUp') || isKeyDown('w')) {
    arwing.y = Math.min(8, arwing.y + 8 * dt);
  }
  if (isKeyDown('ArrowDown') || isKeyDown('s')) {
    arwing.y = Math.max(-5, arwing.y - 8 * dt);
  }
  
  // Shooting
  if (isKeyPressed(' ')) {
    firePlayerLaser();
  }
  
  // Update mesh position
  if (arwing.mesh) {
    setPosition(arwing.mesh, arwing.x, arwing.y, arwing.z);
  }
}

function firePlayerLaser() {
  if (typeof createSphere === 'function') {
    let laser = trackMesh(createSphere(0.1, 0x00FF00, [gameData.arwing.x, gameData.arwing.y, gameData.arwing.z + 1]));
    
    gameData.projectiles.push({
      mesh: laser,
      x: gameData.arwing.x,
      y: gameData.arwing.y,
      z: gameData.arwing.z + 1,
      speed: 25,
      friendly: true
    });
  }
}

function spawnEnemyWave() {
  let count = 3 + Math.floor(gameData.wave / 2);
  
  for (let i = 0; i < count; i++) {
    if (typeof createCube === 'function') {
      let x = (Math.random() - 0.5) * 16;
      let y = (Math.random() - 0.5) * 10;
      let z = -30 - Math.random() * 10;
      
      let enemy = trackMesh(createCube(1, 0xFF3030, [x, y, z]));
      
      gameData.enemies.push({
        mesh: enemy,
        x: x,
        y: y,
        z: z,
        speed: 1 + Math.random(),
        health: 1
      });
    }
  }
}

function updateEnemies(dt) {
  for (let i = gameData.enemies.length - 1; i >= 0; i--) {
    let enemy = gameData.enemies[i];
    
    // Move toward player
    enemy.z += enemy.speed * 8 * dt;
    
    // Simple AI
    if (enemy.x < gameData.arwing.x) enemy.x += 2 * dt;
    if (enemy.x > gameData.arwing.x) enemy.x -= 2 * dt;
    if (enemy.y < gameData.arwing.y) enemy.y += 2 * dt;
    if (enemy.y > gameData.arwing.y) enemy.y -= 2 * dt;
    
    setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
    
    // Remove if too close
    if (enemy.z > 10) {
      destroyMesh(enemy.mesh);
      gameData.enemies.splice(i, 1);
      gameData.health -= 10;
    }
  }
}

function updateProjectiles(dt) {
  for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
    let proj = gameData.projectiles[i];
    
    if (proj.friendly) {
      proj.z -= proj.speed * dt;
    } else {
      proj.z += proj.speed * dt;
    }
    
    setPosition(proj.mesh, proj.x, proj.y, proj.z);
    
    // Check collisions with enemies
    if (proj.friendly) {
      for (let j = gameData.enemies.length - 1; j >= 0; j--) {
        let enemy = gameData.enemies[j];
        if (distance3D(proj, enemy) < 1.5) {
          // Hit!
          destroyMesh(proj.mesh);
          destroyMesh(enemy.mesh);
          gameData.projectiles.splice(i, 1);
          gameData.enemies.splice(j, 1);
          gameData.score += 100;
          gameData.kills++;
          break;
        }
      }
    }
    
    // Remove if out of bounds
    if (proj.z < -50 || proj.z > 20) {
      destroyMesh(proj.mesh);
      gameData.projectiles.splice(i, 1);
    }
  }
}

function distance3D(obj1, obj2) {
  let dx = obj1.x - obj2.x;
  let dy = obj1.y - obj2.y;
  let dz = obj1.z - obj2.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function drawHUD() {
  // Enhanced HUD with better styling
  
  // Health bar with frame
  rect(18, 18, 154, 24, rgba8(100, 100, 100, 200), true);
  rect(20, 20, 150, 20, rgba8(80, 0, 0, 255), true);
  
  let healthWidth = (gameData.health / 100) * 150;
  let healthColor = gameData.health > 50 ? rgba8(0, 255, 0, 255) : 
                   gameData.health > 25 ? rgba8(255, 255, 0, 255) : rgba8(255, 0, 0, 255);
  rect(20, 20, healthWidth, 20, healthColor, true);
  
  // Health bar outline
  rect(18, 18, 154, 24, rgba8(0, 255, 255, 150), false);
  
  // Game stats with better formatting
  print('SHIELDS', 22, 12, rgba8(0, 255, 255, 255));
  
  // Score display
  rect(18, 50, 120, 60, rgba8(0, 0, 50, 180), true);
  rect(18, 50, 120, 60, rgba8(0, 255, 255, 100), false);
  
  print('SCORE', 22, 55, rgba8(0, 255, 255, 255));
  print(gameData.score.toString(), 22, 70, rgba8(255, 255, 0, 255));
  
  print('WAVE', 22, 85, rgba8(0, 255, 255, 255));
  print(gameData.wave.toString(), 22, 100, rgba8(255, 255, 255, 255));
  
  // Enhanced crosshair with animation
  let crosshairPulse = Math.sin(gameData.time * 8) * 0.3 + 0.7;
  let crosshairAlpha = Math.floor(crosshairPulse * 255);
  let crosshairColor = rgba8(0, 255, 255, crosshairAlpha);
  
  // Crosshair
  line(310, 180, 330, 180, crosshairColor);
  line(320, 170, 320, 190, crosshairColor);
  
  // Crosshair center dot
  rect(318, 178, 4, 4, rgba8(255, 0, 0, crosshairAlpha), true);
  
  // Targeting brackets (animated)
  let bracketOffset = Math.sin(gameData.time * 6) * 2;
  let bracketColor = rgba8(255, 255, 0, Math.floor(crosshairPulse * 200));
  
  // Top-left bracket
  line(305 - bracketOffset, 165 - bracketOffset, 315 - bracketOffset, 165 - bracketOffset, bracketColor);
  line(305 - bracketOffset, 165 - bracketOffset, 305 - bracketOffset, 175 - bracketOffset, bracketColor);
  
  // Top-right bracket
  line(325 + bracketOffset, 165 - bracketOffset, 335 + bracketOffset, 165 - bracketOffset, bracketColor);
  line(335 + bracketOffset, 165 - bracketOffset, 335 + bracketOffset, 175 - bracketOffset, bracketColor);
  
  // Bottom-left bracket
  line(305 - bracketOffset, 185 + bracketOffset, 315 - bracketOffset, 185 + bracketOffset, bracketColor);
  line(305 - bracketOffset, 185 + bracketOffset, 305 - bracketOffset, 195 + bracketOffset, bracketColor);
  
  // Bottom-right bracket
  line(325 + bracketOffset, 185 + bracketOffset, 335 + bracketOffset, 185 + bracketOffset, bracketColor);
  line(335 + bracketOffset, 185 + bracketOffset, 335 + bracketOffset, 195 + bracketOffset, bracketColor);
  
  // Radar display
  drawMiniRadar();
  
  // Status messages
  if (gameData.enemies.length === 0 && gameData.wave > 1) {
    print('WAVE COMPLETE!', 280, 250, rgba8(0, 255, 0, 255));
    print('Next wave incoming...', 270, 270, rgba8(255, 255, 0, 200));
  }
  
  if (gameData.health <= 25) {
    let warningPulse = Math.sin(gameData.time * 12) > 0 ? 255 : 100;
    print('SHIELDS CRITICAL!', 250, 60, rgba8(255, 0, 0, warningPulse));
  }
  
  // Instructions (smaller and less intrusive)
  print('WASD: Move | SPACE: Fire | ESC: Menu', 200, 345, rgba8(150, 150, 150, 150));
}

function drawMiniRadar() {
  let radarX = 550;
  let radarY = 70;
  let radarSize = 60;
  
  // Radar background
  rect(radarX - radarSize/2, radarY - radarSize/2, radarSize, radarSize, rgba8(0, 20, 0, 200), true);
  
  // Radar circle
  for (let i = 0; i < 32; i++) {
    let angle = (i / 32) * Math.PI * 2;
    let x1 = radarX + Math.cos(angle) * (radarSize/2 - 2);
    let y1 = radarY + Math.sin(angle) * (radarSize/2 - 2);
    let x2 = radarX + Math.cos(angle) * (radarSize/2);
    let y2 = radarY + Math.sin(angle) * (radarSize/2);
    
    if (i % 8 === 0) {
      line(x1, y1, x2, y2, rgba8(0, 255, 0, 255));
    } else {
      line(x1, y1, x2, y2, rgba8(0, 255, 0, 100));
    }
  }
  
  // Center dot (player)
  rect(radarX - 1, radarY - 1, 3, 3, rgba8(0, 255, 255, 255), true);
  
  // Enemy dots
  gameData.enemies.forEach(enemy => {
    let relX = enemy.x / 20 * (radarSize/2);
    let relZ = enemy.z / 50 * (radarSize/2);
    let dotX = radarX + relX;
    let dotY = radarY + relZ;
    
    if (Math.abs(relX) < radarSize/2 && Math.abs(relZ) < radarSize/2) {
      rect(dotX - 1, dotY - 1, 2, 2, rgba8(255, 0, 0, 255), true);
    }
  });
  
  // Sweep line
  let sweepAngle = gameData.time * 2;
  let sweepX = radarX + Math.cos(sweepAngle) * (radarSize/2 - 5);
  let sweepY = radarY + Math.sin(sweepAngle) * (radarSize/2 - 5);
  line(radarX, radarY, sweepX, sweepY, rgba8(0, 255, 0, 150));
  
  print('RADAR', radarX - 15, radarY - radarSize/2 - 15, rgba8(0, 255, 0, 200));
}

function drawGameOverScreen() {
  // Dramatic red background with fade effect
  cls(0x220000);
  
  // Animated warning stripes
  let stripePhase = uiData.time * 2;
  for (let i = 0; i < 10; i++) {
    let alpha = (Math.sin(stripePhase + i * 0.5) + 1) * 0.1 + 0.05;
    let color = rgba8(100, 0, 0, Math.floor(alpha * 255));
    rect(i * 64, 0, 64, 360, color, true);
  }
  
  // Dramatic title with glitch effect
  let glitchOffset = Math.sin(uiData.time * 20) * 2;
  let titleFlash = Math.sin(uiData.time * 8) > 0.5 ? 255 : 180;
  
  // Glitch shadow
  print('MISSION FAILED', 280 + glitchOffset, 100, rgba8(255, 0, 0, 100));
  
  // Main title
  print('MISSION FAILED', 280, 100, rgba8(255, 0, 48, titleFlash));
  
  // Damage report
  print('DAMAGE REPORT:', 200, 140, rgba8(255, 100, 100, 255));
  
  // Stats with better formatting
  let statsColor = rgba8(255, 255, 255, 255);
  let numberColor = rgba8(255, 255, 0, 255);
  
  print('Final Score:', 250, 170, statsColor);
  print(gameData.score.toString(), 380, 170, numberColor);
  
  print('Wave Reached:', 250, 190, statsColor);
  print(gameData.wave.toString(), 380, 190, numberColor);
  
  print('Enemies Destroyed:', 250, 210, statsColor);
  print(gameData.kills.toString(), 380, 210, numberColor);
  
  print('Accuracy:', 250, 230, statsColor);
  let accuracy = gameData.kills > 0 ? Math.floor((gameData.kills / (gameData.kills + Math.max(1, gameData.wave * 3))) * 100) : 0;
  print(accuracy + '%', 380, 230, numberColor);
  
  // Performance rating
  let rating = 'ROOKIE';
  let ratingColor = rgba8(100, 100, 100, 255);
  
  if (gameData.score > 2000) {
    rating = 'ACE PILOT';
    ratingColor = rgba8(255, 215, 0, 255); // Gold
  } else if (gameData.score > 1000) {
    rating = 'VETERAN';
    ratingColor = rgba8(192, 192, 192, 255); // Silver
  } else if (gameData.score > 500) {
    rating = 'PILOT';
    ratingColor = rgba8(205, 127, 50, 255); // Bronze
  }
  
  print('PILOT RATING:', 250, 250, statsColor);
  print(rating, 360, 250, ratingColor);
  
  // Animated buttons
  let buttonPulse = Math.sin(uiData.time * 4) * 0.3 + 0.7;
  let buttonAlpha = Math.floor(buttonPulse * 255);
  
  // Retry button
  rect(200, 285, 120, 25, rgba8(0, 50, 0, 150), true);
  rect(200, 285, 120, 25, rgba8(0, 255, 0, buttonAlpha), false);
  print('SPACE - RETRY', 210, 292, rgba8(0, 255, 0, buttonAlpha));
  
  // Menu button
  rect(340, 285, 120, 25, rgba8(50, 50, 0, 150), true);
  rect(340, 285, 120, 25, rgba8(255, 255, 0, buttonAlpha), false);
  print('ESC - MAIN MENU', 350, 292, rgba8(255, 255, 0, buttonAlpha));
  
  // Motivational message
  let messages = [
    'Better luck next time, pilot!',
    'The galaxy needs you!',
    'Never give up!',
    'Learn from your mistakes!',
    'Trust your instincts!'
  ];
  let messageIndex = Math.floor(uiData.time) % messages.length;
  print(messages[messageIndex], 220, 330, rgba8(150, 150, 255, 200));
}

export function update(dt) {
  // Screen management handles updates automatically
}

export function draw() {
  // Screen management handles drawing automatically
}

// Clean up function called when switching away from this environment
export function cleanup() {
  console.log('🧹 Cleaning up STAR FOX NOVA 64...');
  cleanupAllMeshes();
  
  // Reset game state
  gameData.initialized = false;
  gameData.enemies = [];
  gameData.projectiles = [];
  gameData.arwing.mesh = null;
}
