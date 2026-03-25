// DUNGEON DELVE 3D — Roguelike Dungeon Crawler
// Procedurally generated dungeon with turn-based combat, loot, and permadeath
// Pure 3D using Nova64 primitives — no external assets needed

// ============================================
// CONFIGURATION
// ============================================
const TILE_SIZE = 2;
const MAP_W = 25;
const MAP_H = 25;
const TILE = { WALL: 0, FLOOR: 1, DOOR: 2, STAIRS: 3, CHEST: 4 };

// ============================================
// STATE
// ============================================
let gameState = 'start';
let time = 0;
let floor = 1;
let map = [];
let rooms = [];
let mapMeshes = [];

// Player
let hero = {
  x: 0,
  y: 0, // grid pos
  hp: 20,
  maxHp: 20,
  atk: 5,
  def: 2,
  xp: 0,
  xpNext: 15,
  level: 1,
  gold: 0,
  potions: 2,
  keys: 0,
  weapon: 'Rusty Sword',
  weaponBonus: 0,
  kills: 0,
};
let heroMesh = null;

// Enemies
let enemies = [];
let enemyMeshes = new Map();

// Items on ground
let items = [];
let itemMeshes = new Map();

// Messages
let messages = [];
let messageTimer = 0;

// Combat
let combatTarget = null;
let combatAnim = 0;
let screenFlash = 0;
let floatingTexts;

// Camera
let camTarget = { x: 0, y: 0 };
let camCurrent = { x: 0, y: 0 };
let moveTimer = 0;
const MOVE_DELAY = 0.12; // seconds between moves when holding key

// ============================================
// DUNGEON GENERATION
// ============================================
function generateDungeon() {
  // Clear old meshes
  for (const m of mapMeshes) destroyMesh(m);
  mapMeshes = [];
  for (const [, m] of enemyMeshes) destroyMesh(m);
  enemyMeshes.clear();
  for (const [, m] of itemMeshes) destroyMesh(m);
  itemMeshes.clear();
  if (heroMesh) {
    destroyMesh(heroMesh);
    heroMesh = null;
  }

  // Initialize map with walls
  map = [];
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      map[y][x] = TILE.WALL;
    }
  }

  // Generate rooms using BSP-like approach
  rooms = [];
  const maxRooms = 7 + floor;
  for (let i = 0; i < maxRooms * 3; i++) {
    const w = 3 + Math.floor(Math.random() * 4);
    const h = 3 + Math.floor(Math.random() * 4);
    const rx = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
    const ry = 1 + Math.floor(Math.random() * (MAP_H - h - 2));

    // Check overlap
    let overlap = false;
    for (const r of rooms) {
      if (rx - 1 < r.x + r.w && rx + w + 1 > r.x && ry - 1 < r.y + r.h && ry + h + 1 > r.y) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    rooms.push({ x: rx, y: ry, w, h, cx: Math.floor(rx + w / 2), cy: Math.floor(ry + h / 2) });
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        map[ry + dy][rx + dx] = TILE.FLOOR;
      }
    }
    if (rooms.length >= maxRooms) break;
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    let x = a.cx,
      y = a.cy;
    while (x !== b.cx) {
      map[y][x] = TILE.FLOOR;
      x += x < b.cx ? 1 : -1;
    }
    while (y !== b.cy) {
      map[y][x] = TILE.FLOOR;
      y += y < b.cy ? 1 : -1;
    }
  }

  // Place stairs in last room
  const lastRoom = rooms[rooms.length - 1];
  map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS;

  // Place chests
  for (let i = 2; i < rooms.length - 1; i++) {
    if (Math.random() < 0.4) {
      const r = rooms[i];
      const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
      const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
      map[cy][cx] = TILE.CHEST;
    }
  }

  // Place player in first room
  hero.x = rooms[0].cx;
  hero.y = rooms[0].cy;

  // Place enemies (not in first room)
  enemies = [];
  const enemyTypes = [
    { name: 'Slime', hp: 5 + floor * 2, atk: 2 + floor, def: 0, xp: 5, color: 0x44ff44 },
    { name: 'Skeleton', hp: 8 + floor * 2, atk: 4 + floor, def: 1, xp: 10, color: 0xddddaa },
    { name: 'Demon', hp: 12 + floor * 3, atk: 6 + floor, def: 2, xp: 20, color: 0xff3333 },
    { name: 'Ghost', hp: 6 + floor * 2, atk: 5 + floor, def: 0, xp: 15, color: 0x8888ff },
  ];

  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const numEnemies = 1 + Math.floor(Math.random() * (1 + Math.floor(floor / 2)));
    for (let e = 0; e < numEnemies; e++) {
      const ex = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
      const ey = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
      if (map[ey][ex] !== TILE.FLOOR) continue;
      const typeIdx = Math.min(
        Math.floor(Math.random() * (1 + floor * 0.5)),
        enemyTypes.length - 1
      );
      const template = enemyTypes[typeIdx];
      enemies.push({
        x: ex,
        y: ey,
        name: template.name,
        hp: template.hp,
        maxHp: template.hp,
        atk: template.atk,
        def: template.def,
        xp: template.xp,
        color: template.color,
        alive: true,
      });
    }
  }

  // Place gold/potion items
  items = [];
  for (let i = 1; i < rooms.length; i++) {
    if (Math.random() < 0.35) {
      const r = rooms[i];
      const ix = r.x + Math.floor(Math.random() * r.w);
      const iy = r.y + Math.floor(Math.random() * r.h);
      if (map[iy][ix] === TILE.FLOOR) {
        items.push({
          x: ix,
          y: iy,
          type: Math.random() < 0.6 ? 'gold' : 'potion',
          amount: Math.random() < 0.6 ? 5 + Math.floor(Math.random() * 10 * floor) : 1,
          collected: false,
        });
      }
    }
  }

  // Build 3D representation
  buildMapMeshes();
}

function buildMapMeshes() {
  // Environment
  setAmbientLight(0xffeedd, 0.15);
  setLightDirection(0, -1, 0.2);
  setFog(0x0a0a15, 5, 18);
  enableBloom(0.5, 0.3, 0.45);

  // Create wall and floor meshes
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const wx = x * TILE_SIZE;
      const wz = y * TILE_SIZE;

      if (map[y][x] === TILE.WALL) {
        // Only render walls adjacent to floor
        let adjacent = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy,
              nx = x + dx;
            if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W && map[ny][nx] !== TILE.WALL) {
              adjacent = true;
            }
          }
        }
        if (adjacent) {
          const wallMesh = createCube(TILE_SIZE, 0x444466, [wx, TILE_SIZE / 2, wz]);
          setScale(wallMesh, 1, 1.5, 1);
          mapMeshes.push(wallMesh);
        }
      } else {
        // Floor
        const floorColor =
          map[y][x] === TILE.STAIRS ? 0xffdd44 : map[y][x] === TILE.CHEST ? 0x886622 : 0x333344;
        const floorMesh = createCube(TILE_SIZE, floorColor, [wx, -0.1, wz]);
        setScale(floorMesh, 1, 0.1, 1);
        mapMeshes.push(floorMesh);

        // Stairs marker
        if (map[y][x] === TILE.STAIRS) {
          const stairMesh = createCylinder(0.3, 1.5, 0xffdd44, [wx, 0.75, wz]);
          mapMeshes.push(stairMesh);
        }
        // Chest
        if (map[y][x] === TILE.CHEST) {
          const chestMesh = createCube(0.8, 0xcc8833, [wx, 0.4, wz]);
          setScale(chestMesh, 1, 0.7, 0.7);
          mapMeshes.push(chestMesh);
        }
      }
    }
  }

  // Hero mesh
  heroMesh = createCapsule(0.3, 0.8, 0x4488ff, [hero.x * TILE_SIZE, 0.7, hero.y * TILE_SIZE]);

  // Enemy meshes
  for (const e of enemies) {
    const mesh = createSphere(0.4, e.color, [e.x * TILE_SIZE, 0.5, e.y * TILE_SIZE]);
    enemyMeshes.set(e, mesh);
  }

  // Item meshes
  for (const item of items) {
    const color = item.type === 'gold' ? 0xffdd00 : 0xff4488;
    const mesh = createSphere(0.2, color, [item.x * TILE_SIZE, 0.3, item.y * TILE_SIZE]);
    itemMeshes.set(item, mesh);
  }
}

// ============================================
// COMBAT
// ============================================
function attack(attacker, defender) {
  const dmg = Math.max(1, attacker.atk - defender.def + Math.floor(Math.random() * 3) - 1);
  defender.hp -= dmg;
  return dmg;
}

function tryMove(dx, dy) {
  const nx = hero.x + dx;
  const ny = hero.y + dy;

  if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
  if (map[ny][nx] === TILE.WALL) return;

  // Check for enemy
  const enemy = enemies.find(e => e.alive && e.x === nx && e.y === ny);
  if (enemy) {
    // Attack!
    const dmg = attack(hero, enemy);
    screenFlash = 0.15;
    combatAnim = 0.3;
    addMessage(`You hit ${enemy.name} for ${dmg} dmg!`, 0xffaa44);
    floatingTexts.spawn(`-${dmg}`, enemy.x * TILE_SIZE, 2.5, {
      z: enemy.y * TILE_SIZE,
      duration: 0.8,
      color: 0xff8844,
    });

    if (enemy.hp <= 0) {
      enemy.alive = false;
      hero.xp += enemy.xp;
      hero.kills++;
      addMessage(`${enemy.name} defeated! +${enemy.xp} XP`, 0x44ff44);
      if (enemyMeshes.has(enemy)) {
        destroyMesh(enemyMeshes.get(enemy));
        enemyMeshes.delete(enemy);
      }
      checkLevelUp();
    }
    return;
  }

  // Move
  hero.x = nx;
  hero.y = ny;
  setPosition(heroMesh, hero.x * TILE_SIZE, 0.7, hero.y * TILE_SIZE);

  // Check items
  for (const item of items) {
    if (!item.collected && item.x === nx && item.y === ny) {
      item.collected = true;
      if (item.type === 'gold') {
        hero.gold += item.amount;
        addMessage(`Found ${item.amount} gold!`, 0xffdd00);
      } else {
        hero.potions += item.amount;
        addMessage('Found a potion!', 0xff4488);
      }
      if (itemMeshes.has(item)) {
        destroyMesh(itemMeshes.get(item));
        itemMeshes.delete(item);
      }
    }
  }

  // Chest
  if (map[ny][nx] === TILE.CHEST) {
    const loot = Math.floor(Math.random() * 30 * floor) + 10;
    hero.gold += loot;
    addMessage(`Chest! Found ${loot} gold!`, 0xffaa00);
    map[ny][nx] = TILE.FLOOR;
    // Upgrade weapon chance
    if (Math.random() < 0.3) {
      hero.weaponBonus++;
      const weapons = ['Iron Sword', 'Steel Blade', 'Flame Sword', 'Shadow Katana', 'Dragon Fang'];
      hero.weapon = weapons[Math.min(hero.weaponBonus - 1, weapons.length - 1)];
      hero.atk += 2;
      addMessage(`Found ${hero.weapon}! ATK +2`, 0xff8844);
    }
  }

  // Stairs
  if (map[ny][nx] === TILE.STAIRS) {
    floor++;
    addMessage(`Descending to Floor ${floor}...`, 0x8888ff);
    hero.hp = Math.min(hero.hp + 5, hero.maxHp);
    generateDungeon();
  }

  // Enemy turns — they move toward player
  enemyTurn();
}

function enemyTurn() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = hero.x - e.x;
    const dy = hero.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist <= 1) {
      // Attack player
      const dmg = attack(e, hero);
      screenFlash = 0.1;
      addMessage(`${e.name} hits you for ${dmg}!`, 0xff4444);
      floatingTexts.spawn(`-${dmg}`, hero.x * TILE_SIZE, 2.5, {
        z: hero.y * TILE_SIZE,
        duration: 0.8,
        color: 0xff4444,
      });
      if (hero.hp <= 0) {
        gameState = 'dead';
        addMessage('You have been slain!', 0xff0000);
      }
    } else if (dist < 8) {
      // Chase player (simple)
      let mx = 0,
        my = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        mx = dx > 0 ? 1 : -1;
      } else {
        my = dy > 0 ? 1 : -1;
      }
      const nx = e.x + mx,
        ny = e.y + my;
      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && map[ny][nx] !== TILE.WALL) {
        const blocked = enemies.some(o => o !== e && o.alive && o.x === nx && o.y === ny);
        if (!blocked && !(nx === hero.x && ny === hero.y)) {
          e.x = nx;
          e.y = ny;
          if (enemyMeshes.has(e)) {
            setPosition(enemyMeshes.get(e), e.x * TILE_SIZE, 0.5, e.y * TILE_SIZE);
          }
        }
      }
    }
  }
}

function checkLevelUp() {
  if (hero.xp >= hero.xpNext) {
    hero.xp -= hero.xpNext;
    hero.level++;
    hero.maxHp += 5;
    hero.hp = hero.maxHp;
    hero.atk += 1;
    hero.def += 1;
    hero.xpNext = Math.floor(hero.xpNext * 1.5);
    addMessage(`LEVEL UP! Now Level ${hero.level}!`, 0xffff00);
  }
}

function addMessage(text, color) {
  messages.unshift({ text, color, timer: 4 });
  if (messages.length > 6) messages.pop();
}

function usePotion() {
  if (hero.potions > 0 && hero.hp < hero.maxHp) {
    hero.potions--;
    const heal = 8 + hero.level * 2;
    hero.hp = Math.min(hero.hp + heal, hero.maxHp);
    addMessage(`Healed ${heal} HP!`, 0xff88ff);
    enemyTurn();
  }
}

// ============================================
// MAIN LOOP
// ============================================
export function init() {
  hero = {
    x: 0,
    y: 0,
    hp: 20,
    maxHp: 20,
    atk: 5,
    def: 2,
    xp: 0,
    xpNext: 15,
    level: 1,
    gold: 0,
    potions: 2,
    keys: 0,
    weapon: 'Rusty Sword',
    weaponBonus: 0,
    kills: 0,
  };
  floor = 1;
  messages = [];
  floatingTexts = createFloatingTextSystem();
  enemies = [];
  items = [];
  mapMeshes = [];
  time = 0;
  gameState = 'start';

  generateDungeon();
}

export function update(dt) {
  time += dt;

  if (gameState === 'start') {
    if (keyp('Space') || keyp('Enter')) gameState = 'playing';
    updateCamera(dt);
    return;
  }

  if (gameState === 'dead') {
    if (keyp('Space') || keyp('Enter')) init();
    return;
  }

  // Movement with repeat delay
  moveTimer -= dt;
  if (moveTimer <= 0) {
    let moved = false;
    if (keyp('ArrowUp') || keyp('KeyW') || (moveTimer < -0.3 && (key('ArrowUp') || key('KeyW')))) {
      tryMove(0, -1);
      moved = true;
    } else if (
      keyp('ArrowDown') ||
      keyp('KeyS') ||
      (moveTimer < -0.3 && (key('ArrowDown') || key('KeyS')))
    ) {
      tryMove(0, 1);
      moved = true;
    } else if (
      keyp('ArrowLeft') ||
      keyp('KeyA') ||
      (moveTimer < -0.3 && (key('ArrowLeft') || key('KeyA')))
    ) {
      tryMove(-1, 0);
      moved = true;
    } else if (
      keyp('ArrowRight') ||
      keyp('KeyD') ||
      (moveTimer < -0.3 && (key('ArrowRight') || key('KeyD')))
    ) {
      tryMove(1, 0);
      moved = true;
    }
    if (moved) moveTimer = MOVE_DELAY;
  }

  // Use potion
  if (keyp('KeyP') || keyp('KeyQ')) usePotion();

  // Wait / skip turn (Space when not on start screen)
  if (keyp('Space')) {
    enemyTurn();
    addMessage('Waiting...', 0x888899);
  }

  // Animate
  if (combatAnim > 0) combatAnim -= dt;
  if (screenFlash > 0) screenFlash -= dt;

  // Update messages
  for (const m of messages) m.timer -= dt;
  messages = messages.filter(m => m.timer > 0);

  // Update floating texts
  floatingTexts.update(dt);

  // Animate enemy meshes (bob)
  for (const e of enemies) {
    if (!e.alive) continue;
    const mesh = enemyMeshes.get(e);
    if (mesh) {
      const bob = Math.sin(time * 3 + e.x + e.y) * 0.1;
      setPosition(mesh, e.x * TILE_SIZE, 0.5 + bob, e.y * TILE_SIZE);
    }
  }

  // Hero bob
  if (heroMesh) {
    const bob = Math.sin(time * 4) * 0.05;
    setPosition(heroMesh, hero.x * TILE_SIZE, 0.7 + bob, hero.y * TILE_SIZE);
  }

  updateCamera(dt);
}

function updateCamera(dt) {
  const tx = hero.x * TILE_SIZE;
  const tz = hero.y * TILE_SIZE;
  camCurrent.x += (tx - camCurrent.x) * 0.12;
  camCurrent.y += (tz - camCurrent.y) * 0.12;

  setCameraPosition(camCurrent.x + 1.5, 14, camCurrent.y + 11);
  setCameraTarget(camCurrent.x, 0, camCurrent.y);
}

// ============================================
// DRAW (2D HUD OVERLAY)
// ============================================
export function draw() {
  if (gameState === 'start') {
    rect(0, 0, 640, 360, rgba8(0, 0, 0, 180), true);
    printCentered('DUNGEON DELVE', 320, 60, rgba8(255, 200, 100));
    printCentered('A Roguelike Adventure', 320, 90, rgba8(180, 160, 140));

    printCentered(
      'Descend the dungeon. Fight monsters. Find treasure.',
      320,
      140,
      rgba8(150, 150, 180)
    );
    printCentered('Permadeath — when you die, you start over!', 320, 160, rgba8(255, 100, 100));

    const pulse = Math.sin(time * 3) * 0.5 + 0.5;
    printCentered('PRESS SPACE TO DELVE', 320, 210, rgba8(255, 255, 100, 100 + pulse * 155));

    printCentered('WASD/Arrows = Move & Attack', 320, 260, rgba8(140, 140, 170));
    printCentered('P/Q = Use Potion', 320, 280, rgba8(140, 140, 170));
    return;
  }

  if (gameState === 'dead') {
    rect(0, 0, 640, 360, rgba8(80, 0, 0, 200), true);
    printCentered('YOU HAVE PERISHED', 320, 80, rgba8(255, 50, 50));
    printCentered(
      `Floor ${floor}  |  Level ${hero.level}  |  ${hero.kills} kills  |  ${hero.gold} gold`,
      320,
      130,
      rgba8(200, 200, 200)
    );

    const rating =
      hero.kills > 20
        ? 'LEGENDARY'
        : hero.kills > 10
          ? 'HEROIC'
          : hero.kills > 5
            ? 'BRAVE'
            : 'NOVICE';
    printCentered(rating, 320, 170, rgba8(255, 215, 0));

    printCentered('PRESS SPACE TO TRY AGAIN', 320, 240, rgba8(200, 150, 150));
    return;
  }

  // Screen flash
  if (screenFlash > 0) {
    rect(0, 0, 640, 360, rgba8(255, 50, 50, Math.floor(screenFlash * 400)), true);
  }

  // Stats panel (left)
  rect(8, 8, 160, 100, rgba8(0, 0, 0, 180), true);
  rect(8, 8, 160, 100, rgba8(80, 80, 120, 150), false);
  print(`FLOOR ${floor}  LV.${hero.level}`, 16, 16, rgba8(255, 200, 100));

  // HP bar
  const hpPct = hero.hp / hero.maxHp;
  const hpColor =
    hpPct > 0.5 ? rgba8(50, 200, 50) : hpPct > 0.25 ? rgba8(200, 200, 50) : rgba8(200, 50, 50);
  print(`HP`, 16, 32, rgba8(200, 200, 200));
  rect(36, 32, 120, 8, rgba8(40, 40, 40), true);
  rect(36, 32, Math.floor(120 * hpPct), 8, hpColor, true);
  print(`${hero.hp}/${hero.maxHp}`, 70, 32, rgba8(255, 255, 255));

  // XP bar
  const xpPct = hero.xp / hero.xpNext;
  print(`XP`, 16, 46, rgba8(200, 200, 200));
  rect(36, 46, 120, 8, rgba8(40, 40, 40), true);
  rect(36, 46, Math.floor(120 * xpPct), 8, rgba8(100, 100, 255), true);

  print(`ATK: ${hero.atk}  DEF: ${hero.def}`, 16, 62, rgba8(180, 180, 200));
  print(`${hero.weapon}`, 16, 76, rgba8(255, 180, 100));
  print(`Gold: ${hero.gold}  Potions: ${hero.potions}`, 16, 92, rgba8(255, 215, 0));

  // Messages (right side)
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const alpha = Math.min(255, m.timer * 100);
    const col = m.color | (alpha << 24); // won't work in rgba8; approximate
    print(
      m.text,
      200,
      320 - i * 14,
      rgba8((m.color >> 16) & 0xff, (m.color >> 8) & 0xff, m.color & 0xff, alpha)
    );
  }

  // Minimap (bottom right)
  const mmSize = 3;
  const mmX = 640 - MAP_W * mmSize - 10;
  const mmY = 10;
  rect(mmX - 2, mmY - 2, MAP_W * mmSize + 4, MAP_H * mmSize + 4, rgba8(0, 0, 0, 180), true);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] !== TILE.WALL) {
        const col = map[y][x] === TILE.STAIRS ? rgba8(255, 255, 0) : rgba8(60, 60, 80);
        rect(mmX + x * mmSize, mmY + y * mmSize, mmSize, mmSize, col, true);
      }
    }
  }
  // Player on minimap
  rect(
    mmX + hero.x * mmSize - 1,
    mmY + hero.y * mmSize - 1,
    mmSize + 2,
    mmSize + 2,
    rgba8(50, 150, 255),
    true
  );
  // Enemies on minimap (only within 8 tiles of player — fog of war)
  for (const e of enemies) {
    if (e.alive) {
      const dist = Math.abs(e.x - hero.x) + Math.abs(e.y - hero.y);
      if (dist <= 8) {
        rect(mmX + e.x * mmSize, mmY + e.y * mmSize, mmSize, mmSize, rgba8(255, 50, 50), true);
      }
    }
  }

  // Floating damage numbers (3D world-space → isometric screen projection)
  drawFloatingTexts3D(floatingTexts, (x, y, z) => [
    Math.floor(320 + (x - hero.x * TILE_SIZE) * 8),
    Math.floor(180 - y * 6 - (z - hero.y * TILE_SIZE) * 4),
  ]);

  // Controls hint
  print('WASD=Move  P=Potion  SPC=Wait  Walk into enemies!', 10, 348, rgba8(100, 100, 130, 180));
}
