// ⚔️ WIZARDRY NOVA 64 — First-Person Grid-Based Dungeon RPG ⚔️
// Inspired by Wizardry: Proving Grounds of the Mad Overlord

const W = 640,
  H = 360;
const TILE = 3; // world units per grid cell
const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]; // N E S W
const DIR_NAMES = ['North', 'East', 'South', 'West'];

// Dungeon tile types
const T = { WALL: 0, FLOOR: 1, DOOR: 2, STAIRS_DOWN: 3, STAIRS_UP: 4, CHEST: 5, FOUNTAIN: 6 };

// Character classes
const CLASSES = ['Fighter', 'Mage', 'Priest', 'Thief'];
const CLASS_COLORS = { Fighter: 0xff4444, Mage: 0x4488ff, Priest: 0xffdd44, Thief: 0x44ff88 };
const CLASS_ICONS = { Fighter: '⚔', Mage: '✦', Priest: '✚', Thief: '◆' };

// Monster templates per floor tier
const MONSTERS = [
  // Floor 1-2
  [
    { name: 'Kobold', hp: 8, atk: 3, def: 1, xp: 5, gold: 3, color: 0x886644 },
    { name: 'Giant Rat', hp: 6, atk: 2, def: 0, xp: 3, gold: 1, color: 0x666655 },
    { name: 'Skeleton', hp: 12, atk: 4, def: 2, xp: 8, gold: 5, color: 0xccccaa },
  ],
  // Floor 3-4
  [
    { name: 'Orc', hp: 18, atk: 6, def: 3, xp: 15, gold: 10, color: 0x448833 },
    { name: 'Zombie', hp: 22, atk: 5, def: 2, xp: 12, gold: 4, color: 0x556644 },
    { name: 'Dark Elf', hp: 15, atk: 8, def: 4, xp: 20, gold: 15, color: 0x443366 },
  ],
  // Floor 5+
  [
    { name: 'Troll', hp: 35, atk: 10, def: 5, xp: 30, gold: 20, color: 0x336633 },
    { name: 'Wraith', hp: 25, atk: 12, def: 3, xp: 35, gold: 25, color: 0x333355 },
    { name: 'Dragon', hp: 60, atk: 15, def: 8, xp: 80, gold: 50, color: 0xcc4422 },
  ],
];

// Spells
const SPELLS = {
  // Mage spells
  FIRE: { name: 'Fireball', cost: 3, dmg: 12, type: 'attack', class: 'Mage', desc: 'AoE fire' },
  ICE: { name: 'Ice Bolt', cost: 2, dmg: 8, type: 'attack', class: 'Mage', desc: 'Single target' },
  // Priest spells
  HEAL: { name: 'Heal', cost: 2, amount: 15, type: 'heal', class: 'Priest', desc: 'Heal one ally' },
  BLESS: { name: 'Bless', cost: 3, amount: 3, type: 'buff', class: 'Priest', desc: '+ATK party' },
  TURN_UNDEAD: {
    name: 'Turn Undead',
    cost: 2,
    dmg: 20,
    type: 'undead',
    class: 'Priest',
    desc: 'Smite undead',
  },
};

// State
let gameState; // 'title', 'explore', 'combat', 'inventory', 'gameover', 'victory'
let floor, px, py, facing; // player grid pos + direction (0-3)
let dungeon; // 2D array
let dungeonW, dungeonH;
let wallMeshes, floorMeshes, ceilMeshes, specialMeshes;
let torchLights;
let party; // array of party members
let enemies; // current combat encounter
let combatLog;
let combatTurn; // 0..party.length-1 or 'enemy'
let combatAction; // current action selection state
let selectedTarget;
let animTimer; // for transitions
let stepAnim; // walking bob
let turnAnim; // rotation tween
let targetYaw, currentYaw;
let encounterChance;
let totalGold;
let dungeonsCleared;
let floatingTexts;
let shake;
let inputCD;
let moveCD;
let floorMessage;
let floorMessageTimer;

// 3D mesh tracking
let currentLevelMeshes = [];
let monsterMeshes = [];

// ═══════════════════════════════════════════════════════════════════════
// DUNGEON GENERATION
// ═══════════════════════════════════════════════════════════════════════

function generateDungeon(w, h) {
  dungeonW = w;
  dungeonH = h;
  const map = Array.from({ length: h }, () => new Array(w).fill(T.WALL));

  // Carve rooms
  const rooms = [];
  const attempts = 60;
  for (let a = 0; a < attempts; a++) {
    const rw = 3 + Math.floor(Math.random() * 4);
    const rh = 3 + Math.floor(Math.random() * 4);
    const rx = 1 + Math.floor(Math.random() * (w - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (h - rh - 2));

    let overlap = false;
    for (const r of rooms) {
      if (rx <= r.x + r.w + 1 && rx + rw >= r.x - 1 && ry <= r.y + r.h + 1 && ry + rh >= r.y - 1) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) map[y][x] = T.FLOOR;
    rooms.push({ x: rx, y: ry, w: rw, h: rh });
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1],
      b = rooms[i];
    const ax = a.x + Math.floor(a.w / 2),
      ay = a.y + Math.floor(a.h / 2);
    const bx = b.x + Math.floor(b.w / 2),
      by = b.y + Math.floor(b.h / 2);
    let cx = ax,
      cy = ay;
    while (cx !== bx) {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) map[cy][cx] = T.FLOOR;
      cx += cx < bx ? 1 : -1;
    }
    while (cy !== by) {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) map[cy][cx] = T.FLOOR;
      cy += cy < by ? 1 : -1;
    }
  }

  // Place doors between corridors and rooms
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== T.FLOOR) continue;
      // Narrow corridor opening into room = door candidate
      const horiz = map[y][x - 1] === T.WALL && map[y][x + 1] === T.WALL;
      const vert = map[y - 1][x] === T.WALL && map[y + 1][x] === T.WALL;
      if ((horiz || vert) && Math.random() < 0.15) {
        map[y][x] = T.DOOR;
      }
    }
  }

  // Place stairs down in last room
  if (rooms.length > 1) {
    const last = rooms[rooms.length - 1];
    const sx = last.x + Math.floor(last.w / 2);
    const sy = last.y + Math.floor(last.h / 2);
    map[sy][sx] = T.STAIRS_DOWN;
  }

  // Place stairs up in first room (return)
  if (floor > 1 && rooms.length > 0) {
    const first = rooms[0];
    map[first.y + 1][first.x + 1] = T.STAIRS_UP;
  }

  // Scatter chests and fountains
  for (let i = 0; i < 3 + floor; i++) {
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
    const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
    if (map[cy][cx] === T.FLOOR) {
      map[cy][cx] = Math.random() < 0.7 ? T.CHEST : T.FOUNTAIN;
    }
  }

  // Player starts in first room center
  if (rooms.length > 0) {
    const first = rooms[0];
    px = first.x + Math.floor(first.w / 2);
    py = first.y + Math.floor(first.h / 2);
    map[py][px] = T.FLOOR; // ensure start is clear
  }

  return map;
}

// ═══════════════════════════════════════════════════════════════════════
// 3D LEVEL BUILDING
// ═══════════════════════════════════════════════════════════════════════

function clearLevel() {
  for (const id of currentLevelMeshes) destroyMesh(id);
  currentLevelMeshes = [];
  if (torchLights) {
    for (const id of torchLights) removeLight(id);
  }
  torchLights = [];
  clearMonsterMeshes();
}

function clearMonsterMeshes() {
  for (const id of monsterMeshes) destroyMesh(id);
  monsterMeshes = [];
}

function buildLevel() {
  clearLevel();

  const wallColor = [0x554433, 0x443322, 0x665544][Math.min(floor - 1, 2)];
  const floorColor = [0x332211, 0x222211, 0x111122][Math.min(floor - 1, 2)];
  const ceilColor = [0x221100, 0x111100, 0x0a0a11][Math.min(floor - 1, 2)];

  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      const tile = dungeon[y][x];
      const wx = x * TILE,
        wz = y * TILE;

      if (tile === T.WALL) {
        // Only create visible walls (adjacent to floor)
        let visible = false;
        for (const [dx, dz] of DIRS) {
          const nx = x + dx,
            nz = y + dz;
          if (nx >= 0 && nx < dungeonW && nz >= 0 && nz < dungeonH && dungeon[nz][nx] !== T.WALL) {
            visible = true;
            break;
          }
        }
        if (visible) {
          const m = createCube(TILE, wallColor, [wx, TILE / 2, wz], { roughness: 0.9 });
          currentLevelMeshes.push(m);
        }
      } else {
        // Floor
        const f = createPlane(TILE, TILE, floorColor, [wx, 0.01, wz]);
        rotateMesh(f, -Math.PI / 2, 0, 0);
        currentLevelMeshes.push(f);

        // Ceiling
        const c = createPlane(TILE, TILE, ceilColor, [wx, TILE, wz]);
        rotateMesh(c, Math.PI / 2, 0, 0);
        currentLevelMeshes.push(c);

        // Special tiles
        if (tile === T.DOOR) {
          const d = createCube(TILE * 0.1, 0x886622, [wx, TILE / 2, wz], { roughness: 0.7 });
          setScale(d, 1, 1, 0.3);
          currentLevelMeshes.push(d);
        } else if (tile === T.STAIRS_DOWN) {
          const s = createCone(0.5, 1, 0x44aaff, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0x44aaff,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          const l = createPointLight(0x44aaff, 1.5, 8, wx, 1.5, wz);
          torchLights.push(l);
        } else if (tile === T.STAIRS_UP) {
          const s = createCone(0.5, 1, 0xffaa44, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
        } else if (tile === T.CHEST) {
          const ch = createCube(0.6, 0xddaa33, [wx, 0.35, wz], { roughness: 0.4, metallic: true });
          setScale(ch, 1, 0.7, 0.7);
          currentLevelMeshes.push(ch);
        } else if (tile === T.FOUNTAIN) {
          const fb = createCylinder(0.6, 0.6, 0.4, 0x667788, [wx, 0.2, wz]);
          currentLevelMeshes.push(fb);
          const fw = createSphere(0.3, 0x3388ff, [wx, 0.5, wz], 6, {
            material: 'emissive',
            emissive: 0x3388ff,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(fw);
          const l = createPointLight(0x3388ff, 1, 6, wx, 1, wz);
          torchLights.push(l);
        }

        // Scatter torches
        if (tile === T.FLOOR && Math.random() < 0.04) {
          const l = createPointLight(0xff8833, 1.2, 10, wx, 2.2, wz);
          torchLights.push(l);
          const torch = createCone(0.1, 0.3, 0xff6600, [wx, 2.5, wz], {
            material: 'emissive',
            emissive: 0xff6600,
            emissiveIntensity: 1.0,
          });
          currentLevelMeshes.push(torch);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PARTY CREATION
// ═══════════════════════════════════════════════════════════════════════

function createParty() {
  return [
    makeChar('Aldric', 'Fighter', { hp: 30, atk: 8, def: 6, spd: 4 }),
    makeChar('Elara', 'Mage', { hp: 18, atk: 3, def: 2, spd: 5, mp: 12 }),
    makeChar('Torvin', 'Priest', { hp: 22, atk: 4, def: 4, spd: 3, mp: 10 }),
    makeChar('Shade', 'Thief', { hp: 20, atk: 6, def: 3, spd: 7 }),
  ];
}

function makeChar(name, cls, stats) {
  return {
    name,
    class: cls,
    hp: stats.hp,
    maxHp: stats.hp,
    mp: stats.mp ?? 0,
    maxMp: stats.mp ?? 0,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    level: 1,
    xp: 0,
    xpNext: 20,
    alive: true,
    buffAtk: 0,
    buffTimer: 0,
  };
}

function levelUp(c) {
  c.level++;
  c.xpNext = Math.floor(c.xpNext * 1.5);
  const hpGain = c.class === 'Fighter' ? 8 : c.class === 'Priest' ? 5 : c.class === 'Mage' ? 4 : 6;
  c.maxHp += hpGain;
  c.hp = Math.min(c.hp + hpGain, c.maxHp);
  c.atk += c.class === 'Fighter' ? 3 : c.class === 'Thief' ? 2 : 1;
  c.def += c.class === 'Fighter' ? 2 : 1;
  if (c.maxMp > 0) {
    c.maxMp += 3;
    c.mp = Math.min(c.mp + 3, c.maxMp);
  }
  return hpGain;
}

// ═══════════════════════════════════════════════════════════════════════
// COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function startCombat() {
  const tier = Math.min(Math.floor((floor - 1) / 2), MONSTERS.length - 1);
  const pool = MONSTERS[tier];
  const count = 1 + Math.floor(Math.random() * Math.min(3, floor));
  enemies = [];
  for (let i = 0; i < count; i++) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    const scale = 0.8 + Math.random() * 0.4;
    enemies.push({
      ...template,
      hp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
      maxHp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
      atk: Math.floor(template.atk * (1 + floor * 0.08)),
      def: template.def,
      id: i,
    });
  }

  // Create monster meshes in front of player
  clearMonsterMeshes();
  const [dx, dz] = DIRS[facing];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const offset = (i - (enemies.length - 1) / 2) * 1.5;
    const perpX = -dz,
      perpZ = dx; // perpendicular
    const mx = px * TILE + dx * 4 + perpX * offset;
    const mz = py * TILE + dz * 4 + perpZ * offset;
    const body = createCube(1.2, e.color, [mx, 1, mz], { roughness: 0.8 });
    const eye1 = createSphere(0.15, 0xff0000, [mx - 0.25, 1.4, mz - dz * 0.5 - dx * 0.5], 4, {
      material: 'emissive',
      emissive: 0xff0000,
      emissiveIntensity: 1,
    });
    const eye2 = createSphere(0.15, 0xff0000, [mx + 0.25, 1.4, mz - dz * 0.5 - dx * 0.5], 4, {
      material: 'emissive',
      emissive: 0xff0000,
      emissiveIntensity: 1,
    });
    monsterMeshes.push(body, eye1, eye2);
    e.meshBody = body;
  }

  combatLog = [
    `${enemies.length} ${enemies.length > 1 ? 'monsters appear' : enemies[0].name + ' appears'}!`,
  ];
  combatTurn = 0;
  combatAction = 'choose'; // 'choose', 'target', 'spell', 'spellTarget', 'enemyTurn', 'result'
  selectedTarget = 0;
  gameState = 'combat';
}

function doAttack(attacker, defender) {
  const variance = 0.7 + Math.random() * 0.6;
  const raw = Math.floor((attacker.atk + attacker.buffAtk) * variance);
  const dmg = Math.max(1, raw - defender.def);
  defender.hp -= dmg;
  if (defender.hp <= 0) defender.hp = 0;
  return dmg;
}

function doSpell(caster, spell, target) {
  if (caster.mp < spell.cost) return null;
  caster.mp -= spell.cost;

  if (spell.type === 'heal') {
    target.hp = Math.min(target.hp + spell.amount, target.maxHp);
    return { type: 'heal', amount: spell.amount, target };
  }
  if (spell.type === 'buff') {
    for (const m of party) {
      if (m.alive) {
        m.buffAtk += spell.amount;
        m.buffTimer = 5;
      }
    }
    return { type: 'buff', amount: spell.amount };
  }
  if (spell.type === 'attack' || spell.type === 'undead') {
    let totalDmg = 0;
    const targets =
      spell.type === 'attack' ? enemies.filter(e => e.hp > 0) : enemies.filter(e => e.hp > 0);
    if (spell.name === 'Ice Bolt') {
      // Single target
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      target.hp = Math.max(0, target.hp - dmg);
      return { type: 'damage', dmg, targets: [target] };
    }
    // AoE
    for (const e of targets) {
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      e.hp = Math.max(0, e.hp - dmg);
      totalDmg += dmg;
    }
    return { type: 'damage', dmg: totalDmg, targets };
  }
  return null;
}

function advanceCombatTurn() {
  // Check victory
  if (enemies.every(e => e.hp <= 0)) {
    let totalXP = 0,
      totalGoldGain = 0;
    for (const e of enemies) {
      totalXP += e.xp;
      totalGoldGain += e.gold + Math.floor(Math.random() * e.gold);
    }
    totalGold += totalGoldGain;
    combatLog.push(`Victory! +${totalXP} XP, +${totalGoldGain} Gold`);

    // Distribute XP and check level ups
    for (const m of party) {
      if (!m.alive) continue;
      m.xp += totalXP;
      while (m.xp >= m.xpNext) {
        m.xp -= m.xpNext;
        const hpGain = levelUp(m);
        combatLog.push(`${m.name} leveled up to ${m.level}!`);
      }
    }

    // Remove dead monster meshes
    for (const e of enemies) {
      if (e.meshBody) {
        destroyMesh(e.meshBody);
        e.meshBody = null;
      }
    }

    combatAction = 'result';
    return;
  }

  // Check defeat
  if (party.every(m => !m.alive)) {
    combatLog.push('Your party has been wiped out...');
    combatAction = 'result';
    return;
  }

  // Next party member
  combatTurn++;
  while (combatTurn < party.length && !party[combatTurn].alive) combatTurn++;

  if (combatTurn >= party.length) {
    // Enemy turn
    combatAction = 'enemyTurn';
    animTimer = 0.5;
  } else {
    combatAction = 'choose';
    selectedTarget = enemies.findIndex(e => e.hp > 0);
  }
}

function doEnemyTurn() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Pick random alive party member
    const alive = party.filter(m => m.alive);
    if (alive.length === 0) break;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const dmg = doAttack(e, target);
    combatLog.push(`${e.name} hits ${target.name} for ${dmg}!`);
    triggerShake(shake, 0.3);

    if (target.hp <= 0) {
      target.alive = false;
      combatLog.push(`${target.name} falls!`);
    }
  }

  // Tick buffs
  for (const m of party) {
    if (m.buffTimer > 0) {
      m.buffTimer--;
      if (m.buffTimer <= 0) m.buffAtk = 0;
    }
  }

  // Back to party turn
  combatTurn = 0;
  while (combatTurn < party.length && !party[combatTurn].alive) combatTurn++;

  if (combatTurn >= party.length || party.every(m => !m.alive)) {
    combatLog.push('Your party has been wiped out...');
    combatAction = 'result';
  } else {
    combatAction = 'choose';
    selectedTarget = enemies.findIndex(e => e.hp > 0);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPLORATION
// ═══════════════════════════════════════════════════════════════════════

function tryMove(dx, dz) {
  const nx = px + dx,
    nz = py + dz;
  if (nx < 0 || nx >= dungeonW || nz < 0 || nz >= dungeonH) return false;
  const tile = dungeon[nz][nx];
  if (tile === T.WALL) return false;

  px = nx;
  py = nz;
  stepAnim = 1.0;

  // Interact with special tiles
  if (tile === T.DOOR) {
    dungeon[nz][nx] = T.FLOOR;
    showFloorMessage('Door opened!');
  } else if (tile === T.STAIRS_DOWN) {
    enterFloor(floor + 1);
    return true;
  } else if (tile === T.STAIRS_UP) {
    if (floor > 1) {
      enterFloor(floor - 1);
    } else {
      showFloorMessage('The surface is sealed...');
    }
    return true;
  } else if (tile === T.CHEST) {
    dungeon[nz][nx] = T.FLOOR;
    const goldAmount = 5 + Math.floor(Math.random() * 10 * floor);
    totalGold += goldAmount;
    showFloorMessage(`Found chest: +${goldAmount} Gold!`);
    // Chance for HP/MP restore
    if (Math.random() < 0.3) {
      const healTarget = party.find(m => m.alive && m.hp < m.maxHp);
      if (healTarget) {
        const heal = 5 + Math.floor(Math.random() * 10);
        healTarget.hp = Math.min(healTarget.hp + heal, healTarget.maxHp);
        showFloorMessage(`Found potion: ${healTarget.name} +${heal} HP`);
      }
    }
    sfx('coin');
  } else if (tile === T.FOUNTAIN) {
    // Restore party
    for (const m of party) {
      if (m.alive) {
        m.hp = m.maxHp;
        m.mp = m.maxMp;
      }
    }
    showFloorMessage('Fountain restores the party!');
    sfx('coin');
  }

  // Random encounter
  encounterChance += 0.08 + floor * 0.02;
  if (Math.random() < encounterChance) {
    encounterChance = 0;
    startCombat();
  }

  return true;
}

function enterFloor(newFloor) {
  floor = newFloor;
  facing = 0;
  encounterChance = 0;

  if (floor > 5) {
    // Victory!
    gameState = 'victory';
    showFloorMessage('You conquered the dungeon!');
    return;
  }

  dungeon = generateDungeon(18 + floor * 2, 18 + floor * 2);
  buildLevel();
  targetYaw = (facing * Math.PI) / 2;
  currentYaw = targetYaw;
  updateCamera3D();
  showFloorMessage(
    `Floor ${floor} — ${['Musty Cellars', 'Flooded Crypts', 'Fungal Warrens', 'Obsidian Vaults', "The Dragon's Lair"][Math.min(floor - 1, 4)]}`
  );
}

function showFloorMessage(msg) {
  floorMessage = msg;
  floorMessageTimer = 3.0;
}

// ═══════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════

function updateCamera3D() {
  const [dx, dz] = DIRS[facing];
  const wx = px * TILE,
    wz = py * TILE;
  const bob = Math.sin(stepAnim * Math.PI * 4) * 0.1 * Math.max(0, stepAnim);
  const eyeY = 1.6 + bob;

  const [shakeX, shakeY] = getShakeOffset(shake);

  setCameraPosition(wx + shakeX * 0.02, eyeY + shakeY * 0.02, wz);
  setCameraTarget(wx + dx * 10, eyeY, wz + dz * 10);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT / UPDATE / DRAW
// ═══════════════════════════════════════════════════════════════════════

export function init() {
  gameState = 'title';
  animTimer = 0;

  setAmbientLight(0x221111, 0.4);
  setLightDirection(0, -1, 0);
  setLightColor(0x443322);
  setFog(0x000000, 2, 18);
  setCameraFOV(75);

  enableBloom(0.8, 0.4, 0.3);
  enableVignette(1.2, 0.85);

  shake = createShake({ decay: 5 });
  inputCD = createCooldown(0.15);
  moveCD = createCooldown(0.18);
  floatingTexts = createFloatingTextSystem();

  // Start new game data but stay on title
  party = createParty();
  floor = 0;
  totalGold = 0;
  dungeonsCleared = 0;
  stepAnim = 0;
  turnAnim = 0;
  currentYaw = 0;
  targetYaw = 0;
  floorMessage = '';
  floorMessageTimer = 0;
}

export function update(dt) {
  animTimer += dt;
  updateCooldown(inputCD, dt);
  updateCooldown(moveCD, dt);
  floatingTexts.update(dt);
  updateShake(shake, dt);

  if (stepAnim > 0) stepAnim = Math.max(0, stepAnim - dt * 3);

  // Smooth turning
  if (currentYaw !== targetYaw) {
    const diff = targetYaw - currentYaw;
    currentYaw += diff * Math.min(1, dt * 12);
    if (Math.abs(targetYaw - currentYaw) < 0.01) currentYaw = targetYaw;
  }

  if (gameState === 'title') {
    updateTitle(dt);
  } else if (gameState === 'explore') {
    updateExplore(dt);
  } else if (gameState === 'combat') {
    updateCombat(dt);
  } else if (gameState === 'inventory') {
    updateInventory(dt);
  } else if (gameState === 'gameover') {
    if (keyp('Space') && cooldownReady(inputCD)) {
      useCooldown(inputCD);
      init();
    }
  } else if (gameState === 'victory') {
    if (keyp('Space') && cooldownReady(inputCD)) {
      useCooldown(inputCD);
      init();
    }
  }

  if (floorMessageTimer > 0) floorMessageTimer -= dt;
}

function updateTitle(dt) {
  // Slowly spin camera for title
  const a = animTimer * 0.3;
  setCameraPosition(Math.sin(a) * 8, 3, Math.cos(a) * 8);
  setCameraTarget(0, 1, 0);

  if (keyp('Space') || keyp('Enter')) {
    enterFloor(1);
    gameState = 'explore';
  }
}

function updateExplore(dt) {
  if (!cooldownReady(moveCD)) {
    // still in cooldown, but check non-move inputs
    if (keyp('KeyI') || keyp('Tab')) gameState = 'inventory';
    updateCamera3D();
    return;
  }

  const [dx, dz] = DIRS[facing];

  // Movement
  let moved = false;
  if (key('KeyW') || key('ArrowUp')) {
    moved = tryMove(dx, dz);
  } else if (key('KeyS') || key('ArrowDown')) {
    moved = tryMove(-dx, -dz);
  } else if (key('KeyA')) {
    // Strafe left
    moved = tryMove(dz, -dx);
  } else if (key('KeyD')) {
    // Strafe right
    moved = tryMove(-dz, dx);
  }

  // Turning (keyp for discrete 90° snaps)
  if (keyp('ArrowLeft') || keyp('KeyQ')) {
    facing = (facing + 3) % 4; // turn left
    targetYaw = (facing * Math.PI) / 2;
    moveCD.remaining = moveCD.duration;
  } else if (keyp('ArrowRight') || keyp('KeyE')) {
    facing = (facing + 1) % 4; // turn right
    targetYaw = (facing * Math.PI) / 2;
    moveCD.remaining = moveCD.duration;
  }

  if (keyp('KeyI') || keyp('Tab')) gameState = 'inventory';

  if (moved) moveCD.remaining = moveCD.duration; // reset move cooldown

  updateCamera3D();
}

function updateCombat(dt) {
  if (combatAction === 'enemyTurn') {
    animTimer -= dt;
    if (animTimer <= 0) {
      doEnemyTurn();
    }
    return;
  }

  if (combatAction === 'result') {
    if (keyp('Space') && useCooldown(inputCD)) {
      clearMonsterMeshes();
      if (party.every(m => !m.alive)) {
        gameState = 'gameover';
      } else {
        gameState = 'explore';
        enemies = [];
      }
    }
    return;
  }

  if (combatAction === 'choose' && cooldownReady(inputCD)) {
    const member = party[combatTurn];
    if (keyp('Digit1') || keyp('KeyZ')) {
      useCooldown(inputCD);
      // Attack
      combatAction = 'target';
      selectedTarget = enemies.findIndex(e => e.hp > 0);
    } else if (keyp('Digit2') || keyp('KeyX')) {
      useCooldown(inputCD);
      // Cast spell (if caster)
      if (member.maxMp > 0) {
        combatAction = 'spell';
      }
    } else if (keyp('Digit3') || keyp('KeyC')) {
      useCooldown(inputCD);
      // Defend — skip turn, boost def temporarily
      member.def += 3;
      combatLog.push(`${member.name} defends.`);
      advanceCombatTurn();
    }
  }

  if (combatAction === 'target' && cooldownReady(inputCD)) {
    if (keyp('ArrowUp') || keyp('KeyW')) {
      useCooldown(inputCD);
      // Prev enemy
      for (let i = selectedTarget - 1; i >= 0; i--) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('ArrowDown') || keyp('KeyS')) {
      useCooldown(inputCD);
      // Next enemy
      for (let i = selectedTarget + 1; i < enemies.length; i++) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('Space') || keyp('Enter') || keyp('KeyZ')) {
      useCooldown(inputCD);
      // Confirm attack
      const member = party[combatTurn];
      const target = enemies[selectedTarget];
      const dmg = doAttack(member, target);
      combatLog.push(`${member.name} hits ${target.name} for ${dmg}!`);
      triggerShake(shake, 0.2);

      if (target.hp <= 0) {
        combatLog.push(`${target.name} defeated!`);
        if (target.meshBody) {
          destroyMesh(target.meshBody);
          target.meshBody = null;
        }
      }
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(inputCD);
      combatAction = 'choose';
    }
  }

  if (combatAction === 'spell' && cooldownReady(inputCD)) {
    const member = party[combatTurn];
    const available = Object.values(SPELLS).filter(
      s => s.class === member.class && member.mp >= s.cost
    );

    if (keyp('Digit1') && available.length > 0) {
      useCooldown(inputCD);
      const spell = available[0];
      if (spell.type === 'heal') {
        // Heal lowest HP ally
        const target = party
          .filter(m => m.alive)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const result = doSpell(member, spell, target);
        if (result)
          combatLog.push(
            `${member.name} casts ${spell.name} on ${target.name}! +${spell.amount} HP`
          );
      } else if (spell.type === 'buff') {
        const result = doSpell(member, spell, null);
        if (result)
          combatLog.push(`${member.name} casts ${spell.name}! Party ATK +${spell.amount}`);
      } else {
        const target = enemies.find(e => e.hp > 0);
        const result = doSpell(member, spell, target);
        if (result) combatLog.push(`${member.name} casts ${spell.name}! ${result.dmg} damage!`);
      }
      advanceCombatTurn();
    } else if (keyp('Digit2') && available.length > 1) {
      useCooldown(inputCD);
      const spell = available[1];
      if (spell.type === 'heal') {
        const target = party
          .filter(m => m.alive)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const result = doSpell(member, spell, target);
        if (result)
          combatLog.push(
            `${member.name} casts ${spell.name} on ${target.name}! +${spell.amount} HP`
          );
      } else if (spell.type === 'buff') {
        const result = doSpell(member, spell, null);
        if (result)
          combatLog.push(`${member.name} casts ${spell.name}! Party ATK +${spell.amount}`);
      } else {
        const target = enemies.find(e => e.hp > 0);
        const result = doSpell(member, spell, target);
        if (result) combatLog.push(`${member.name} casts ${spell.name}! ${result.dmg} damage!`);
      }
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(inputCD);
      combatAction = 'choose';
    }
  }
}

function updateInventory(dt) {
  if (keyp('KeyI') || keyp('Tab') || keyp('Escape')) {
    gameState = 'explore';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════════════════

export function draw() {
  if (gameState === 'title') {
    drawTitle();
  } else if (gameState === 'explore') {
    drawExploreHUD();
  } else if (gameState === 'combat') {
    drawCombatUI();
  } else if (gameState === 'inventory') {
    drawInventoryUI();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'victory') {
    drawVictory();
  }
}

function drawTitle() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 180));

  drawGlowText('WIZARDRY', 320, 80, rgba8(255, 200, 50, 255), rgba8(180, 100, 0, 150), 4);
  printCentered('N O V A  6 4', 320, 130, rgba8(200, 160, 80, 255), 2);

  printCentered('Proving Grounds of the Dark Tower', 320, 170, rgba8(150, 130, 110, 255));

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to begin your quest', 320, 240, rgba8(pulse, pulse, pulse, 255));

  // Party preview
  printCentered('Your Party:', 320, 280, rgba8(180, 180, 200, 255));
  for (let i = 0; i < 4; i++) {
    const m = party[i];
    const x = 130 + i * 110;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;
    printCentered(CLASS_ICONS[m.class], x, 300, rgba8(r, g, b, 255), 2);
    printCentered(m.name, x, 320, rgba8(r, g, b, 200));
    printCentered(m.class, x, 332, rgba8(140, 140, 160, 180));
  }
}

function drawExploreHUD() {
  // Compass
  const compassBg = rgba8(0, 0, 0, 160);
  rectfill(280, 4, 80, 18, compassBg);
  printCentered(`Facing ${DIR_NAMES[facing]}`, 320, 8, rgba8(200, 200, 220, 255));

  // Floor indicator
  printCentered(`Floor ${floor}`, 320, 24, rgba8(150, 130, 100, 200));

  // Mini party status (bottom)
  drawPartyBar();

  // Minimap (top-right)
  drawDungeonMinimap();

  // Floor message
  if (floorMessageTimer > 0) {
    const alpha = Math.min(255, Math.floor(floorMessageTimer * 200));
    rectfill(120, 160, 400, 28, rgba8(0, 0, 0, Math.floor(alpha * 0.7)));
    printCentered(floorMessage, 320, 166, rgba8(255, 220, 100, alpha));
  }

  // Controls hint
  print('WASD/Arrows=Move  Q/E=Turn  I=Inventory', 10, 348, rgba8(80, 80, 100, 150));

  // Gold
  print(`Gold: ${totalGold}`, 540, 348, rgba8(220, 180, 50, 200));
}

function drawPartyBar() {
  const barY = H - 52;
  rectfill(0, barY, W, 52, rgba8(10, 8, 15, 220));
  line(0, barY, W, barY, rgba8(60, 50, 40, 200));

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const bx = 10 + i * 158;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;

    // Name + class icon
    print(
      `${CLASS_ICONS[m.class]} ${m.name}`,
      bx,
      barY + 4,
      m.alive ? rgba8(r, g, b, 255) : rgba8(80, 80, 80, 255)
    );

    // HP bar
    if (m.alive) {
      const hpPct = m.hp / m.maxHp;
      const barColor =
        hpPct > 0.5
          ? rgba8(50, 180, 50, 255)
          : hpPct > 0.25
            ? rgba8(200, 180, 30, 255)
            : rgba8(200, 40, 40, 255);
      drawProgressBar(bx, barY + 16, 100, 6, hpPct, barColor, rgba8(30, 20, 20, 255));
      print(`${m.hp}/${m.maxHp}`, bx + 104, barY + 14, rgba8(180, 180, 180, 200));
    } else {
      print('DEAD', bx, barY + 16, rgba8(150, 40, 40, 200));
    }

    // MP bar (if applicable)
    if (m.maxMp > 0 && m.alive) {
      drawProgressBar(
        bx,
        barY + 26,
        100,
        4,
        m.mp / m.maxMp,
        rgba8(50, 80, 200, 255),
        rgba8(20, 20, 30, 255)
      );
      print(`${m.mp}/${m.maxMp}`, bx + 104, barY + 24, rgba8(120, 140, 220, 180));
    }

    // Level
    print(`Lv${m.level}`, bx, barY + 36, rgba8(120, 120, 140, 180));
  }
}

function drawDungeonMinimap() {
  if (!dungeon) return;
  const mmSize = 80;
  const mmX = W - mmSize - 8;
  const mmY = 4;
  const cellSize = Math.max(1, Math.floor(mmSize / Math.max(dungeonW, dungeonH)));

  rectfill(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4, rgba8(0, 0, 0, 180));

  const offsetX = mmX + Math.floor((mmSize - dungeonW * cellSize) / 2);
  const offsetY = mmY + Math.floor((mmSize - dungeonH * cellSize) / 2);

  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      // Only show visited area (within 6 cells of player)
      const dist = Math.abs(x - px) + Math.abs(y - py);
      if (dist > 8) continue;

      const tile = dungeon[y][x];
      const sx = offsetX + x * cellSize;
      const sy = offsetY + y * cellSize;

      if (tile === T.WALL) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(60, 50, 40, 200));
      } else if (tile === T.FLOOR || tile === T.DOOR) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(30, 28, 22, 200));
      } else if (tile === T.STAIRS_DOWN) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(50, 100, 200, 255));
      } else if (tile === T.STAIRS_UP) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(200, 150, 50, 255));
      } else if (tile === T.CHEST) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(200, 180, 50, 255));
      } else if (tile === T.FOUNTAIN) {
        rectfill(sx, sy, cellSize, cellSize, rgba8(50, 120, 255, 255));
      }
    }
  }

  // Player dot
  const ppx = offsetX + px * cellSize;
  const ppy = offsetY + py * cellSize;
  rectfill(ppx, ppy, cellSize, cellSize, rgba8(255, 60, 60, 255));

  // Facing indicator
  const [fdx, fdy] = DIRS[facing];
  const fx = ppx + fdx * cellSize + Math.floor(cellSize / 2);
  const fy = ppy + fdy * cellSize + Math.floor(cellSize / 2);
  pset(fx, fy, rgba8(255, 200, 50, 255));
}

function drawCombatUI() {
  // Dark overlay
  rectfill(0, 0, W, 40, rgba8(10, 5, 15, 200));
  rectfill(0, H - 160, W, 160, rgba8(10, 5, 15, 220));

  // Monster info (top)
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const x = 20 + i * 200;
    const alive = e.hp > 0;
    const nameColor = alive ? rgba8(220, 180, 180, 255) : rgba8(80, 80, 80, 150);
    const sel = combatAction === 'target' && i === selectedTarget;

    print(`${sel ? '► ' : '  '}${e.name}`, x, 6, nameColor);
    if (alive) {
      drawProgressBar(
        x,
        20,
        120,
        6,
        e.hp / e.maxHp,
        rgba8(200, 40, 40, 255),
        rgba8(40, 20, 20, 255)
      );
      print(`${e.hp}/${e.maxHp}`, x + 124, 18, rgba8(180, 140, 140, 200));
    } else {
      print('DEAD', x + 10, 20, rgba8(100, 40, 40, 150));
    }
  }

  // Combat log (middle-bottom)
  const logY = H - 155;
  const logLines = combatLog.slice(-5);
  for (let i = 0; i < logLines.length; i++) {
    const alpha = Math.floor(255 - (5 - i - 1) * 30);
    print(logLines[i], 20, logY + i * 12, rgba8(200, 200, 210, Math.max(80, alpha)));
  }

  // Separator
  line(10, H - 90, W - 10, H - 90, rgba8(60, 50, 70, 200));

  // Current party member + actions
  if (combatTurn < party.length) {
    const member = party[combatTurn];
    const c = CLASS_COLORS[member.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    print(`${CLASS_ICONS[member.class]} ${member.name}'s turn`, 20, H - 82, rgba8(cr, cg, cb, 255));

    if (combatAction === 'choose') {
      print('[1/Z] Attack', 20, H - 62, rgba8(220, 200, 180, 255));
      if (member.maxMp > 0) {
        print(`[2/X] Magic (${member.mp} MP)`, 20, H - 48, rgba8(120, 140, 255, 255));
      }
      print('[3/C] Defend', 20, H - 34, rgba8(180, 180, 140, 255));
    } else if (combatAction === 'target') {
      print(
        'Select target: W/S = cycle, Z/Space = confirm, Esc = back',
        20,
        H - 62,
        rgba8(200, 180, 150, 200)
      );
    } else if (combatAction === 'spell') {
      const available = Object.values(SPELLS).filter(
        s => s.class === member.class && member.mp >= s.cost
      );
      for (let i = 0; i < available.length; i++) {
        const sp = available[i];
        print(
          `[${i + 1}] ${sp.name} (${sp.cost} MP) — ${sp.desc}`,
          20,
          H - 62 + i * 14,
          rgba8(140, 160, 255, 255)
        );
      }
      if (available.length === 0)
        print('No spells available!', 20, H - 62, rgba8(150, 100, 100, 200));
      print('Esc = back', 20, H - 20, rgba8(120, 120, 140, 180));
    } else if (combatAction === 'enemyTurn') {
      printCentered('Enemies attacking...', 320, H - 62, rgba8(200, 100, 100, 255));
    }
  }

  if (combatAction === 'result') {
    const won = enemies.every(e => e.hp <= 0);
    if (won) {
      printCentered('VICTORY!', 320, H - 70, rgba8(255, 220, 50, 255), 2);
    } else {
      printCentered('DEFEAT', 320, H - 70, rgba8(200, 40, 40, 255), 2);
    }
    printCentered('Press SPACE to continue', 320, H - 40, rgba8(180, 180, 200, 200));
  }

  // Party HP along right side
  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = H - 82 + i * 18;
    const isCurrent = i === combatTurn && combatAction !== 'result' && combatAction !== 'enemyTurn';
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    const labelColor = m.alive
      ? isCurrent
        ? rgba8(255, 255, 200, 255)
        : rgba8(cr, cg, cb, 200)
      : rgba8(80, 80, 80, 150);
    print(`${isCurrent ? '►' : ' '} ${m.name}`, W - 200, y, labelColor);
    if (m.alive) {
      drawProgressBar(
        W - 95,
        y + 2,
        60,
        5,
        m.hp / m.maxHp,
        m.hp / m.maxHp > 0.25 ? rgba8(50, 180, 50, 255) : rgba8(200, 40, 40, 255),
        rgba8(30, 20, 20, 255)
      );
      print(`${m.hp}`, W - 30, y, rgba8(180, 180, 180, 200));
    }
  }
}

function drawInventoryUI() {
  rectfill(40, 30, W - 80, H - 60, rgba8(10, 8, 20, 240));
  drawPixelBorder(40, 30, W - 80, H - 60, rgba8(80, 70, 50, 255), rgba8(30, 25, 20, 255));

  printCentered('═══ PARTY STATUS ═══', 320, 40, rgba8(200, 180, 120, 255), 2);

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 80 + i * 60;
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;

    // Name + Class
    print(
      `${CLASS_ICONS[m.class]} ${m.name}  [${m.class}]  Lv ${m.level}`,
      60,
      y,
      rgba8(cr, cg, cb, 255)
    );

    // Stats
    const statColor = rgba8(180, 180, 200, 220);
    print(`HP: ${m.hp}/${m.maxHp}`, 80, y + 14, statColor);
    drawProgressBar(
      160,
      y + 16,
      80,
      5,
      m.hp / m.maxHp,
      rgba8(50, 180, 50, 255),
      rgba8(30, 20, 20, 255)
    );

    if (m.maxMp > 0) {
      print(`MP: ${m.mp}/${m.maxMp}`, 260, y + 14, rgba8(120, 140, 220, 200));
      drawProgressBar(
        340,
        y + 16,
        60,
        5,
        m.mp / m.maxMp,
        rgba8(50, 80, 200, 255),
        rgba8(20, 20, 30, 255)
      );
    }

    print(
      `ATK:${m.atk + m.buffAtk}  DEF:${m.def}  SPD:${m.spd}`,
      80,
      y + 28,
      rgba8(150, 150, 170, 180)
    );
    print(`XP: ${m.xp}/${m.xpNext}`, 320, y + 28, rgba8(150, 150, 170, 180));

    if (!m.alive) {
      print('☠ FALLEN', 480, y, rgba8(200, 40, 40, 255));
    }
  }

  // Gold + Floor info
  print(`Gold: ${totalGold}`, 60, H - 90, rgba8(220, 180, 50, 230));
  print(`Floor: ${floor}`, 200, H - 90, rgba8(150, 150, 170, 200));

  printCentered('Press I / TAB / ESC to close', 320, H - 55, rgba8(120, 120, 150, 180));
}

function drawGameOver() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 200));
  drawGlowText('GAME OVER', 320, 120, rgba8(200, 40, 40, 255), rgba8(100, 0, 0, 150), 3);
  printCentered(`Your party fell on Floor ${floor}`, 320, 180, rgba8(180, 150, 130, 200));
  printCentered(`Gold collected: ${totalGold}`, 320, 200, rgba8(200, 180, 50, 200));

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to try again', 320, 260, rgba8(pulse, pulse, pulse, 255));
}

function drawVictory() {
  rectfill(0, 0, W, H, rgba8(0, 0, 0, 180));
  drawGlowText('VICTORY!', 320, 80, rgba8(255, 220, 50, 255), rgba8(180, 120, 0, 150), 3);
  printCentered('You conquered the Dark Tower!', 320, 140, rgba8(200, 200, 220, 255));
  printCentered(`Gold: ${totalGold}`, 320, 170, rgba8(220, 180, 50, 230));

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const c = CLASS_COLORS[m.class];
    const cr = (c >> 16) & 0xff,
      cg = (c >> 8) & 0xff,
      cb = c & 0xff;
    const y = 200 + i * 16;
    printCentered(
      `${m.name} — Lv${m.level} ${m.class} ${m.alive ? '✓' : '☠'}`,
      320,
      y,
      rgba8(cr, cg, cb, 220)
    );
  }

  const pulse = Math.floor(Math.sin(animTimer * 3) * 60 + 195);
  printCentered('Press SPACE to play again', 320, 300, rgba8(pulse, pulse, pulse, 255));
}
