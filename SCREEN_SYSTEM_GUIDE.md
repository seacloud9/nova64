# Nova64 Screen Management System

## Overview
The Nova64 Screen Management System provides a clean, powerful way to create games with multiple screens (menus, gameplay, cutscenes, settings, etc.). It eliminates the need for manual state management and provides automatic cleanup and data passing between screens.

## Quick Start

### 1. Basic Setup
```javascript
export async function init() {
  await init3D({
    antialias: true,
    backgroundColor: 0x001122  
  });
  
  // Register screens
  addScreen('menu', MenuScreen);
  addScreen('game', GameScreen);
  addScreen('gameOver', GameOverScreen);
  
  // Start with menu
  startScreens('menu');
}

export function update(dt) {
  // Screen manager handles updates automatically
}

export function draw() {
  cls();
  // Screen manager handles drawing automatically  
}
```

### 2. Object-Based Screens (Simple)
```javascript
addScreen('menu', {
  enter() {
    console.log('Menu entered');
    this.selectedOption = 0;
    this.options = ['Play', 'Settings', 'Quit'];
  },
  
  update(dt) {
    if (isKeyPressed('w') && this.selectedOption > 0) {
      this.selectedOption--;
    }
    if (isKeyPressed('s') && this.selectedOption < this.options.length - 1) {
      this.selectedOption++;
    }
    
    if (isKeyPressed(' ')) {
      switch (this.selectedOption) {
        case 0: switchToScreen('game'); break;
        case 1: switchToScreen('settings'); break;
        case 2: console.log('Quit'); break;
      }
    }
  },
  
  draw() {
    const centerX = 160;
    print('MAIN MENU', centerX - 30, 50, rgba8(255, 255, 0));
    
    this.options.forEach((option, i) => {
      const y = 100 + i * 25;
      const color = i === this.selectedOption ? 
        rgba8(255, 255, 0) : rgba8(200, 200, 200);
      
      print(option, centerX - 20, y, color);
    });
  },
  
  exit() {
    console.log('Menu exited');
  }
});
```

### 3. Class-Based Screens (Advanced)
```javascript
class GameScreen extends Screen {
  enter(data) {
    super.enter(data);
    this.level = data.level || 1;
    this.score = 0;
    this.createPlayer();
    this.spawnEnemies();
  }
  
  createPlayer() {
    this.player = {
      mesh: createCube(0, 0, 0, 2, { color: 0x4488cc }),
      x: 0, y: 0, z: 0,
      health: 100
    };
  }
  
  spawnEnemies() {
    this.enemies = [];
    for (let i = 0; i < 3; i++) {
      const enemy = createCube(-10 + i * 10, 0, -50, 1, { color: 0xcc4444 });
      this.enemies.push({
        mesh: enemy, x: -10 + i * 10, y: 0, z: -50, health: 30
      });
    }
  }
  
  update(dt) {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    
    if (this.enemies.length === 0) {
      switchToScreen('gameOver', { score: this.score });
    }
    
    if (isKeyPressed('m')) {
      switchToScreen('menu');
    }
  }
  
  updatePlayer(dt) {
    if (!this.player) return;
    
    const speed = 20;
    if (isKeyDown('a')) this.player.x -= speed * dt;
    if (isKeyDown('d')) this.player.x += speed * dt;
    if (isKeyDown('w')) this.player.z -= speed * dt;
    if (isKeyDown('s')) this.player.z += speed * dt;
    
    setPosition(this.player.mesh, this.player.x, this.player.y, this.player.z);
  }
  
  updateEnemies(dt) {
    for (let enemy of this.enemies) {
      enemy.z += 10 * dt;
      setPosition(enemy.mesh, enemy.x, enemy.y, enemy.z);
    }
  }
  
  draw() {
    print(`Score: ${this.score}`, 10, 10, rgba8(255, 255, 255));
    print(`Level: ${this.level}`, 10, 30, rgba8(255, 255, 255));
    print('M = Menu', 10, 340, rgba8(150, 150, 150));
  }
  
  exit() {
    // Cleanup
    if (this.player && this.player.mesh) {
      destroyMesh(this.player.mesh);
    }
    
    this.enemies.forEach(enemy => destroyMesh(enemy.mesh));
    this.enemies = [];
  }
}

addScreen('game', GameScreen);
```

## Screen Navigation

### Basic Navigation
```javascript
// Switch to a screen
switchToScreen('game');

// Switch with data
switchToScreen('game', { level: 5, difficulty: 'hard' });

// Get current screen
const currentScreen = getCurrentScreen();
console.log('Current screen:', currentScreen);
```

### Data Passing
```javascript
// From menu to game
switchToScreen('game', { 
  level: 1, 
  difficulty: 'normal',
  playerName: 'Player1' 
});

// In game screen's enter method
enter(data) {
  this.level = data.level || 1;
  this.difficulty = data.difficulty || 'normal';
  this.playerName = data.playerName || 'Player';
}

// From game to game over
switchToScreen('gameOver', {
  score: this.finalScore,
  level: this.level,
  time: this.gameTime
});
```

## Screen Lifecycle

### Methods
- **`enter(data)`**: Called when switching TO this screen
  - Receives optional data from previous screen
  - Used for initialization
- **`update(dt)`**: Called every frame for game logic
- **`draw()`**: Called every frame for rendering
- **`exit()`**: Called when switching AWAY from this screen
  - Used for cleanup (destroy meshes, clear arrays, etc.)

### Example Lifecycle
```javascript
addScreen('example', {
  enter(data) {
    console.log('Screen entered with data:', data);
    // Initialize screen state
    this.animTime = 0;
    this.objects = [];
    this.createObjects();
  },
  
  update(dt) {
    this.animTime += dt;
    // Update game logic
    this.updateObjects(dt);
    
    // Handle input
    if (isKeyPressed('Escape')) {
      switchToScreen('menu');
    }
  },
  
  draw() {
    // Render screen
    print('Example Screen', 100, 50, rgba8(255, 255, 255));
    print(`Time: ${this.animTime.toFixed(1)}`, 100, 70, rgba8(200, 200, 200));
  },
  
  exit() {
    console.log('Screen exited');
    // Cleanup resources
    this.objects.forEach(obj => {
      if (obj.mesh) destroyMesh(obj.mesh);
    });
    this.objects = [];
  }
});
```

## Best Practices

### 1. Always Clean Up
```javascript
exit() {
  // Destroy 3D meshes
  if (this.player && this.player.mesh) {
    destroyMesh(this.player.mesh);
  }
  
  // Clear arrays
  this.enemies.forEach(enemy => destroyMesh(enemy.mesh));
  this.enemies = [];
  
  this.projectiles.forEach(proj => destroyMesh(proj.mesh));
  this.projectiles = [];
}
```

### 2. Use Data Passing
```javascript
// Don't use global variables
let globalScore = 0; // ❌ Avoid this

// Use screen data instead
switchToScreen('results', { score: this.score }); // ✅ Better
```

### 3. Handle Input Consistently
```javascript
update(dt) {
  // Standard navigation
  if (isKeyPressed('m') || isKeyPressed('M')) {
    switchToScreen('menu');
  }
  
  if (isKeyPressed('Escape')) {
    switchToScreen('menu');
  }
  
  // Screen-specific input
  this.handleScreenInput(dt);
}
```

### 4. Provide Visual Feedback
```javascript
draw() {
  // Show current state
  print(`Level: ${this.level}`, 10, 10, rgba8(255, 255, 255));
  print(`Score: ${this.score}`, 10, 30, rgba8(255, 255, 255));
  
  // Show controls
  print('M = Menu', 10, 340, rgba8(150, 150, 150));
  print('ESC = Back', 10, 355, rgba8(150, 150, 150));
}
```

## Advanced Features

### Screen Validation
```javascript
addScreen('game', {
  enter(data) {
    // Validate required data
    if (!data.level) {
      console.warn('No level specified, defaulting to 1');
      data.level = 1;
    }
    
    if (data.level < 1 || data.level > 10) {
      console.error('Invalid level, switching to menu');
      switchToScreen('menu');
      return;
    }
    
    this.level = data.level;
  }
});
```

### Conditional Screen Switching
```javascript
update(dt) {
  // Only switch if conditions are met
  if (this.gameComplete && this.allAnimationsFinished()) {
    const score = this.calculateFinalScore();
    const isHighScore = score > this.getHighScore();
    
    if (isHighScore) {
      switchToScreen('newRecord', { score: score });
    } else {
      switchToScreen('gameOver', { score: score });
    }
  }
}
```

### Screen State Persistence
```javascript
class SettingsScreen extends Screen {
  enter() {
    // Load settings from storage
    this.settings = {
      volume: loadData('volume', 75),
      difficulty: loadData('difficulty', 'normal'),
      graphics: loadData('graphics', 'high')
    };
  }
  
  exit() {
    // Save settings to storage
    saveData('volume', this.settings.volume);
    saveData('difficulty', this.settings.difficulty);
    saveData('graphics', this.settings.graphics);
  }
}
```

## Working Examples

Check out these examples in the `examples/` directory:
- **`screen-demo/`**: Complete screen system demonstration
- **`star-fox-nova-3d/`**: Star Fox with title, game, and game over screens
- **`hello-3d/`**: Traditional approach (no screens) for comparison

## Migration Guide

### Converting Traditional Games
1. Move global variables into screen-specific properties
2. Split `init()` into individual screen `enter()` methods
3. Move cleanup code to `exit()` methods
4. Replace manual state switching with `switchToScreen()`
5. Add proper data passing between screens

### Before (Traditional)
```javascript
let gameState = 'menu';
let score = 0;
let level = 1;

export function update(dt) {
  switch (gameState) {
    case 'menu':
      updateMenu(dt);
      break;
    case 'game':
      updateGame(dt);
      break;
    case 'gameOver':
      updateGameOver(dt);
      break;
  }
}
```

### After (Screen System)
```javascript
addScreen('menu', { /* menu implementation */ });
addScreen('game', { /* game implementation */ });
addScreen('gameOver', { /* game over implementation */ });

startScreens('menu');
```

The screen system eliminates boilerplate code and provides a clean, scalable architecture for complex games!