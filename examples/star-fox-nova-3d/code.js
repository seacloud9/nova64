// ⭐ STAR FOX NOVA 64 - DESERTED SPACE QUALITY ⭐
// Smooth physics-based movement with motion effects

let game = {
  // Player with velocity-based movement
  player: { 
    x: 0, y: 0, z: 0, 
    vx: 0, vy: 0, // Velocity for smooth gliding
    mesh: null 
  },
  
  // Game objects
  enemies: [],
  bullets: [],
  particles: [],
  debris: [], // Moving space debris for motion sense!
  gridLines: [], // Moving floor grid like Deserted Space!
  
  // Game state
  score: 0,
  health: 100,
  maxHealth: 100,
  wave: 1,
  kills: 0,
  time: 0,
  gameOver: false,
  
  // Spawn timers
  enemySpawnTimer: 0,
  enemySpawnRate: 3.5,
  
  // Camera
  cameraShake: 0,
  
  // Motion effects
  baseSpeed: 40 // Background motion speed
};

export async function init() {
  console.log('🚀 STAR FOX NOVA 64 - Loading...');
  
  // Setup 3D camera like Deserted Space - behind and above ship
  setCameraPosition(0, 6, 25);
  setCameraTarget(0, 0, -20); // Look ahead into the distance
  setCameraFOV(75);
  
  // Create beautiful space skybox like Deserted Space
  createSpaceSkybox({
    starCount: 2000,
    starSize: 2.5,
    nebulae: true,
    nebulaColor: 0x1a0033
  });
  
  // Add dramatic lighting
  setLightDirection(-0.3, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404060);
  
  // Space fog for depth
  setFog(0x000511, 50, 300);
  
  // Enable N64 retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Create player ship
  createPlayerShip();
  
  // Create moving debris for sense of MOTION!
  createDebrisField();
  
  // Create moving floor grid like Deserted Space!
  createFloorGrid();
  
  console.log('✅ Star Fox Nova 64 Ready!');
  console.log('🎮 Press WASD to move, SPACE to fire');
  console.log('🎮 Controls: Arrow Keys or WASD = Move, SPACE = Fire!');
}

function createDebrisField() {
  // Create 100 moving space debris objects for motion sense
  for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 100;
    const z = -Math.random() * 300;
    
    const size = 0.3 + Math.random() * 0.8;
    const debris = createCube(size, 0x444466, [x, y, z]);
    
    game.debris.push({
      mesh: debris,
      x, y, z,
      speed: 30 + Math.random() * 40,
      spinX: Math.random() * 2,
      spinY: Math.random() * 2,
      rot: 0
    });
  }
  console.log('🌌 Created debris field for motion sense');
}

function createFloorGrid() {
  // Create moving floor grid lines like Deserted Space!
  const gridSize = 20;
  const gridSpacing = 20;
  const gridColor = 0x0066ff;
  
  // Create grid lines along X axis
  for (let i = -gridSize; i <= gridSize; i++) {
    const x = i * gridSpacing;
    for (let j = 0; j < 20; j++) {
      const z = -j * gridSpacing;
      const line = createCube(0.2, gridColor, [x, -15, z]);
      setScale(line, 0.3, 0.3, gridSpacing);
      
      game.gridLines.push({
        mesh: line,
        x: x,
        y: -15,
        z: z,
        type: 'x'
      });
    }
  }
  
  // Create grid lines along Z axis
  for (let j = 0; j < 20; j++) {
    const z = -j * gridSpacing;
    for (let i = -gridSize; i <= gridSize; i++) {
      const x = i * gridSpacing;
      const line = createCube(0.2, gridColor, [x, -15, z]);
      setScale(line, gridSpacing, 0.3, 0.3);
      
      game.gridLines.push({
        mesh: line,
        x: x,
        y: -15,
        z: z,
        type: 'z'
      });
    }
  }
  
  console.log('🌐 Created floor grid with', game.gridLines.length, 'lines');
}

function createPlayerShip() {
  // Create awesome Arwing-style ship with WINGS!
  const ship = createCube(2, 0x00aaff, [0, 0, 0]);
  setScale(ship, 2, 1, 5); // Long and sleek
  game.player.mesh = ship;
  
  // Add wings (visual only, stored for reference)
  const leftWing = createCube(1, 0x0088cc, [-3, 0, 0]);
  setScale(leftWing, 4, 0.3, 2);
  
  const rightWing = createCube(1, 0x0088cc, [3, 0, 0]);
  setScale(rightWing, 4, 0.3, 2);
  
  game.player.x = 0;
  game.player.y = 0;
  game.player.z = 0;
  game.player.wings = [leftWing, rightWing];
}

export function update(dt) {
  game.time += dt;
  
  // Update player
  updatePlayer(dt);
  
  // Update debris for MOTION sense
  updateDebris(dt);
  
  // Update floor grid for MOTION
  updateFloorGrid(dt);
  
  // Update enemies
  updateEnemies(dt);
  
  // Update bullets
  updateBullets(dt);
  
  // Update particles
  updateParticles(dt);
  
  // Spawn enemies
  spawnEnemies(dt);
  
  // Check collisions
  checkCollisions();
  
  // Update camera shake
  if (game.cameraShake > 0) {
    game.cameraShake *= 0.9;
    const shakeX = (Math.random() - 0.5) * game.cameraShake;
    const shakeY = (Math.random() - 0.5) * game.cameraShake;
    setCameraPosition(shakeX, 6 + shakeY, 25);
  }
  
  // Animate skybox
  animateSkybox(dt * 0.5);
  
  // Game over check (only log once)
  if (game.health <= 0 && !game.gameOver) {
    game.gameOver = true;
    game.health = 0;
    console.log('💀 GAME OVER! Final Score:', game.score);
  }
}

function updateDebris(dt) {
  // Move debris toward camera for MOTION sense
  for (let i = 0; i < game.debris.length; i++) {
    const d = game.debris[i];
    
    // Move toward camera with base speed
    d.z += (game.baseSpeed + game.player.vx * 0.5) * dt;
    d.rot += dt * 2;
    
    // Recycle when passed camera
    if (d.z > 30) {
      d.z = -300 - Math.random() * 50;
      d.x = (Math.random() - 0.5) * 200;
      d.y = (Math.random() - 0.5) * 100;
    }
    
    setPosition(d.mesh, d.x, d.y, d.z);
    setRotation(d.mesh, d.rot * d.spinX, d.rot * d.spinY, 0);
  }
}

function updateFloorGrid(dt) {
  // Move floor grid toward camera like Deserted Space!
  const gridSpeed = game.baseSpeed;
  const gridSpacing = 20;
  
  for (let i = 0; i < game.gridLines.length; i++) {
    const line = game.gridLines[i];
    
    // Move toward camera
    line.z += gridSpeed * dt;
    
    // Recycle when passed camera
    if (line.z > 20) {
      line.z -= gridSpacing * 20;
    }
    
    setPosition(line.mesh, line.x, line.y, line.z);
  }
}

function updatePlayer(dt) {
  // Smooth physics-based movement like Deserted Space
  const acceleration = 80;
  const maxSpeed = 35;
  const friction = 0.88; // Gliding friction
  
  // Apply acceleration from input
  if (isKeyDown('a') || isKeyDown('arrowleft')) {
    game.player.vx -= acceleration * dt;
  }
  if (isKeyDown('d') || isKeyDown('arrowright')) {
    game.player.vx += acceleration * dt;
  }
  if (isKeyDown('w') || isKeyDown('arrowup')) {
    game.player.vy += acceleration * dt;
  }
  if (isKeyDown('s') || isKeyDown('arrowdown')) {
    game.player.vy -= acceleration * dt;
  }
  
  // Apply friction for smooth gliding
  game.player.vx *= friction;
  game.player.vy *= friction;
  
  // Clamp velocity
  const speed = Math.sqrt(game.player.vx * game.player.vx + game.player.vy * game.player.vy);
  if (speed > maxSpeed) {
    game.player.vx = (game.player.vx / speed) * maxSpeed;
    game.player.vy = (game.player.vy / speed) * maxSpeed;
  }
  
  // Update position
  game.player.x += game.player.vx * dt;
  game.player.y += game.player.vy * dt;
  
  // Soft boundaries with bounce
  if (game.player.x < -35) {
    game.player.x = -35;
    game.player.vx *= -0.3;
  }
  if (game.player.x > 35) {
    game.player.x = 35;
    game.player.vx *= -0.3;
  }
  if (game.player.y < -18) {
    game.player.y = -18;
    game.player.vy *= -0.3;
  }
  if (game.player.y > 18) {
    game.player.y = 18;
    game.player.vy *= -0.3;
  }
  
  // Update mesh with smooth tilting based on velocity
  if (game.player.mesh) {
    setPosition(game.player.mesh, game.player.x, game.player.y, game.player.z);
    
    // Dynamic tilt based on velocity (looks way cooler!)
    const tiltX = -game.player.vy * 0.02; // Pitch with vertical movement
    const tiltZ = -game.player.vx * 0.03; // Roll with horizontal movement
    const tiltY = game.player.vx * 0.01;  // Slight yaw
    setRotation(game.player.mesh, tiltX, tiltY, tiltZ);
    
    // Update wings to follow ship
    if (game.player.wings) {
      game.player.wings.forEach((wing, i) => {
        const offset = i === 0 ? -3 : 3;
        setPosition(wing, game.player.x + offset, game.player.y, game.player.z);
        setRotation(wing, tiltX, tiltY, tiltZ);
      });
    }
  }
  
  // Shooting - Try multiple key codes for space bar!
  if (isKeyDown('space') || isKeyDown(' ') || isKeyDown('Space')) {
    if (!game.lastShot || game.time - game.lastShot > 0.15) {
      fireBullet();
      game.lastShot = game.time;
      console.log('🔫 PEW PEW! Firing lasers!');
    }
  }
}

function fireBullet() {
  // Dual lasers with glow
  for (const offset of [-2, 2]) {
    const bullet = createCube(0.8, 0x00ff00, [ // Bright green lasers
      game.player.x + offset,
      game.player.y,
      game.player.z - 3
    ]);
    setScale(bullet, 0.3, 0.3, 2.5);
    
    game.bullets.push({
      mesh: bullet,
      x: game.player.x + offset,
      y: game.player.y,
      z: game.player.z - 3,
      speed: 150
    });
  }
}

function spawnEnemies(dt) {
  // Don't spawn if game over
  if (game.gameOver) return;
  
  game.enemySpawnTimer += dt;
  
  // Progressive difficulty
  const spawnRate = Math.max(1.2, game.enemySpawnRate / (1 + game.wave * 0.15));
  
  if (game.enemySpawnTimer >= spawnRate) {
    game.enemySpawnTimer = 0;
    
    // Spawn further away so player can react
    const x = (Math.random() - 0.5) * 50;
    const y = (Math.random() - 0.5) * 25;
    const z = -150 - Math.random() * 50; // Much further away!
    
    // BIG BRIGHT VISIBLE ENEMIES!
    const enemy = createCube(3, 0xff0000, [x, y, z]); // Bright red, bigger
    setScale(enemy, 4, 4, 4); // MUCH BIGGER!
    
    game.enemies.push({
      mesh: enemy,
      x, y, z,
      speed: 35 + game.wave * 3, // Speed toward player
      spin: Math.random() * 2
    });
  }
}

function updateEnemies(dt) {
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    
    // Move toward player (coming from behind camera)
    enemy.z += enemy.speed * dt;
    enemy.spin += dt * enemy.spin;
    
    // Update mesh
    setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
    setRotation(enemy.mesh, 0, enemy.spin, 0);
    
    // Remove if passed player
    if (enemy.z > 30) {
      if (!game.gameOver) {
        game.health -= 15;
        game.cameraShake = 1.0;
        console.log('💥 Enemy got through! Health:', game.health);
      }
      destroyMesh(enemy.mesh);
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    
    // Travel away from camera (toward enemies)
    bullet.z -= bullet.speed * dt;
    setPosition(bullet.mesh, bullet.x, bullet.y, bullet.z);
    
    // Remove if too far
    if (bullet.z < -200) {
      destroyMesh(bullet.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function checkCollisions() {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const enemy = game.enemies[j];
      
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dz = bullet.z - enemy.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < 4) {
        // HIT!
        createExplosion(enemy.x, enemy.y, enemy.z);
        
        // Remove bullet
        destroyMesh(bullet.mesh);
        game.bullets.splice(i, 1);
        
        // Remove enemy
        destroyMesh(enemy.mesh);
        game.enemies.splice(j, 1);
        
        // Update score
        game.score += 100;
        game.kills++;
        game.cameraShake = 0.3;
        
        // Wave progression
        if (game.kills >= game.wave * 10) {
          game.wave++;
          console.log(`🌊 Wave ${game.wave}!`);
        }
        
        break;
      }
    }
  }
}

function createExplosion(x, y, z) {
  const colors = [0xff6600, 0xff3300, 0xffaa00];
  
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 15 + Math.random() * 15;
    
    const particle = createCube(0.8, colors[i % 3], [x, y, z]);
    
    game.particles.push({
      mesh: particle,
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 20,
      life: 0.8,
      maxLife: 0.8
    });
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    
    const scale = p.life / p.maxLife;
    setPosition(p.mesh, p.x, p.y, p.z);
    setScale(p.mesh, scale, scale, scale);
    
    if (p.life <= 0) {
      destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function drawSpeedLines() {
  // Draw motion speed lines like Deserted Space!
  const numLines = 30;
  const speed = Math.abs(game.player.vx) + Math.abs(game.player.vy) + game.baseSpeed;
  const lineAlpha = Math.min(200, speed * 3);
  
  for (let i = 0; i < numLines; i++) {
    const x = Math.random() * 640;
    const y = Math.random() * 360;
    const length = 20 + speed * 0.5;
    
    const angle = Math.atan2(
      180 - y + game.player.vy * 10,
      320 - x + game.player.vx * 10
    );
    
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    
    line(x, y, x2, y2, rgba8(100, 150, 255, lineAlpha));
  }
}

export function draw() {
  // Draw SPEED LINES for motion sense!
  drawSpeedLines();
  
  // Draw 2D HUD overlay
  
  // Health bar panel (BIGGER AND MORE VISIBLE)
  rect(10, 10, 300, 95, rgba8(0, 0, 0, 200), true);
  rect(10, 10, 300, 95, rgba8(0, 255, 255, 200), false);
  
  // Health bar - BIGGER!
  print('SHIELD', 20, 22, rgba8(0, 255, 255, 255), 1);
  const healthPct = game.health / game.maxHealth;
  const healthWidth = Math.floor(healthPct * 220);
  const healthColor = healthPct > 0.5 ? rgba8(0, 255, 0, 255) :
                      healthPct > 0.25 ? rgba8(255, 255, 0, 255) :
                      rgba8(255, 0, 0, 255);
  
  rect(20, 40, 220, 18, rgba8(40, 40, 40, 255), true);
  if (healthWidth > 0) {
    rect(20, 40, healthWidth, 18, healthColor, true);
  }
  rect(20, 40, 220, 18, rgba8(255, 255, 255, 200), false);
  
  // Score - BIGGER!
  const scoreStr = game.score.toString().padStart(6, '0');
  print('SCORE: ' + scoreStr, 20, 65, rgba8(255, 255, 0, 255), 1);
  
  // Wave - BIGGER!
  print('WAVE: ' + game.wave, 20, 80, rgba8(255, 180, 0, 255), 1);
  
  // BIGGER BRIGHTER CROSSHAIR
  const cx = 320, cy = 180;
  line(cx - 20, cy, cx + 20, cy, rgba8(0, 255, 0, 255));
  line(cx, cy - 20, cx, cy + 20, rgba8(0, 255, 0, 255));
  circle(cx, cy, 25, rgba8(0, 255, 0, 200), false);
  circle(cx, cy, 5, rgba8(255, 255, 0, 255), true); // Center dot
  
  // BIGGER RADAR
  const rx = 520, ry = 10, rs = 100;
  rect(rx, ry, rs, rs, rgba8(0, 0, 0, 200), true);
  rect(rx, ry, rs, rs, rgba8(0, 255, 0, 200), false);
  
  // Radar grid
  line(rx + rs/2, ry, rx + rs/2, ry + rs, rgba8(0, 120, 0, 150));
  line(rx, ry + rs/2, rx + rs, ry + rs/2, rgba8(0, 120, 0, 150));
  
  // Player dot - BIGGER
  rect(rx + rs/2 - 2, ry + rs/2 - 2, 5, 5, rgba8(0, 255, 255, 255), true);
  
  // Enemy dots
  game.enemies.forEach(e => {
    const relX = (e.x / 80) * (rs / 2);
    const relZ = (e.z / 150) * (rs / 2);
    const dx = Math.floor(rx + rs/2 + relX);
    const dy = Math.floor(ry + rs/2 - relZ);
    
    if (dx >= rx && dx <= rx + rs && dy >= ry && dy <= ry + rs) {
      rect(dx - 2, dy - 2, 5, 5, rgba8(255, 0, 0, 255), true);
      // Pulse effect
      const pulse = Math.sin(game.time * 5) * 0.5 + 0.5;
      circle(dx, dy, 8, rgba8(255, 0, 0, Math.floor(pulse * 150)), false);
    }
  });
  
  print('RADAR', rx + 25, ry + rs + 5, rgba8(0, 255, 0, 255), 1);
  
  // Game over overlay
  if (game.health <= 0) {
    rect(0, 0, 640, 360, rgba8(0, 0, 0, 180), true);
    
    const flash = Math.floor(game.time * 3) % 2 === 0;
    const color = flash ? rgba8(255, 50, 50, 255) : rgba8(200, 0, 0, 255);
    
    print('GAME OVER', 250, 140, color);
    print('Final Score: ' + game.score, 240, 180, rgba8(255, 255, 0, 255));
    print('Wave Reached: ' + game.wave, 235, 200, rgba8(0, 255, 255, 255));
    print('Press R to Restart', 230, 240, rgba8(200, 200, 200, 255));
    
    if (isKeyPressed('r')) {
      // Reset game
      game.enemies.forEach(e => destroyMesh(e.mesh));
      game.bullets.forEach(b => destroyMesh(b.mesh));
      game.particles.forEach(p => destroyMesh(p.mesh));
      
      game.enemies = [];
      game.bullets = [];
      game.particles = [];
      game.score = 0;
      game.health = 100;
      game.wave = 1;
      game.kills = 0;
      game.enemySpawnTimer = 0;
      game.gameOver = false;
      game.player.vx = 0;
      game.player.vy = 0;
      game.player.x = 0;
      game.player.y = 0;
      
      console.log('🔄 Game restarted!');
    }
  }
}
