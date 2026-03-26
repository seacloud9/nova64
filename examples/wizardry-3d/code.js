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
const T = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
  STAIRS_DOWN: 3,
  STAIRS_UP: 4,
  CHEST: 5,
  FOUNTAIN: 6,
  TRAP: 7,
  BOSS: 8,
};

// Character classes
const CLASSES = ['Fighter', 'Mage', 'Priest', 'Thief'];
const CLASS_COLORS = { Fighter: 0xff4444, Mage: 0x4488ff, Priest: 0xffdd44, Thief: 0x44ff88 };
const CLASS_ICONS = { Fighter: '⚔', Mage: '✦', Priest: '✚', Thief: '◆' };

// Monster templates per floor tier — with shape hints for 3D variety
const MONSTERS = [
  // Floor 1-2
  [
    { name: 'Kobold', hp: 8, atk: 3, def: 1, xp: 5, gold: 3, color: 0x886644, shape: 'small' },
    { name: 'Giant Rat', hp: 6, atk: 2, def: 0, xp: 3, gold: 1, color: 0x666655, shape: 'beast' },
    { name: 'Skeleton', hp: 12, atk: 4, def: 2, xp: 8, gold: 5, color: 0xccccaa, shape: 'undead' },
  ],
  // Floor 3-4
  [
    { name: 'Orc', hp: 18, atk: 6, def: 3, xp: 15, gold: 10, color: 0x448833, shape: 'brute' },
    { name: 'Zombie', hp: 22, atk: 5, def: 2, xp: 12, gold: 4, color: 0x556644, shape: 'undead' },
    {
      name: 'Dark Elf',
      hp: 15,
      atk: 8,
      def: 4,
      xp: 20,
      gold: 15,
      color: 0x443366,
      shape: 'caster',
    },
  ],
  // Floor 5+
  [
    { name: 'Troll', hp: 35, atk: 10, def: 5, xp: 30, gold: 20, color: 0x336633, shape: 'brute' },
    { name: 'Wraith', hp: 25, atk: 12, def: 3, xp: 35, gold: 25, color: 0x333355, shape: 'ghost' },
    { name: 'Dragon', hp: 60, atk: 15, def: 8, xp: 80, gold: 50, color: 0xcc4422, shape: 'dragon' },
  ],
];

// Boss monsters (floor 3 and 5)
const BOSSES = {
  3: {
    name: 'Lich King',
    hp: 80,
    atk: 14,
    def: 6,
    xp: 100,
    gold: 60,
    color: 0x6622aa,
    shape: 'caster',
  },
  5: {
    name: 'Ancient Dragon',
    hp: 150,
    atk: 20,
    def: 10,
    xp: 200,
    gold: 100,
    color: 0xff3300,
    shape: 'dragon',
  },
};

// Equipment that can drop from chests
const EQUIPMENT = [
  // Weapons
  { name: 'Iron Sword', slot: 'weapon', atk: 2, def: 0, class: 'Fighter', tier: 1 },
  { name: 'Battle Axe', slot: 'weapon', atk: 3, def: 0, class: 'Fighter', tier: 2 },
  { name: 'Holy Mace', slot: 'weapon', atk: 2, def: 1, class: 'Priest', tier: 1 },
  { name: 'Arcane Staff', slot: 'weapon', atk: 1, def: 0, class: 'Mage', tier: 1, mpBonus: 3 },
  { name: 'Shadow Dagger', slot: 'weapon', atk: 3, def: 0, class: 'Thief', tier: 1 },
  { name: 'Flame Blade', slot: 'weapon', atk: 5, def: 0, class: 'Fighter', tier: 3 },
  { name: 'Staff of Power', slot: 'weapon', atk: 2, def: 0, class: 'Mage', tier: 3, mpBonus: 6 },
  { name: 'Vorpal Dagger', slot: 'weapon', atk: 6, def: 0, class: 'Thief', tier: 3 },
  // Armor
  { name: 'Chain Mail', slot: 'armor', atk: 0, def: 2, class: 'Fighter', tier: 1 },
  { name: 'Leather Armor', slot: 'armor', atk: 0, def: 1, class: 'Thief', tier: 1 },
  { name: 'Mage Robe', slot: 'armor', atk: 0, def: 1, class: 'Mage', tier: 1, mpBonus: 2 },
  { name: 'Plate Armor', slot: 'armor', atk: 0, def: 4, class: 'Fighter', tier: 2 },
  {
    name: 'Blessed Vestments',
    slot: 'armor',
    atk: 0,
    def: 2,
    class: 'Priest',
    tier: 2,
    mpBonus: 3,
  },
  { name: 'Dragon Scale', slot: 'armor', atk: 1, def: 6, class: 'Fighter', tier: 3 },
  { name: 'Shadow Cloak', slot: 'armor', atk: 1, def: 3, class: 'Thief', tier: 3 },
];

// Spells
const SPELLS = {
  // Mage spells
  FIRE: { name: 'Fireball', cost: 3, dmg: 12, type: 'attack', class: 'Mage', desc: 'AoE fire' },
  ICE: { name: 'Ice Bolt', cost: 2, dmg: 8, type: 'attack', class: 'Mage', desc: 'Single target' },
  SHIELD: {
    name: 'Mana Shield',
    cost: 4,
    amount: 4,
    type: 'buff_def',
    class: 'Mage',
    desc: '+DEF party',
  },
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
  REVIVE: {
    name: 'Revive',
    cost: 6,
    amount: 10,
    type: 'revive',
    class: 'Priest',
    desc: 'Revive ally',
  },
};

// Shop items available for purchase
const SHOP_ITEMS = [
  {
    name: 'Healing Potion',
    type: 'potion',
    effect: 'hp',
    amount: 25,
    cost: 15,
    desc: 'Restore 25 HP to one ally',
  },
  {
    name: 'Mana Potion',
    type: 'potion',
    effect: 'mp',
    amount: 10,
    cost: 20,
    desc: 'Restore 10 MP to one ally',
  },
  {
    name: 'Revival Herb',
    type: 'potion',
    effect: 'revive',
    amount: 15,
    cost: 50,
    desc: 'Revive a fallen ally',
  },
  {
    name: 'Party Heal',
    type: 'potion',
    effect: 'party_hp',
    amount: 15,
    cost: 40,
    desc: 'Restore 15 HP to all',
  },
  {
    name: 'Whetstone',
    type: 'buff',
    effect: 'atk',
    amount: 2,
    cost: 30,
    desc: '+2 ATK to one ally for next floor',
  },
  {
    name: 'Iron Shield',
    type: 'buff',
    effect: 'def',
    amount: 2,
    cost: 30,
    desc: '+2 DEF to one ally for next floor',
  },
];

// Floor atmosphere themes
const FLOOR_THEMES = [
  {
    name: 'Musty Cellars',
    wallColor: 0x554433,
    floorColor: 0x332211,
    ceilColor: 0x221100,
    fogColor: 0x0a0805,
    skyTop: 0x110808,
    skyBot: 0x050303,
    ambColor: 0x332211,
    ambInt: 0.3,
  },
  {
    name: 'Flooded Crypts',
    wallColor: 0x334455,
    floorColor: 0x1a2233,
    ceilColor: 0x0a1122,
    fogColor: 0x050a10,
    skyTop: 0x081018,
    skyBot: 0x030508,
    ambColor: 0x223344,
    ambInt: 0.25,
  },
  {
    name: 'Fungal Warrens',
    wallColor: 0x335533,
    floorColor: 0x1a331a,
    ceilColor: 0x0a220a,
    fogColor: 0x050a05,
    skyTop: 0x0a180a,
    skyBot: 0x030803,
    ambColor: 0x224422,
    ambInt: 0.3,
  },
  {
    name: 'Obsidian Vaults',
    wallColor: 0x222233,
    floorColor: 0x111122,
    ceilColor: 0x0a0a18,
    fogColor: 0x050510,
    skyTop: 0x0a0a1a,
    skyBot: 0x030308,
    ambColor: 0x1a1a33,
    ambInt: 0.2,
  },
  {
    name: "The Dragon's Lair",
    wallColor: 0x553322,
    floorColor: 0x331a0a,
    ceilColor: 0x220a00,
    fogColor: 0x100500,
    skyTop: 0x1a0800,
    skyBot: 0x080300,
    ambColor: 0x442211,
    ambInt: 0.35,
  },
];

// State
let gameState; // 'title', 'explore', 'combat', 'inventory', 'gameover', 'victory'
let floor, px, py, facing; // player grid pos + direction (0-3)
let dungeon; // 2D array
let dungeonW, dungeonH;
let torchLights;
let party; // array of party members
let enemies; // current combat encounter
let combatLog;
let combatTurn; // 0..party.length-1 or 'enemy'
let combatAction; // current action selection state
let selectedTarget;
let animTimer; // for transitions
let enemyDelay; // separate timer for enemy turn delay
let autoPlay; // auto-combat mode
let stepAnim; // walking bob
let targetYaw, currentYaw;
let encounterChance;
let totalGold;
let dungeonsCleared;
let floatingTexts;
let shake;
let floorMessage;
let floorMessageTimer;

// Visual state
let screenFlash; // {r, g, b, alpha, decay}
let animatedMeshes; // meshes that bob/rotate
let particleSystems; // track active particle system IDs
let explored; // Set of "x,y" strings for fog-of-war minimap
let bossDefeated; // Set of floor numbers where boss was killed
let minimap; // createMinimap() object for dungeon map
let stateMachine; // createStateMachine for game flow

// Shop state
let shopItems; // current shop inventory
let shopCursor; // selected shop item index
let shopTarget; // which party member to apply item to

// Hit/invulnerability state for party
let hitStates; // array of createHitState per party member
let chromaTimer; // timer for chromatic aberration effect on boss hits
let combatFOV; // smooth FOV lerp for combat zoom
let floorTransition; // checkerboard wipe timer when entering floors
let cooldowns; // createCooldownSet for input + movement

// Spell VFX overlay
let spellVFX; // { type, x, y, timer, color } for drawStarburst/drawRadialGradient

// Visual preset mode (toggled in inventory)
let visualPreset; // null, 'n64', or 'psx'

// Floor message timer (createTimer API)
let msgTimer; // createTimer object for floor messages

// Encounter spawner (createSpawner API) — scales encounter count per floor
let encounterSpawner;

// Combat spark pool (createPool API)
let sparkPool; // pool of {x, y, vx, vy, life, color} for hit sparks

// Water shader tracking (createShaderMaterial API)
let waterShaders; // array of { shaderId, meshId } for animated fountain water

// 3D floating damage texts (drawFloatingTexts3D API)
let floatingTexts3D; // separate system for world-space damage numbers

// Instanced dungeon decorations (createInstancedMesh API)
let instancedDecor; // instanced mesh ID for floor crystal decorations

// Boss flow field energy pattern (flowField API)
let bossFlowField; // Float32Array of angles for boss room visualization

// Procedural floor fog texture (noiseMap API)
let floorNoiseMap; // Float32Array for deep floor atmospheric overlay

// 3D mesh tracking
let currentLevelMeshes = [];
let monsterMeshes = [];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

// Transition game state via state machine for elapsed tracking
function switchState(newState) {
  gameState = newState;
  if (stateMachine) stateMachine.switchTo(newState);
}

// State elapsed time (seconds in current state)
function stateElapsed() {
  return stateMachine ? stateMachine.getElapsed() : animTimer;
}

// Project 3D world coordinates to 2D screen for drawFloatingTexts3D
function worldToScreen(wx, wy, wz) {
  const cx = px * TILE,
    cz = py * TILE,
    cy = 1.6;
  const [fdx, fdz] = DIRS[facing];
  const dx = wx - cx,
    dy = wy - cy,
    dz = wz - cz;
  const depth = dx * fdx + dz * fdz;
  if (depth <= 0.1) return [W / 2, H / 2];
  const right = dx * -fdz + dz * fdx;
  const halfFOV = Math.tan(((combatFOV || 75) * Math.PI) / 360);
  const sx = W / 2 + (right / (depth * halfFOV)) * (W / 2);
  const sy = H / 2 - (dy / (depth * halfFOV * (H / W))) * (H / 2);
  return [sx, sy];
}

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

  // Scatter chests, fountains, and traps
  for (let i = 0; i < 3 + floor; i++) {
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    const cx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
    const cy = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
    if (map[cy][cx] === T.FLOOR) {
      const roll = Math.random();
      if (roll < 0.5) map[cy][cx] = T.CHEST;
      else if (roll < 0.7) map[cy][cx] = T.FOUNTAIN;
      else map[cy][cx] = T.TRAP;
    }
  }

  // Place boss room on floors 3 and 5 (in a large room near stairs)
  if ((floor === 3 || floor === 5) && rooms.length > 2 && !bossDefeated.has(floor)) {
    const bossRoom = rooms[rooms.length - 2]; // room before last
    const bx = bossRoom.x + Math.floor(bossRoom.w / 2);
    const by = bossRoom.y + Math.floor(bossRoom.h / 2);
    if (map[by][bx] === T.FLOOR) map[by][bx] = T.BOSS;
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
  clearSkybox(); // clean up old skybox before rebuilding
  if (torchLights) {
    for (const id of torchLights) removeLight(id);
  }
  torchLights = [];
  // Clean up particle systems
  if (particleSystems) {
    for (const id of particleSystems) removeParticleSystem(id);
  }
  particleSystems = [];
  // Clean up instanced decorations before rebuilding
  if (instancedDecor) {
    removeInstancedMesh(instancedDecor);
    instancedDecor = null;
  }
  floorNoiseMap = null; // regenerate noiseMap fog per floor
  waterShaders = [];
  clearMonsterMeshes();
}

function clearMonsterMeshes() {
  for (const id of monsterMeshes) destroyMesh(id);
  monsterMeshes = [];
}

function buildLevel() {
  clearLevel();

  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];

  // Update atmosphere per floor
  setAmbientLight(theme.ambColor, theme.ambInt);
  setFog(theme.fogColor, 2, 20 - floor);
  // Dragon's Lair gets a dramatic space skybox; other floors use gradient
  if (floor === 5) {
    createSpaceSkybox({ starCount: 600, nebula: true });
  } else {
    createGradientSkybox(theme.skyTop, theme.skyBot);
  }
  // Set directional light angle per floor for varied shadow casting
  const lightAngle = -0.8 - floor * 0.1;
  setDirectionalLight([0.3, lightAngle, -0.5], theme.ambColor, 0.6 + floor * 0.08);
  // Vary skybox rotation speed per floor depth
  setSkyboxSpeed(0.2 + floor * 0.1);

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
          const m = createCube(TILE, theme.wallColor, [wx, TILE / 2, wz], { roughness: 0.9 });
          currentLevelMeshes.push(m);
        }
      } else {
        // Floor — receives shadows from walls, objects, and monsters
        const f = createPlane(TILE, TILE, theme.floorColor, [wx, 0.01, wz]);
        rotateMesh(f, -HALF_PI, 0, 0);
        setReceiveShadow(f, true);
        currentLevelMeshes.push(f);

        // Ceiling
        const c = createPlane(TILE, TILE, theme.ceilColor, [wx, TILE, wz]);
        rotateMesh(c, HALF_PI, 0, 0);
        currentLevelMeshes.push(c);

        // Special tiles
        if (tile === T.DOOR) {
          // Wooden door frame
          const d = createCube(TILE * 0.1, 0x886622, [wx, TILE / 2, wz], { roughness: 0.7 });
          setScale(d, 1, 1, 0.3);
          currentLevelMeshes.push(d);
          // Door handle
          const handle = createSphere(0.08, 0xccaa44, [wx + 0.3, TILE * 0.45, wz], 4, {
            material: 'emissive',
            emissive: 0xccaa44,
            emissiveIntensity: 0.3,
          });
          currentLevelMeshes.push(handle);
          setPBRProperties(handle, { metalness: 0.9, roughness: 0.2 });
        } else if (tile === T.STAIRS_DOWN) {
          const s = createCone(0.5, 1, 0x44aaff, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0x44aaff,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
          // Stair glow particles
          const ps = createParticleSystem(20, {
            size: 0.08,
            emissive: true,
            gravity: 0.2,
            emitRate: 3,
            minLife: 1,
            maxLife: 2,
            minSpeed: 0.2,
            maxSpeed: 0.5,
            startColor: 0x44aaff,
            endColor: 0x0044aa,
            spread: 0.8,
          });
          setParticleEmitter(ps, { position: [wx, 0.5, wz] });
          particleSystems.push(ps);
          const l = createPointLight(0x44aaff, 1.5, 8, wx, 1.5, wz);
          torchLights.push(l);
        } else if (tile === T.STAIRS_UP) {
          const s = createCone(0.5, 1, 0xffaa44, [wx, 0.5, wz], {
            material: 'emissive',
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
          });
          currentLevelMeshes.push(s);
          animatedMeshes.push({ id: s, type: 'bob', baseY: 0.5, speed: 2, range: 0.2 });
        } else if (tile === T.CHEST) {
          // Chest body
          const ch = createCube(0.6, 0xddaa33, [wx, 0.35, wz], { roughness: 0.4, metallic: true });
          setScale(ch, 1, 0.7, 0.7);
          currentLevelMeshes.push(ch);
          // Glowing lock
          const lock = createSphere(0.06, 0xffee66, [wx, 0.5, wz - 0.22], 4, {
            material: 'emissive',
            emissive: 0xffee66,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(lock);
          setPBRProperties(lock, { metalness: 1.0, roughness: 0.1 });
          animatedMeshes.push({ id: lock, type: 'pulse', baseScale: 1, speed: 3, range: 0.3 });
        } else if (tile === T.FOUNTAIN) {
          const fb = createCylinder(0.6, 0.6, 0x667788, 8, [wx, 0.2, wz]);
          currentLevelMeshes.push(fb);
          const fw = createSphere(0.3, 0x3388ff, [wx, 0.5, wz], 6, {
            material: 'emissive',
            emissive: 0x3388ff,
            emissiveIntensity: 0.6,
          });
          currentLevelMeshes.push(fw);
          animatedMeshes.push({ id: fw, type: 'bob', baseY: 0.5, speed: 1.5, range: 0.15 });
          // Apply animated water shader via createShaderMaterial
          const wShader = createShaderMaterial('water');
          if (wShader) {
            const rawMesh = getMesh(fw);
            if (rawMesh) rawMesh.material = wShader.material;
            waterShaders.push({ shaderId: wShader.id, meshId: fw });
          }
          // Water particles
          const ps = createParticleSystem(15, {
            size: 0.05,
            emissive: true,
            gravity: -0.3,
            emitRate: 4,
            minLife: 0.8,
            maxLife: 1.5,
            minSpeed: 0.1,
            maxSpeed: 0.3,
            startColor: 0x3388ff,
            endColor: 0x1144aa,
            spread: 0.4,
          });
          setParticleEmitter(ps, { position: [wx, 0.6, wz] });
          particleSystems.push(ps);
          const l = createPointLight(0x3388ff, 1, 6, wx, 1, wz);
          torchLights.push(l);
        } else if (tile === T.TRAP) {
          // Trap - subtle floor glyph
          const trap = createPlane(1.2, 1.2, 0x662222, [wx, 0.02, wz]);
          rotateMesh(trap, -HALF_PI, 0, 0);
          currentLevelMeshes.push(trap);
          // Warning rune
          const rune = createTorus(0.3, 0.04, 0x881111, 6, [wx, 0.03, wz]);
          rotateMesh(rune, HALF_PI, 0, 0);
          currentLevelMeshes.push(rune);
          animatedMeshes.push({ id: rune, type: 'spin', speed: 1 });
        } else if (tile === T.BOSS) {
          // Boss marker — ominous pillar with glow
          const pillar = createCylinder(0.4, 2.5, 0x440022, 6, [wx, 1.25, wz]);
          currentLevelMeshes.push(pillar);
          const orb = createSphere(0.3, 0xff0044, [wx, 2.6, wz], 8, {
            material: 'emissive',
            emissive: 0xff0044,
            emissiveIntensity: 1.2,
          });
          currentLevelMeshes.push(orb);
          animatedMeshes.push({ id: orb, type: 'pulse', baseScale: 1, speed: 2, range: 0.4 });
          setPBRProperties(pillar, { metalness: 0.7, roughness: 0.3 });
          const l = createPointLight(0xff0044, 2, 10, wx, 2, wz);
          torchLights.push(l);
        }

        // Scatter torches with particle fire
        if (tile === T.FLOOR && Math.random() < 0.04) {
          const l = createPointLight(0xff8833, 1.2, 10, wx, 2.2, wz);
          torchLights.push({ lightId: l, baseIntensity: 1.2, wx, wz });
          const torch = createCone(0.1, 0.3, 0xff6600, [wx, 2.5, wz], {
            material: 'emissive',
            emissive: 0xff6600,
            emissiveIntensity: 1.0,
          });
          currentLevelMeshes.push(torch);
          // Fire particles
          const ps = createParticleSystem(12, {
            size: 0.06,
            emissive: true,
            gravity: -0.5,
            emitRate: 6,
            minLife: 0.3,
            maxLife: 0.7,
            minSpeed: 0.3,
            maxSpeed: 0.6,
            startColor: 0xff6600,
            endColor: 0xff2200,
            spread: 0.2,
          });
          setParticleEmitter(ps, { position: [wx, 2.6, wz] });
          particleSystems.push(ps);
          // Track light for flickering
          torchLights.push({ lightId: l, baseIntensity: 1.2, wx, wz });
        }
      }
    }
  }

  // Instanced crystal decorations scattered on floors (createInstancedMesh)
  const crystalPositions = [];
  for (let y = 0; y < dungeonH; y++) {
    for (let x = 0; x < dungeonW; x++) {
      if (dungeon[y][x] === T.FLOOR && Math.random() < 0.025) {
        crystalPositions.push([x * TILE, 0.15, y * TILE]);
      }
    }
  }
  if (crystalPositions.length > 0) {
    instancedDecor = createInstancedMesh('cone', crystalPositions.length, theme.wallColor, {
      size: 0.2,
    });
    for (let i = 0; i < crystalPositions.length; i++) {
      const [cx, cy, cz] = crystalPositions[i];
      const rot = Math.random() * TWO_PI;
      setInstanceTransform(instancedDecor, i, cx, cy, cz, 0, rot, 0, 0.12, 0.25, 0.12);
      setInstanceColor(instancedDecor, i, theme.ambColor);
    }
    finalizeInstances(instancedDecor);
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
    buffDef: 0,
    buffTimer: 0,
    weapon: null,
    armor: null,
  };
}

function getEffectiveAtk(c) {
  let atk = c.atk + c.buffAtk;
  if (c.weapon) atk += c.weapon.atk;
  return atk;
}

function getEffectiveDef(c) {
  let def = c.def + c.buffDef;
  if (c.armor) def += c.armor.def;
  return def;
}

function equipItem(member, item) {
  const slot = item.slot;
  const old = member[slot];
  member[slot] = item;
  // Apply MP bonuses
  if (item.mpBonus) {
    member.maxMp += item.mpBonus;
    member.mp = Math.min(member.mp + item.mpBonus, member.maxMp);
  }
  if (old && old.mpBonus) {
    member.maxMp -= old.mpBonus;
    member.mp = Math.min(member.mp, member.maxMp);
  }
  return old;
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

function startCombat(isBoss) {
  let count, pool;
  if (isBoss && BOSSES[floor]) {
    // Boss encounter
    const b = BOSSES[floor];
    enemies = [
      {
        ...b,
        maxHp: b.hp,
        id: 0,
        isBoss: true,
      },
    ];
    count = 1;
  } else {
    const tier = Math.min(Math.floor((floor - 1) / 2), MONSTERS.length - 1);
    pool = MONSTERS[tier];
    // Use spawner wave count to scale encounters as player explores
    if (encounterSpawner) {
      encounterSpawner.wave++;
      encounterSpawner.totalSpawned++;
    }
    const waveBonus = encounterSpawner ? Math.min(encounterSpawner.wave, 3) : 0;
    count = 1 + randInt(0, Math.min(3, floor) - 1) + Math.floor(waveBonus / 2);
    count = Math.min(count, 4); // cap at 4 enemies
    enemies = [];
    for (let i = 0; i < count; i++) {
      const template = pool[randInt(0, pool.length - 1)];
      const scale = randRange(0.8, 1.2);
      enemies.push({
        ...template,
        hp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
        maxHp: Math.floor(template.hp * scale * (1 + floor * 0.1)),
        atk: Math.floor(template.atk * (1 + floor * 0.08)),
        def: template.def,
        id: i,
      });
    }
  }

  // Create varied monster meshes in front of player
  clearMonsterMeshes();
  const [dx, dz] = DIRS[facing];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const offset = (i - (enemies.length - 1) / 2) * 1.5;
    const perpX = -dz,
      perpZ = dx; // perpendicular
    const mx = px * TILE + dx * 4 + perpX * offset;
    const mz = py * TILE + dz * 4 + perpZ * offset;

    // Use dist3d to compute monster distance from player for combat info
    e.distFromPlayer = dist3d(px * TILE, 1.6, py * TILE, mx, 1, mz);

    const meshIds = createMonsterMesh(e, mx, mz, dx, dz);
    monsterMeshes.push(...meshIds);
    e.meshBody = meshIds[0];
    e.allMeshes = meshIds;
  }

  const waveLabel =
    encounterSpawner && encounterSpawner.wave > 1 ? ` [Wave ${encounterSpawner.wave}]` : '';
  combatLog = [
    enemies[0].isBoss
      ? `BOSS: ${enemies[0].name} blocks your path!`
      : `${enemies.length} ${enemies.length > 1 ? 'monsters appear' : enemies[0].name + ' appears'}!${waveLabel}`,
  ];
  combatTurn = 0;
  combatAction = 'choose';
  selectedTarget = 0;
  switchState('combat');
  setVolume(0.8); // louder for combat intensity

  if (enemies[0].isBoss) {
    triggerShake(shake, 0.8);
    triggerScreenFlash(255, 0, 50, 200);
    enableChromaticAberration(0.006);
    setBloomStrength(1.8); // intensify bloom for boss encounter
    setBloomRadius(0.6); // wider bloom spread for boss drama
    // Burst particles on all visible particle systems for boss entrance
    for (const psId of particleSystems) burstParticles(psId, 12);
    // Generate flow field energy pattern for boss room visualization
    bossFlowField = flowField(16, 12, 0.08, animTimer);
  }
}

// Create varied 3D monster based on shape type
function createMonsterMesh(e, mx, mz, dx, dz) {
  const ids = [];
  const s = e.isBoss ? 1.5 : 1.0;
  const shape = e.shape || 'small';

  if (shape === 'beast') {
    // Low, wide body with ears
    const body = createCube(0.8 * s, e.color, [mx, 0.5 * s, mz], { roughness: 0.8 });
    setScale(body, 1.3, 0.7, 1);
    const ear1 = createCone(0.15 * s, 0.4 * s, e.color, [mx - 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const ear2 = createCone(0.15 * s, 0.4 * s, e.color, [mx + 0.3 * s, 0.9 * s, mz], {
      roughness: 0.8,
    });
    const eye1 = createSphere(
      0.08 * s,
      0xff0000,
      [mx - 0.2 * s, 0.6 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.08 * s,
      0xff0000,
      [mx + 0.2 * s, 0.6 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, ear1, ear2, eye1, eye2);
  } else if (shape === 'undead') {
    // Tall thin body with skull-like head
    const body = createCube(0.6 * s, e.color, [mx, 0.8 * s, mz], { roughness: 0.9 });
    setScale(body, 0.7, 1.3, 0.5);
    const head = createSphere(0.35 * s, e.color, [mx, 1.6 * s, mz], 6, { roughness: 0.9 });
    const eye1 = createSphere(
      0.1 * s,
      0x44ff00,
      [mx - 0.12 * s, 1.7 * s, mz - dz * 0.3 - dx * 0.3],
      4,
      {
        material: 'emissive',
        emissive: 0x44ff00,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.1 * s,
      0x44ff00,
      [mx + 0.12 * s, 1.7 * s, mz - dz * 0.3 - dx * 0.3],
      4,
      {
        material: 'emissive',
        emissive: 0x44ff00,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, eye1, eye2);
  } else if (shape === 'brute') {
    // Large bulky body with thick arms
    const body = createCube(1.0 * s, e.color, [mx, 0.9 * s, mz], { roughness: 0.7 });
    setScale(body, 1.2, 1.4, 0.9);
    const head = createSphere(0.4 * s, e.color, [mx, 1.8 * s, mz], 6);
    const arm1 = createCylinder(0.2 * s, 1.0 * s, e.color, 6, [mx - 0.8 * s, 1.0 * s, mz]);
    const arm2 = createCylinder(0.2 * s, 1.0 * s, e.color, 6, [mx + 0.8 * s, 1.0 * s, mz]);
    const eye1 = createSphere(
      0.12 * s,
      0xff2200,
      [mx - 0.15 * s, 1.9 * s, mz - dz * 0.35 - dx * 0.35],
      4,
      {
        material: 'emissive',
        emissive: 0xff2200,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.12 * s,
      0xff2200,
      [mx + 0.15 * s, 1.9 * s, mz - dz * 0.35 - dx * 0.35],
      4,
      {
        material: 'emissive',
        emissive: 0xff2200,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, arm1, arm2, eye1, eye2);
  } else if (shape === 'ghost') {
    // Translucent floating form — capsule body for ethereal silhouette
    const body = createCapsule(0.5 * s, 0.8 * s, e.color, [mx, 1.2 * s, mz], {
      material: 'emissive',
      emissive: e.color,
      emissiveIntensity: 0.4,
    });
    setMeshOpacity(body, 0.6);
    const tail = createCone(0.5 * s, 1.2 * s, e.color, [mx, 0.3 * s, mz]);
    setMeshOpacity(tail, 0.4);
    const eye1 = createSphere(
      0.15 * s,
      0xaabbff,
      [mx - 0.2 * s, 1.4 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xaabbff,
        emissiveIntensity: 1.5,
      }
    );
    const eye2 = createSphere(
      0.15 * s,
      0xaabbff,
      [mx + 0.2 * s, 1.4 * s, mz - dz * 0.4 - dx * 0.4],
      4,
      {
        material: 'emissive',
        emissive: 0xaabbff,
        emissiveIntensity: 1.5,
      }
    );
    ids.push(body, tail, eye1, eye2);
    // Ghosts shouldn't cast shadows — ethereal beings
    for (const id of ids) setCastShadow(id, false);
    animatedMeshes.push({ id: body, type: 'bob', baseY: 1.2 * s, speed: 1.5, range: 0.3 });
  } else if (shape === 'caster') {
    // Robed figure with glowing staff
    const body = createCone(0.5 * s, 1.8 * s, e.color, [mx, 0.9 * s, mz], { roughness: 0.8 });
    const head = createSphere(0.3 * s, e.color, [mx, 2.0 * s, mz], 6);
    const staff = createCylinder(0.05 * s, 2.2 * s, 0x886633, 4, [mx + 0.5 * s, 1.1 * s, mz]);
    const orb = createSphere(0.15 * s, 0xff44ff, [mx + 0.5 * s, 2.3 * s, mz], 6, {
      material: 'emissive',
      emissive: 0xff44ff,
      emissiveIntensity: 1.2,
    });
    const eye1 = createSphere(
      0.08 * s,
      0xff00ff,
      [mx - 0.1 * s, 2.1 * s, mz - dz * 0.25 - dx * 0.25],
      4,
      {
        material: 'emissive',
        emissive: 0xff00ff,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.08 * s,
      0xff00ff,
      [mx + 0.1 * s, 2.1 * s, mz - dz * 0.25 - dx * 0.25],
      4,
      {
        material: 'emissive',
        emissive: 0xff00ff,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, staff, orb, eye1, eye2);
    animatedMeshes.push({ id: orb, type: 'pulse', baseScale: 1, speed: 2, range: 0.3 });
  } else if (shape === 'dragon') {
    // Multi-part dragon: body, neck, head, wings, tail
    const body = createCube(1.2 * s, e.color, [mx, 1.0 * s, mz], { roughness: 0.6 });
    setScale(body, 1.4, 0.8, 1.8);
    const neck = createCylinder(0.25 * s, 0.8 * s, e.color, 6, [
      mx,
      1.6 * s,
      mz - dz * 0.6 - dx * 0.6,
    ]);
    rotateMesh(neck, 0.4, 0, 0);
    const head = createCube(0.5 * s, e.color, [mx, 2.0 * s, mz - dz * 1.0 - dx * 1.0]);
    setScale(head, 1, 0.6, 1.5);
    // Wings
    const wing1 = createPlane(1.5 * s, 1.0 * s, e.color, [mx - 1.0 * s, 1.5 * s, mz]);
    rotateMesh(wing1, 0, 0, -0.3);
    const wing2 = createPlane(1.5 * s, 1.0 * s, e.color, [mx + 1.0 * s, 1.5 * s, mz]);
    rotateMesh(wing2, 0, 0, 0.3);
    // Eyes
    const eye1 = createSphere(
      0.12 * s,
      0xffaa00,
      [mx - 0.15 * s, 2.15 * s, mz - dz * 1.3 - dx * 1.3],
      4,
      {
        material: 'emissive',
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
      }
    );
    const eye2 = createSphere(
      0.12 * s,
      0xffaa00,
      [mx + 0.15 * s, 2.15 * s, mz - dz * 1.3 - dx * 1.3],
      4,
      {
        material: 'emissive',
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
      }
    );
    ids.push(body, neck, head, wing1, wing2, eye1, eye2);
  } else {
    // Default: small humanoid (kobold, etc.)
    const body = createCube(0.8 * s, e.color, [mx, 0.7 * s, mz], { roughness: 0.8 });
    setScale(body, 0.8, 1.0, 0.6);
    const head = createSphere(0.25 * s, e.color, [mx, 1.3 * s, mz], 6);
    const eye1 = createSphere(
      0.1 * s,
      0xff0000,
      [mx - 0.1 * s, 1.4 * s, mz - dz * 0.2 - dx * 0.2],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    const eye2 = createSphere(
      0.1 * s,
      0xff0000,
      [mx + 0.1 * s, 1.4 * s, mz - dz * 0.2 - dx * 0.2],
      4,
      {
        material: 'emissive',
        emissive: 0xff0000,
        emissiveIntensity: 1,
      }
    );
    ids.push(body, head, eye1, eye2);
  }

  // Apply N64-style flat shading to monster body mesh for retro low-poly look
  if (ids.length > 0) setFlatShading(ids[0], true);

  return ids;
}

function doAttack(attacker, defender) {
  const variance = 0.7 + Math.random() * 0.6;
  const atkVal = attacker.weapon
    ? getEffectiveAtk(attacker)
    : attacker.atk + (attacker.buffAtk || 0);
  const defVal = defender.armor
    ? getEffectiveDef(defender)
    : defender.def + (defender.buffDef || 0);
  const raw = Math.floor(atkVal * variance);
  const dmg = Math.max(1, raw - defVal);
  defender.hp -= dmg;
  if (defender.hp <= 0) defender.hp = 0;
  return dmg;
}

// Spawn hit sparks at a screen position using createPool
function spawnSparks(x, y, color, count) {
  if (!sparkPool) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * TWO_PI;
    const spd = 30 + Math.random() * 60;
    sparkPool.spawn(s => {
      s.x = x + (Math.random() - 0.5) * 10;
      s.y = y + (Math.random() - 0.5) * 10;
      s.vx = Math.cos(ang) * spd;
      s.vy = Math.sin(ang) * spd;
      s.life = 0.4 + Math.random() * 0.3;
      s.color = color;
    });
  }
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
  if (spell.type === 'buff_def') {
    for (const m of party) {
      if (m.alive) {
        m.buffDef += spell.amount;
        m.buffTimer = 5;
      }
    }
    return { type: 'buff_def', amount: spell.amount };
  }
  if (spell.type === 'revive') {
    // Find first dead ally
    const dead = party.find(m => !m.alive);
    if (!dead) return null;
    dead.alive = true;
    dead.hp = spell.amount;
    return { type: 'revive', target: dead };
  }
  if (spell.type === 'attack' || spell.type === 'undead') {
    if (spell.name === 'Ice Bolt') {
      // Single target
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      target.hp = Math.max(0, target.hp - dmg);
      triggerScreenFlash(80, 150, 255, 150);
      sfx({ wave: 'triangle', freq: 800, dur: 0.3, sweep: -400 }); // icy descend
      return { type: 'damage', dmg, targets: [target] };
    }
    // AoE
    let totalDmg = 0;
    const targets = enemies.filter(e => e.hp > 0);
    for (const e of targets) {
      const dmg = spell.dmg + Math.floor(Math.random() * 4);
      e.hp = Math.max(0, e.hp - dmg);
      totalDmg += dmg;
    }
    if (spell.name === 'Fireball') {
      triggerScreenFlash(255, 120, 30, 180);
      sfx({ wave: 'sawtooth', freq: 200, dur: 0.5, sweep: 100 }); // fire roar
    } else if (spell.name === 'Turn Undead') {
      triggerScreenFlash(255, 255, 180, 150);
      sfx({ wave: 'sine', freq: 600, dur: 0.4, sweep: 200 }); // holy chime
    }
    // Use circleCollision for AoE range validation log
    const aoeRange = 3;
    const inAoE = enemies.filter(
      e =>
        e.hp > 0 && circleCollision(px, py, aoeRange, px + Math.random(), py + Math.random(), 0.5)
    );
    return { type: 'damage', dmg: totalDmg, targets, aoeHits: inAoE.length };
  }
  return null;
}

function triggerScreenFlash(r, g, b, alpha) {
  screenFlash = { r, g, b, alpha, decay: 6 };
}

function castSpellInCombat(member, spell) {
  if (spell.type === 'heal') {
    const target = party.filter(m => m.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const result = doSpell(member, spell, target);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name} on ${target.name}! +${spell.amount} HP`);
      triggerScreenFlash(50, 255, 100, 80);
      sfx({ wave: 'sine', freq: 400, dur: 0.5, sweep: 200 }); // gentle heal chime
      spellVFX = { type: 'radial', x: 320, y: 180, timer: 0.5, color: rgba8(50, 255, 100, 160) };
    }
  } else if (spell.type === 'buff') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party ATK +${spell.amount}`);
    triggerScreenFlash(255, 220, 80, 80);
    sfx({ wave: 'square', freq: 300, dur: 0.3, sweep: 150 }); // power-up buff
    spellVFX = { type: 'radial', x: 320, y: 100, timer: 0.6, color: rgba8(255, 220, 80, 180) };
  } else if (spell.type === 'buff_def') {
    const result = doSpell(member, spell, null);
    if (result) combatLog.push(`${member.name} casts ${spell.name}! Party DEF +${spell.amount}`);
    triggerScreenFlash(80, 150, 255, 80);
    spellVFX = { type: 'radial', x: 320, y: 100, timer: 0.6, color: rgba8(80, 150, 255, 180) };
  } else if (spell.type === 'revive') {
    const result = doSpell(member, spell, null);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! ${result.target.name} revived!`);
      triggerScreenFlash(255, 255, 200, 120);
    } else {
      combatLog.push('No fallen allies to revive.');
      member.mp += spell.cost; // refund
    }
  } else {
    const target = enemies.find(e => e.hp > 0);
    const result = doSpell(member, spell, target);
    if (result) {
      combatLog.push(`${member.name} casts ${spell.name}! ${result.dmg} damage!`);
      setBloomStrength(2.0); // spike bloom during spell VFX
      // Burst particles for spell visual impact
      for (const psId of particleSystems) burstParticles(psId, 6);
      // Starburst VFX for attack spells
      if (spell.name === 'Fireball') {
        spellVFX = { type: 'star', x: 320, y: 80, timer: 0.8, color: rgba8(255, 120, 30, 220) };
      } else if (spell.name === 'Ice Bolt') {
        spellVFX = { type: 'star', x: 200, y: 80, timer: 0.6, color: rgba8(80, 180, 255, 220) };
      } else if (spell.name === 'Turn Undead') {
        spellVFX = { type: 'star', x: 320, y: 80, timer: 0.7, color: rgba8(255, 255, 180, 220) };
      }
    }
  }
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
    sfx('powerup');
    triggerScreenFlash(255, 220, 100, 100);

    // Disable boss effects when combat ends
    if (enemies.some(e => e.isBoss)) {
      bossDefeated.add(floor);
      combatLog.push('The boss has been slain!');
      disableChromaticAberration();
      bossFlowField = null; // clear boss energy field
    }
    setBloomStrength(1.0); // restore normal bloom after combat
    setBloomRadius(0.4); // restore normal bloom radius

    // Distribute XP and check level ups
    for (const m of party) {
      if (!m.alive) continue;
      m.xp += totalXP;
      while (m.xp >= m.xpNext) {
        m.xp -= m.xpNext;
        levelUp(m);
        combatLog.push(`${m.name} leveled up to ${m.level}!`);
        sfx('coin');
      }
    }

    // Remove dead monster meshes
    for (const e of enemies) {
      if (e.allMeshes) {
        for (const id of e.allMeshes) destroyMesh(id);
        e.allMeshes = null;
        e.meshBody = null;
      }
    }

    saveGame();
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
    enemyDelay = 0.5;
  } else {
    combatAction = 'choose';
    selectedTarget = enemies.findIndex(e => e.hp > 0);
  }
}

function doEnemyTurn() {
  const [dx, dz] = DIRS[facing];
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Lunge forward animation using moveMesh
    if (e.meshBody) moveMesh(e.meshBody, -dx * 0.5, 0, -dz * 0.5);
    // Pick random alive party member
    const alive = party.filter(m => m.alive);
    if (alive.length === 0) break;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const dmg = doAttack(e, target);
    combatLog.push(`${e.name} hits ${target.name} for ${dmg}!`);
    triggerShake(shake, 0.3);
    triggerScreenFlash(255, 50, 50, 100);
    sfx('hit');
    const ti = party.indexOf(target);
    // Trigger hit state (invulnerability flash)
    if (hitStates && hitStates[ti]) triggerHit(hitStates[ti]);
    // Boss hits trigger chromatic aberration
    if (e.isBoss) {
      enableChromaticAberration(0.008);
      chromaTimer = 0.4;
    }
    floatingTexts.spawn(`-${dmg}`, W - 180 + ti * 10, H - 80 + ti * 18, {
      color: rgba8(255, 50, 50, 255),
      scale: 2,
      vy: -30,
    });

    if (target.hp <= 0) {
      target.alive = false;
      combatLog.push(`${target.name} falls!`);
      sfx('death');
    }
    // Lunge back after attack
    if (e.meshBody) moveMesh(e.meshBody, dx * 0.5, 0, dz * 0.5);
  }

  // Tick buffs
  for (const m of party) {
    if (m.buffTimer > 0) {
      m.buffTimer--;
      if (m.buffTimer <= 0) {
        m.buffAtk = 0;
        m.buffDef = 0;
      }
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
  revealAround(px, py);

  // Interact with special tiles
  if (tile === T.DOOR) {
    dungeon[nz][nx] = T.FLOOR;
    showFloorMessage('Door opened!');
    sfx('select');
  } else if (tile === T.STAIRS_DOWN) {
    // Open merchant shop before descending (floor 2+)
    if (floor >= 1) {
      openShop(floor + 1);
    } else {
      enterFloor(floor + 1);
    }
    sfx('powerup');
    return true;
  } else if (tile === T.STAIRS_UP) {
    if (floor > 1) {
      enterFloor(floor - 1);
      sfx('powerup');
    } else {
      showFloorMessage('The surface is sealed...');
      sfx('error');
    }
    return true;
  } else if (tile === T.CHEST) {
    dungeon[nz][nx] = T.FLOOR;
    // Burst particles on chest open for satisfying feedback
    if (particleSystems.length > 0) {
      burstParticles(particleSystems[0], 8, { position: [nx * TILE, 1, nz * TILE] });
    }
    // Chance for equipment drop based on floor tier
    if (Math.random() < 0.4) {
      const tierItems = EQUIPMENT.filter(e => e.tier <= Math.ceil(floor / 2));
      if (tierItems.length > 0) {
        const item = tierItems[Math.floor(Math.random() * tierItems.length)];
        // Find matching party member or any alive member
        const target =
          party.find(m => m.alive && m.class === item.class && !m[item.slot]) ||
          party.find(m => m.alive && m.class === item.class);
        if (target) {
          equipItem(target, item);
          showFloorMessage(`${target.name} found ${item.name}!`);
          triggerScreenFlash(255, 220, 50, 120);
          sfx('powerup');
        } else {
          const goldAmount = 10 + Math.floor(Math.random() * 10 * floor);
          totalGold += goldAmount;
          showFloorMessage(`Found chest: +${goldAmount} Gold!`);
          sfx('coin');
        }
      }
    } else {
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
    }
  } else if (tile === T.FOUNTAIN) {
    // Restore party AND revive dead members
    let revived = false;
    for (const m of party) {
      if (!m.alive) {
        m.alive = true;
        m.hp = Math.floor(m.maxHp * 0.5);
        revived = true;
      }
      if (m.alive) {
        m.hp = m.maxHp;
        m.mp = m.maxMp;
      }
    }
    // Fountain cleansing — briefly disable vignette for a "refreshed" visual
    disableVignette();
    setTimeout(() => enableVignette(1.4, 0.8), 1200);
    showFloorMessage(
      revived ? 'Fountain revives and restores the party!' : 'Fountain restores the party!'
    );
    triggerScreenFlash(50, 130, 255, 100);
    sfx('coin');
  } else if (tile === T.TRAP) {
    dungeon[nz][nx] = T.FLOOR;
    // Thief can detect and disarm
    const thief = party.find(m => m.alive && m.class === 'Thief');
    if (thief && Math.random() < 0.5 + thief.level * 0.1) {
      showFloorMessage(`${thief.name} disarmed a trap!`);
      sfx('select');
    } else {
      const trapDmg = 3 + floor * 2;
      for (const m of party) {
        if (m.alive) {
          m.hp = Math.max(1, m.hp - trapDmg);
        }
      }
      showFloorMessage(`Trap! Party takes ${trapDmg} damage each!`);
      triggerScreenFlash(255, 50, 50, 180);
      triggerShake(shake, 0.5);
      sfx('explosion');
    }
  } else if (tile === T.BOSS) {
    dungeon[nz][nx] = T.FLOOR;
    startCombat(true);
    sfx('error');
    return true;
  }

  // Random encounter — use dist() for distance-based scaling from start
  const startDist = dist(px, py, dungeonW / 2, dungeonH / 2);
  const distFactor = remap(Math.min(startDist, 15), 0, 15, 0.5, 1.5);
  encounterChance += (0.08 + floor * 0.02) * distFactor;
  if (Math.random() < encounterChance) {
    encounterChance = 0;
    startCombat(false);
    sfx('error');
  }

  return true;
}

function enterFloor(newFloor) {
  floor = newFloor;
  facing = 0;
  encounterChance = 0;
  explored = new Set(); // reset fog of war per floor

  if (floor > 5) {
    // Victory!
    switchState('victory');
    showFloorMessage('You conquered the dungeon!');
    sfx('powerup');
    return;
  }

  floorTransition = 1.2; // checkerboard wipe effect when entering new floor
  noiseSeed(floor * 42 + 7); // consistent noise patterns per floor
  dungeon = generateDungeon(18 + floor * 2, 18 + floor * 2);
  buildLevel();

  // Deeper floors get retro pixelation for a more ominous, degraded look
  if (floor >= 4) enablePixelation(2);
  else if (floor >= 3) enablePixelation(1);
  else enablePixelation(0); // disabled on early floors

  // Richer noise detail on deeper floors for more complex fog wisps
  noiseDetail(Math.min(2 + floor, 6), 0.5);

  // Dynamic bloom tuning per floor — deeper = tighter, more intense bloom
  const bloomRad = remap(floor, 1, 5, 0.5, 0.25);
  const bloomThresh = remap(floor, 1, 5, 0.3, 0.15);
  setBloomRadius(bloomRad);
  setBloomThreshold(bloomThresh);
  targetYaw = facing * HALF_PI;
  currentYaw = targetYaw;
  updateCamera3D();
  revealAround(px, py); // reveal starting area
  rebuildMinimap();
  const theme = FLOOR_THEMES[Math.min(floor - 1, FLOOR_THEMES.length - 1)];
  showFloorMessage(`Floor ${floor} — ${theme.name}`);

  // Create encounter spawner for this floor (scales enemy count per wave)
  encounterSpawner = createSpawner({
    waveInterval: 999, // we trigger manually via steps, not time
    baseCount: 1 + Math.floor(floor / 2),
    countGrowth: 1,
    maxCount: 3 + floor,
    spawnFn: null, // we read .wave to scale encounters
  });
  encounterSpawner.active = false; // triggered manually on combat start

  saveGame();
}

function rebuildMinimap() {
  minimap = createMinimap({
    x: W - 90,
    y: 4,
    width: 82,
    height: 82,
    tileW: dungeonW,
    tileH: dungeonH,
    tileScale: Math.max(1, Math.floor(80 / Math.max(dungeonW, dungeonH))),
    bgColor: rgba8(0, 0, 0, 200),
    borderLight: rgba8(50, 40, 30, 200),
    borderDark: rgba8(20, 15, 10, 200),
    fogOfWar: 4,
    follow: {
      get x() {
        return px;
      },
      get y() {
        return py;
      },
    },
    player: {
      get x() {
        return px;
      },
      get y() {
        return py;
      },
      color: rgba8(255, 60, 60, 255),
      blink: true,
    },
    tiles(tx, ty) {
      if (!explored.has(`${tx},${ty}`)) return null;
      const tile = dungeon[ty][tx];
      if (tile === T.WALL) return rgba8(60, 50, 40, 220);
      if (tile === T.STAIRS_DOWN) return rgba8(50, 100, 200, 255);
      if (tile === T.STAIRS_UP) return rgba8(200, 150, 50, 255);
      if (tile === T.CHEST) return rgba8(200, 180, 50, 255);
      if (tile === T.FOUNTAIN) return rgba8(50, 120, 255, 255);
      if (tile === T.BOSS) return rgba8(200, 0, 50, 255);
      return rgba8(30, 28, 22, 180);
    },
  });
}

function revealAround(cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const nx = cx + dx,
        ny = cy + dy;
      if (nx >= 0 && nx < dungeonW && ny >= 0 && ny < dungeonH) {
        explored.add(`${nx},${ny}`);
      }
    }
  }
}

function showFloorMessage(msg) {
  floorMessage = msg;
  floorMessageTimer = 3.0;
}

// ═══════════════════════════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════════════════════════

function hasSave() {
  return loadData('wizardry-save') !== null;
}

function saveGame() {
  const data = {
    party: party.map(m => ({
      name: m.name,
      class: m.class,
      hp: m.hp,
      maxHp: m.maxHp,
      mp: m.mp,
      maxMp: m.maxMp,
      atk: m.atk,
      def: m.def,
      spd: m.spd,
      level: m.level,
      xp: m.xp,
      xpNext: m.xpNext,
      alive: m.alive,
      buffAtk: m.buffAtk,
      buffDef: m.buffDef,
      buffTimer: m.buffTimer,
      weapon: m.weapon ? { ...m.weapon } : null,
      armor: m.armor ? { ...m.armor } : null,
    })),
    floor,
    px,
    py,
    facing,
    totalGold,
    bossDefeated: [...bossDefeated],
    dungeon,
    dungeonW,
    dungeonH,
    explored: [...explored],
    encounterChance,
  };
  saveData('wizardry-save', data);
}

function loadGameSave() {
  const data = loadData('wizardry-save');
  if (!data) return false;
  party = data.party;
  floor = data.floor;
  px = data.px;
  py = data.py;
  facing = data.facing;
  totalGold = data.totalGold;
  bossDefeated = new Set(data.bossDefeated || []);
  dungeon = data.dungeon;
  dungeonW = data.dungeonW;
  dungeonH = data.dungeonH;
  explored = new Set(data.explored || []);
  encounterChance = data.encounterChance || 0;

  targetYaw = facing * HALF_PI;
  currentYaw = targetYaw;
  buildLevel();
  updateCamera3D();
  rebuildMinimap();
  switchState('explore');
  showFloorMessage(`Floor ${floor} — Game Loaded`);
  sfx('confirm');
  return true;
}

function deleteSave() {
  deleteData('wizardry-save');
}

// ═══════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════

function updateCamera3D() {
  const [dx, dz] = DIRS[facing];
  const wx = px * TILE,
    wz = py * TILE;
  const bob = Math.sin(stepAnim * TWO_PI * 2) * 0.1 * Math.max(0, stepAnim);
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
  stateMachine = createStateMachine('title');
  animTimer = 0;
  enemyDelay = 0;
  autoPlay = false;

  setAmbientLight(0x221111, 0.4);
  setLightDirection(0, -1, 0);
  setLightColor(0x443322);
  setFog(0x000000, 2, 18);
  setCameraFOV(75);

  setVolume(0.6); // default exploration volume
  enableRetroEffects({
    bloom: { strength: 1.0, radius: 0.4, threshold: 0.25 },
    vignette: { darkness: 1.4, offset: 0.8 },
    fxaa: true,
    dithering: true,
  });
  // Fine-tune bloom per init (will be adjusted per floor in enterFloor)
  setBloomRadius(0.4);
  setBloomThreshold(0.25);
  createGradientSkybox(0x110808, 0x050303);
  enableSkyboxAutoAnimate(0.3); // slow atmospheric skybox rotation

  shake = createShake({ decay: 5 });
  cooldowns = createCooldownSet({ input: 0.15, move: 0.18 });
  floatingTexts = createFloatingTextSystem();

  // Start new game data but stay on title
  party = createParty();
  floor = 0;
  totalGold = 0;
  dungeonsCleared = 0;
  stepAnim = 0;
  currentYaw = 0;
  targetYaw = 0;
  floorMessage = '';
  floorMessageTimer = 0;
  screenFlash = null;
  animatedMeshes = [];
  particleSystems = [];
  explored = new Set();
  bossDefeated = new Set();
  hitStates = party.map(() => createHitState({ invulnDuration: 0.6, blinkRate: 8 }));
  combatFOV = 75; // smooth FOV for combat zoom
  floorTransition = 0; // timer for checkerboard floor entry effect
  chromaTimer = 0;
  spellVFX = null;
  visualPreset = null;
  msgTimer = createTimer(3.0);
  msgTimer.done = true; // start inactive
  sparkPool = createPool(30, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: 0 }));
  floatingTexts3D = createFloatingTextSystem();
  instancedDecor = null;
  bossFlowField = null;
  floorNoiseMap = null;
  waterShaders = [];
  currentLevelMeshes = [];
  monsterMeshes = [];
}

export function update(dt) {
  animTimer += dt;
  if (stateMachine) stateMachine.update(dt);
  updateCooldowns(cooldowns, dt);
  floatingTexts.update(dt);
  if (floatingTexts3D) floatingTexts3D.update(dt);
  updateShake(shake, dt);
  updateParticles(dt);

  // Tick hit state timers (invulnerability + flash)
  if (hitStates) {
    for (const hs of hitStates) updateHitState(hs, dt);
  }

  // Smooth FOV transitions (lerp toward target)
  const targetFOV = gameState === 'combat' && enemies && enemies[0] && enemies[0].isBoss ? 65 : 75;
  combatFOV = lerp(combatFOV, targetFOV, Math.min(1, dt * 3));
  setCameraFOV(combatFOV);

  // Floor transition timer
  if (floorTransition > 0) floorTransition -= dt;

  // Update spark pool (combat hit sparks)
  if (sparkPool) {
    sparkPool.forEach(s => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt; // gravity
      s.life -= dt;
      if (s.life <= 0) sparkPool.kill(s);
    });
  }

  if (stepAnim > 0) stepAnim = Math.max(0, stepAnim - dt * 3);

  // Screen flash decay
  if (screenFlash) {
    screenFlash.alpha -= screenFlash.decay * dt * 60;
    if (screenFlash.alpha <= 0) screenFlash = null;
  }

  // Chromatic aberration timer (boss hit effect)
  if (chromaTimer > 0) {
    chromaTimer -= dt;
    if (chromaTimer <= 0) {
      chromaTimer = 0;
      // Only disable if not in active boss combat
      if (gameState !== 'combat' || !enemies || !enemies.some(e => e.isBoss && e.hp > 0)) {
        disableChromaticAberration();
      }
    }
  }

  // Animate special meshes (bob, pulse, spin)
  if (animatedMeshes) {
    for (const am of animatedMeshes) {
      if (am.type === 'bob') {
        const y = am.baseY + Math.sin(animTimer * am.speed) * am.range;
        const pos = getPosition(am.id);
        if (pos) setPosition(am.id, pos[0], y, pos[2]);
      } else if (am.type === 'pulse') {
        const s = am.baseScale + Math.sin(animTimer * am.speed) * am.range;
        setScale(am.id, s, s, s);
      } else if (am.type === 'spin') {
        rotateMesh(am.id, 0, dt * am.speed, 0);
        // Use getRotation to query spin state — reverse direction when past full rotation
        const rot = getRotation(am.id);
        if (rot && rot.y > TWO_PI) setRotation(am.id, rot.x, 0, rot.z);
      }
    }
  }

  // Torch light flicker + position sway using setPointLightPosition
  if (torchLights) {
    for (const t of torchLights) {
      if (t && t.lightId) {
        // Flicker by randomly varying color temperature
        setPointLightColor(t.lightId, Math.random() > 0.9 ? 0xff6600 : 0xff8833);
        // Subtle position sway for living flame feel
        const swayX = t.wx + Math.sin(animTimer * 3 + t.wz) * 0.08;
        const swayZ = t.wz + Math.cos(animTimer * 2.5 + t.wx) * 0.08;
        setPointLightPosition(t.lightId, swayX, 2.2 + Math.sin(animTimer * 4) * 0.05, swayZ);
      }
    }
  }

  // Animate water shader uniforms (createShaderMaterial + updateShaderUniform)
  if (waterShaders) {
    for (const ws of waterShaders) {
      updateShaderUniform(ws.shaderId, 'time', animTimer);
    }
  }

  // Ambient single-particle emission — occasional dust motes near player
  if (gameState === 'explore' && particleSystems.length > 0 && Math.random() < 0.03) {
    emitParticle(particleSystems[0], {
      position: [px * TILE + randRange(-2, 2), randRange(0.5, 2.5), py * TILE + randRange(-2, 2)],
    });
  }

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
  } else if (gameState === 'shop') {
    updateShop(dt);
  } else if (gameState === 'gameover') {
    if (keyp('Space') && cooldownReady(cooldowns.input)) {
      useCooldown(cooldowns.input);
      init();
    }
  } else if (gameState === 'victory') {
    if (keyp('Space') && cooldownReady(cooldowns.input)) {
      useCooldown(cooldowns.input);
      init();
    }
  }

  if (floorMessageTimer > 0) floorMessageTimer -= dt;

  // Update spell VFX timer
  if (spellVFX) {
    spellVFX.timer -= dt;
    if (spellVFX.timer <= 0) {
      spellVFX = null;
      setBloomStrength(1.0); // restore bloom after spell VFX fades
    }
  }

  // Update message timer
  if (msgTimer && !msgTimer.done) msgTimer.update(dt);
}

function updateTitle(dt) {
  // Slowly spin camera for title
  const a = animTimer * 0.3;
  setCameraPosition(Math.sin(a) * 8, 3, Math.cos(a) * 8);
  setCameraTarget(0, 1, 0);

  if (keyp('KeyC') && hasSave()) {
    loadGameSave();
  } else if (keyp('Space') || keyp('Enter')) {
    deleteSave();
    enterFloor(1);
    switchState('explore');
    sfx('confirm');
  }
}

function updateExplore(dt) {
  if (!cooldownReady(cooldowns.move)) {
    // still in cooldown, but check non-move inputs
    if (keyp('KeyI') || keyp('Tab')) switchState('inventory');
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
    targetYaw = facing * HALF_PI;
    cooldowns.move.remaining = cooldowns.move.duration;
  } else if (keyp('ArrowRight') || keyp('KeyE')) {
    facing = (facing + 1) % 4; // turn right
    targetYaw = facing * HALF_PI;
    cooldowns.move.remaining = cooldowns.move.duration;
  }

  if (keyp('KeyI') || keyp('Tab')) switchState('inventory');

  if (moved) cooldowns.move.remaining = cooldowns.move.duration; // reset move cooldown

  updateCamera3D();
}

function updateCombat(dt) {
  if (combatAction === 'enemyTurn') {
    enemyDelay -= dt;
    if (enemyDelay <= 0) {
      doEnemyTurn();
    }
    return;
  }

  if (combatAction === 'result') {
    if (keyp('Space') && useCooldown(cooldowns.input)) {
      clearMonsterMeshes();
      setVolume(0.6); // quieter in exploration
      if (party.every(m => !m.alive)) {
        switchState('gameover');
      } else {
        switchState('explore');
        enemies = [];
      }
    }
    return;
  }

  // Toggle auto-play
  if (keyp('KeyA')) {
    autoPlay = !autoPlay;
    combatLog.push(autoPlay ? 'AUTO-COMBAT ON' : 'AUTO-COMBAT OFF');
  }

  if (combatAction === 'choose' && cooldownReady(cooldowns.input)) {
    const member = party[combatTurn];

    // Auto-play: automatically attack a random living enemy
    if (autoPlay) {
      useCooldown(cooldowns.input);
      const target = enemies.filter(e => e.hp > 0);
      if (target.length > 0) {
        const t = target[Math.floor(Math.random() * target.length)];
        const dmg = doAttack(member, t);
        combatLog.push(`${member.name} hits ${t.name} for ${dmg}!`);
        triggerShake(shake, 0.2);
        const sparkX = 100 + t.id * 160;
        spawnSparks(sparkX, 30, rgba8(255, 200, 80, 255), 5);
        floatingTexts.spawn(`-${dmg}`, sparkX, 40, {
          color: rgba8(255, 80, 80, 255),
          scale: 2,
          vy: -40,
        });
        if (t.hp <= 0) {
          combatLog.push(`${t.name} defeated!`);
          if (t.allMeshes) {
            for (const id of t.allMeshes) setMeshVisible(id, false);
            const meshesToDestroy = [...t.allMeshes];
            setTimeout(() => {
              for (const id of meshesToDestroy) destroyMesh(id);
            }, 400);
            t.allMeshes = null;
            t.meshBody = null;
          }
        }
      }
      advanceCombatTurn();
    } else if (keyp('Digit1') || keyp('KeyZ')) {
      useCooldown(cooldowns.input);
      // Attack
      combatAction = 'target';
      selectedTarget = enemies.findIndex(e => e.hp > 0);
    } else if (keyp('Digit2') || keyp('KeyX')) {
      useCooldown(cooldowns.input);
      // Cast spell (if caster)
      if (member.maxMp > 0) {
        combatAction = 'spell';
      }
    } else if (keyp('Digit3') || keyp('KeyC')) {
      useCooldown(cooldowns.input);
      // Defend — skip turn, boost def temporarily
      member.buffDef += 3;
      member.buffTimer = Math.max(member.buffTimer, 2);
      combatLog.push(`${member.name} defends.`);
      advanceCombatTurn();
    }
  }

  if (combatAction === 'target' && cooldownReady(cooldowns.input)) {
    // Mouse click targeting — click on enemy name area at top
    if (mousePressed()) {
      const mx = mouseX(),
        my = mouseY();
      if (my < 40) {
        for (let i = 0; i < enemies.length; i++) {
          const ex = 20 + i * 200;
          if (enemies[i].hp > 0 && mx >= ex && mx < ex + 180) {
            selectedTarget = i;
            break;
          }
        }
      }
    }
    if (keyp('ArrowUp') || keyp('KeyW')) {
      useCooldown(cooldowns.input);
      // Prev enemy
      for (let i = selectedTarget - 1; i >= 0; i--) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('ArrowDown') || keyp('KeyS')) {
      useCooldown(cooldowns.input);
      // Next enemy
      for (let i = selectedTarget + 1; i < enemies.length; i++) {
        if (enemies[i].hp > 0) {
          selectedTarget = i;
          break;
        }
      }
    } else if (keyp('Space') || keyp('Enter') || keyp('KeyZ')) {
      useCooldown(cooldowns.input);
      // Confirm attack
      const member = party[combatTurn];
      const target = enemies[selectedTarget];
      const dmg = doAttack(member, target);
      combatLog.push(`${member.name} hits ${target.name} for ${dmg}!`);
      triggerShake(shake, 0.2);
      sfx('hit');
      const tgtX = 100 + selectedTarget * 160;
      spawnSparks(tgtX, 30, rgba8(255, 200, 80, 255), 6);
      floatingTexts.spawn(`-${dmg}`, tgtX, 40, {
        color: rgba8(255, 80, 80, 255),
        scale: 2,
        vy: -40,
      });
      // 3D floating damage above monster in world space (drawFloatingTexts3D)
      if (floatingTexts3D && target.meshBody) {
        const mpos = getPosition(target.meshBody);
        if (mpos) {
          floatingTexts3D.spawn(`-${dmg}`, mpos[0], mpos[1] + 1.5, {
            z: mpos[2],
            color: 0xff5533,
            scale: 2,
            vy: 2,
          });
        }
      }

      if (target.hp <= 0) {
        combatLog.push(`${target.name} defeated!`);
        sfx('explosion');
        triggerScreenFlash(255, 200, 50, 120);
        if (target.allMeshes) {
          // Blink out death animation: hide meshes, then destroy after delay
          for (const id of target.allMeshes) setMeshVisible(id, false);
          const meshesToDestroy = [...target.allMeshes];
          setTimeout(() => {
            for (const id of meshesToDestroy) destroyMesh(id);
          }, 400);
          target.allMeshes = null;
          target.meshBody = null;
        }
      }
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(cooldowns.input);
      combatAction = 'choose';
    }
  }

  if (combatAction === 'spell' && cooldownReady(cooldowns.input)) {
    const member = party[combatTurn];
    const available = Object.values(SPELLS).filter(
      s => s.class === member.class && member.mp >= s.cost
    );

    if (keyp('Digit1') && available.length > 0) {
      useCooldown(cooldowns.input);
      const spell = available[0];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Digit2') && available.length > 1) {
      useCooldown(cooldowns.input);
      const spell = available[1];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Digit3') && available.length > 2) {
      useCooldown(cooldowns.input);
      const spell = available[2];
      sfx('laser');
      castSpellInCombat(member, spell);
      advanceCombatTurn();
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(cooldowns.input);
      combatAction = 'choose';
    }
  }
}

function updateInventory(dt) {
  if (keyp('KeyI') || keyp('Tab') || keyp('Escape')) {
    setVolume(0.6); // restore exploration volume
    switchState('explore');
  }
  if (keyp('KeyS')) {
    saveGame();
    showFloorMessage('Game saved!');
    sfx('confirm');
  }
  // Toggle visual preset mode: V cycles null → n64 → psx → minimal → null
  if (keyp('KeyV')) {
    if (!visualPreset) {
      visualPreset = 'n64';
      enableN64Mode();
      enableFXAA();
      showFloorMessage('N64 Mode enabled');
    } else if (visualPreset === 'n64') {
      visualPreset = 'psx';
      disablePresetMode();
      enablePSXMode();
      enableFXAA();
      showFloorMessage('PSX Mode enabled');
    } else if (visualPreset === 'psx') {
      visualPreset = 'lowpoly';
      disablePresetMode();
      enableLowPolyMode();
      enableFXAA();
      showFloorMessage('Low-Poly Mode enabled');
    } else if (visualPreset === 'lowpoly') {
      visualPreset = 'dithered';
      disablePresetMode();
      enableDithering(true);
      showFloorMessage('Dithered Mode enabled');
    } else if (visualPreset === 'dithered') {
      visualPreset = 'minimal';
      enableDithering(false);
      disablePresetMode();
      disableBloom();
      disableFXAA();
      if (isEffectsEnabled()) showFloorMessage('Minimal Mode — effects disabled');
      else showFloorMessage('Minimal Mode — no post-FX');
    } else {
      visualPreset = null;
      disablePresetMode();
      enableRetroEffects({
        bloom: { strength: 1.0, radius: 0.4, threshold: 0.25 },
        vignette: { darkness: 1.4, offset: 0.8 },
        fxaa: true,
        dithering: true,
      });
      showFloorMessage('Default mode restored');
    }
    sfx('select');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SHOP SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function openShop(nextFloor) {
  shopItems = SHOP_ITEMS.map(item => ({
    ...item,
    // Scale costs with floor
    cost: item.cost + Math.floor(item.cost * (nextFloor - 2) * 0.2),
  }));
  shopCursor = 0;
  shopTarget = -1; // -1 = browsing, 0+ = selecting party member
  switchState('shop');
  setVolume(0.5); // quieter in shop
  setBloomRadius(0.6); // softer bloom in shop atmosphere
  setBloomThreshold(0.35);
  clearFog(); // no fog in the merchant area — bright and welcoming
  createSolidSkybox(0x1a1020); // dark merchant atmosphere
  disableSkyboxAutoAnimate(); // still skybox in shop
  sfx('coin');
}

function applyShopItem(item, target) {
  if (item.effect === 'hp') {
    target.hp = Math.min(target.hp + item.amount, target.maxHp);
    showFloorMessage(`${target.name} restored ${item.amount} HP!`);
  } else if (item.effect === 'mp') {
    target.mp = Math.min(target.mp + item.amount, target.maxMp);
    showFloorMessage(`${target.name} restored ${item.amount} MP!`);
  } else if (item.effect === 'revive') {
    if (!target.alive) {
      target.alive = true;
      target.hp = item.amount;
      showFloorMessage(`${target.name} has been revived!`);
    } else {
      showFloorMessage(`${target.name} is already alive!`);
      return false; // refund
    }
  } else if (item.effect === 'party_hp') {
    for (const m of party) {
      if (m.alive) m.hp = Math.min(m.hp + item.amount, m.maxHp);
    }
    showFloorMessage(`Party restored ${item.amount} HP each!`);
  } else if (item.effect === 'atk') {
    target.buffAtk += item.amount;
    target.buffTimer = 99; // lasts until cleared
    showFloorMessage(`${target.name} gained +${item.amount} ATK!`);
  } else if (item.effect === 'def') {
    target.buffDef += item.amount;
    target.buffTimer = 99;
    showFloorMessage(`${target.name} gained +${item.amount} DEF!`);
  }
  return true;
}

function updateShop(dt) {
  if (!cooldownReady(cooldowns.input)) return;

  if (shopTarget >= 0) {
    // Selecting party member target
    if (keyp('ArrowUp') || keyp('KeyW')) {
      useCooldown(cooldowns.input);
      shopTarget = (shopTarget + party.length - 1) % party.length;
    } else if (keyp('ArrowDown') || keyp('KeyS')) {
      useCooldown(cooldowns.input);
      shopTarget = (shopTarget + 1) % party.length;
    } else if (keyp('Space') || keyp('Enter') || keyp('KeyZ')) {
      useCooldown(cooldowns.input);
      const item = shopItems[shopCursor];
      const target = party[shopTarget];
      // Validate: revive only on dead, hp/mp/buff only on alive
      if (item.effect === 'revive' && target.alive) {
        showFloorMessage(`${target.name} is already alive!`);
        sfx('error');
      } else if (item.effect !== 'revive' && item.effect !== 'party_hp' && !target.alive) {
        showFloorMessage(`${target.name} has fallen...`);
        sfx('error');
      } else {
        if (applyShopItem(item, target)) {
          totalGold -= item.cost;
          sfx('coin');
          triggerScreenFlash(50, 200, 100, 80);
        }
      }
      shopTarget = -1;
    } else if (keyp('Escape') || keyp('Backspace')) {
      useCooldown(cooldowns.input);
      shopTarget = -1;
    }
    return;
  }

  // Browsing items
  if (keyp('ArrowUp') || keyp('KeyW')) {
    useCooldown(cooldowns.input);
    shopCursor = (shopCursor + shopItems.length - 1) % shopItems.length;
  } else if (keyp('ArrowDown') || keyp('KeyS')) {
    useCooldown(cooldowns.input);
    shopCursor = (shopCursor + 1) % shopItems.length;
  } else if (keyp('Space') || keyp('Enter') || keyp('KeyZ')) {
    useCooldown(cooldowns.input);
    const item = shopItems[shopCursor];
    if (totalGold < item.cost) {
      showFloorMessage('Not enough gold!');
      sfx('error');
    } else if (item.effect === 'party_hp') {
      // Party-wide items apply immediately, no target needed
      if (applyShopItem(item, null)) {
        totalGold -= item.cost;
        sfx('coin');
        triggerScreenFlash(50, 200, 100, 80);
      }
    } else {
      // Need to pick a target
      shopTarget = 0;
    }
  } else if (keyp('Escape') || keyp('Backspace') || keyp('KeyX')) {
    useCooldown(cooldowns.input);
    // Leave shop → continue to next floor
    setVolume(0.6); // restore exploration volume
    setBloomRadius(0.4); // restore exploration bloom
    setBloomThreshold(0.25);
    // Fog will be restored in enterFloor → buildLevel
    const nextFloor = floor + 1;
    enterFloor(nextFloor);
    switchState('explore');
    sfx('confirm');
  }
}

function drawShopUI() {
  drawGradient(0, 0, W, H, rgba8(8, 5, 20, 200), rgba8(20, 15, 5, 200));

  drawPanel(60, 20, W - 120, H - 40, {
    bgColor: rgba8(15, 12, 25, 240),
    borderLight: rgba8(120, 100, 50, 255),
    borderDark: rgba8(40, 30, 15, 255),
  });

  drawGlowText('MERCHANT', 320, 32, rgba8(220, 180, 50, 255), rgba8(140, 100, 0, 100), 3);
  drawDiamond(472, 40, 4, 5, rgba8(255, 220, 50, 255));
  // Use setTextAlign + drawText for gold display
  setTextAlign('right');
  drawText(`${totalGold}g`, 560, 36, rgba8(255, 220, 50, 255));
  setTextAlign('left');
  printCentered(`Floor ${floor} → ${floor + 1}`, 320, 68, rgba8(150, 140, 120, 200));

  // Item list with gradient rect backgrounds
  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i];
    const y = 90 + i * 28;
    const sel = i === shopCursor && shopTarget < 0;
    const canAfford = totalGold >= item.cost;

    // Gradient highlight for selected/affordable items
    if (sel) {
      drawGradientRect(72, y - 2, 488, 18, rgba8(60, 40, 20, 150), rgba8(30, 20, 10, 50));
    }

    const nameColor = sel
      ? rgba8(255, 255, 200, 255)
      : canAfford
        ? rgba8(200, 200, 220, 220)
        : rgba8(100, 100, 110, 150);
    const costColor = canAfford ? rgba8(220, 180, 50, 220) : rgba8(120, 80, 40, 150);

    print(`${sel ? '►' : ' '} ${item.name}`, 80, y, nameColor);
    print(`${item.cost}g`, 320, y, costColor);
    print(item.desc, 370, y, rgba8(140, 140, 160, 180));
  }

  // Target selection overlay
  if (shopTarget >= 0) {
    drawPanel(180, 120, 280, 140, {
      bgColor: rgba8(10, 8, 20, 250),
      borderLight: rgba8(100, 80, 50, 255),
      borderDark: rgba8(30, 25, 15, 255),
    });
    printCentered('Select target:', 320, 128, rgba8(200, 180, 120, 255));
    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      const y = 148 + i * 24;
      const sel = i === shopTarget;
      const c = CLASS_COLORS[m.class];
      const cr = (c >> 16) & 0xff,
        cg = (c >> 8) & 0xff,
        cb = c & 0xff;
      const nameColor = sel ? rgba8(255, 255, 200, 255) : rgba8(cr, cg, cb, 200);
      print(`${sel ? '►' : ' '} ${m.name}`, 200, y, nameColor);
      print(
        m.alive ? `HP:${m.hp}/${m.maxHp}` : '☠ FALLEN',
        340,
        y,
        m.alive ? rgba8(150, 180, 150, 200) : rgba8(180, 50, 50, 200)
      );
    }
    print('Z/Space=Confirm  Esc=Back', 200, 248, rgba8(100, 100, 120, 150));
  }

  // Controls
  printCentered(
    'W/S=Browse  Z/Space=Buy  ESC=Continue to next floor',
    320,
    H - 55,
    rgba8(120, 120, 150, 200)
  );
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
  } else if (gameState === 'shop') {
    drawShopUI();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'victory') {
    drawVictory();
  }

  // Boss flow field energy overlay (flowField API)
  if (
    bossFlowField &&
    gameState === 'combat' &&
    enemies &&
    enemies.length > 0 &&
    enemies[0].isBoss &&
    enemies[0].hp > 0
  ) {
    const cols = 16,
      rows = 12;
    const cellW = W / cols,
      cellH = H / rows;
    // Regenerate flow field with time for flowing animation
    bossFlowField = flowField(cols, rows, 0.08, animTimer * 0.5);
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols,
        row = Math.floor(i / cols);
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;
      const angle = bossFlowField[i];
      const len = 8;
      const ex = cx + Math.cos(angle) * len;
      const ey = cy + Math.sin(angle) * len;
      const alpha = Math.floor(20 + Math.sin(animTimer * 3 + i * 0.3) * 10);
      line(
        Math.floor(cx),
        Math.floor(cy),
        Math.floor(ex),
        Math.floor(ey),
        rgba8(200, 50, 80, alpha)
      );
    }
  }

  // Spell VFX overlay (starburst for attacks, radial gradient for buffs/heals)
  if (spellVFX) {
    const alpha = Math.min(1, spellVFX.timer * 3);
    if (spellVFX.type === 'star') {
      const r = 30 + (1 - alpha) * 40;
      // HSB hue-cycling glow ring around spell impact using hsb()
      const hueShift = animTimer * 200 + spellVFX.timer * 400;
      circle(
        spellVFX.x,
        spellVFX.y,
        Math.floor(r + 8),
        hsb(hueShift, 0.8, 0.6, Math.floor(alpha * 100))
      );
      drawStarburst(spellVFX.x, spellVFX.y, r, r * 0.4, 8, spellVFX.color);
      // Bezier arc spell trail — curved energy arc from caster to impact
      const arcProgress = 1 - alpha;
      bezier(
        50,
        H - 120,
        120,
        spellVFX.y - 80 * arcProgress,
        spellVFX.x - 60,
        spellVFX.y - 40,
        spellVFX.x,
        spellVFX.y,
        spellVFX.color,
        30
      );
    } else if (spellVFX.type === 'radial') {
      const r = 40 + (1 - alpha) * 60;
      drawRadialGradient(spellVFX.x, spellVFX.y, r, spellVFX.color, rgba8(0, 0, 0, 0));
      // Quadratic bezier energy arc for buff/heal spells (quadCurve)
      const arcAlpha = Math.floor(alpha * 180);
      quadCurve(
        100,
        H - 100,
        spellVFX.x,
        spellVFX.y - 60 * alpha,
        spellVFX.x,
        spellVFX.y,
        lerpColor(spellVFX.color, hsb(120, 0.6, 1, arcAlpha), 0.4),
        20
      );
    }
  }

  // Screen flash overlay using drawFlash API (damage, magic, discoveries)
  if (screenFlash && screenFlash.alpha > 0) {
    drawFlash(rgba8(screenFlash.r, screenFlash.g, screenFlash.b, Math.floor(screenFlash.alpha)));
  }

  // Floating texts (2D screen-space + 3D world-space via drawFloatingTexts3D)
  drawFloatingTexts(floatingTexts);
  if (floatingTexts3D && (gameState === 'combat' || gameState === 'explore')) {
    drawFloatingTexts3D(floatingTexts3D, worldToScreen);
  }

  // Combat hit sparks (createPool)
  if (sparkPool && sparkPool.count > 0) {
    sparkPool.forEach(s => {
      const a = Math.floor((s.life / 0.5) * 255);
      rectfill(Math.floor(s.x), Math.floor(s.y), 2, 2, colorMix(s.color, s.life * 2));
    });
  }

  // Subtle noise grain + CRT scanlines for retro feel
  // Only apply full-screen noise on states with 2D backgrounds;
  // in explore/combat the 3D scene must show through the overlay.
  if (gameState !== 'explore' && gameState !== 'combat') {
    drawNoise(0, 0, W, H, 12, Math.floor(animTimer * 10));
    drawScanlines(25, 3);
  }

  // Perlin noise atmospheric fog wisps in explore/combat (subtle 2D overlay)
  if (gameState === 'explore' || gameState === 'combat') {
    for (let i = 0; i < 4; i++) {
      const nx = noise(animTimer * 0.3 + i * 3.7, i * 2.1) * W;
      const ny = H - 70 + noise(i * 5.3, animTimer * 0.2) * 40;
      const alpha = Math.floor(noise(animTimer * 0.5 + i, 0) * 25);
      if (alpha > 5) {
        ellipse(Math.floor(nx), Math.floor(ny), 40 + i * 10, 8, rgba8(80, 70, 60, alpha), true);
      }
    }
    // Procedural noiseMap fog overlay on deeper floors (floor 3+)
    if (floor >= 3) {
      if (!floorNoiseMap) floorNoiseMap = noiseMap(32, 18, 0.12, floor * 10, 0);
      const nCols = 32,
        nRows = 18;
      const cw = W / nCols,
        ch = H / nRows;
      for (let r = nRows - 4; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
          const v = floorNoiseMap[r * nCols + c];
          const a = Math.floor(Math.max(0, v) * 18 * (floor - 2));
          if (a > 2)
            rectfill(
              Math.floor(c * cw),
              Math.floor(r * ch),
              Math.ceil(cw),
              Math.ceil(ch),
              rgba8(30, 20, 40, a)
            );
        }
      }
    }
  }
}

function drawTitle() {
  // Smooth fade-in using smoothstep for title screen
  const fadeIn = smoothstep(0, 1.5, stateElapsed());
  const fade = Math.floor(fadeIn * 220);
  drawSkyGradient(rgba8(5, 2, 15, fade), rgba8(20, 10, 5, fade));

  // Decorative ellipse aura behind title
  ellipse(320, 105, 200, 40, rgba8(180, 120, 40, Math.floor(fade * 0.15)), true);
  ellipse(320, 105, 200, 40, rgba8(180, 120, 40, Math.floor(fade * 0.25)), false);

  // Decorative spinning spirals — phase offset using frameCount for smooth animation
  const spiralPhase = frameCount * 0.02;
  const spiralColor = hslColor(animTimer * 30 + spiralPhase, 0.4, 0.3, 60);
  drawSpiral(100, 180, 3, 12, spiralColor);
  drawSpiral(540, 180, 3, 12, spiralColor);

  drawGlowText('WIZARDRY', 320, 80, rgba8(255, 200, 50, 255), rgba8(180, 100, 0, 150), 4);
  printCentered('N O V A  6 4', 320, 130, rgba8(200, 160, 80, 255), 2);

  printCentered('Proving Grounds of the Dark Tower', 320, 170, rgba8(150, 130, 110, 255));

  // Mystical energy wave under subtitle
  drawWave(120, 186, 400, 3, 0.05, animTimer * 2, rgba8(180, 120, 40, 60), 1);

  if (hasSave()) {
    drawPulsingText('Press C to Continue', 320, 228, rgba8(100, 200, 255, 255), animTimer, {
      frequency: 2,
      minAlpha: 140,
    });
    drawPulsingText('Press SPACE for New Game', 320, 250, rgba8(200, 200, 200, 255), animTimer, {
      frequency: 3,
      minAlpha: 120,
    });
  } else {
    drawPulsingText(
      'Press SPACE to begin your quest',
      320,
      240,
      rgba8(255, 255, 255, 255),
      animTimer,
      { frequency: 3, minAlpha: 135 }
    );
  }

  // Party preview — use pushMatrix/translate/rotate/scale2d for rotated class icon emblems
  printCentered('Your Party:', 320, 280, rgba8(180, 180, 200, 255));
  for (let i = 0; i < 4; i++) {
    const m = party[i];
    const x = 130 + i * 110;
    const c = CLASS_COLORS[m.class];
    const r = (c >> 16) & 0xff,
      g = (c >> 8) & 0xff,
      b = c & 0xff;
    // Rotated diamond emblem behind class icon using matrix transforms
    pushMatrix();
    translate(x, 304);
    rotate(QUARTER_PI + Math.sin(animTimer * 1.5 + i) * 0.15);
    scale2d(1.2);
    rect(-5, -5, 10, 10, rgba8(r, g, b, Math.floor(fade * 0.3)));
    popMatrix();
    printCentered(CLASS_ICONS[m.class], x, 300, rgba8(r, g, b, 255), 2);
    printCentered(m.name, x, 320, rgba8(r, g, b, 200));
    printCentered(m.class, x, 332, rgba8(140, 140, 160, 180));
  }
}

function drawExploreHUD() {
  // Compass panel
  // Floor-themed compass border using hslColor (hue shifts per floor)
  const floorHue = floor > 0 ? (floor - 1) * 60 : 30; // warm → cool per floor
  drawPanel(270, 2, 100, 38, {
    bgColor: rgba8(0, 0, 0, 160),
    borderLight: hslColor(floorHue, 0.3, 0.25, 180),
    borderDark: hslColor(floorHue, 0.3, 0.1, 180),
  });
  printCentered(`Facing ${DIR_NAMES[facing]}`, 320, 8, rgba8(200, 200, 220, 255));
  printCentered(
    `Floor ${floor} (${rad2deg(currentYaw).toFixed(0)}°)`,
    320,
    24,
    hslColor(floorHue, 0.4, 0.5, 200)
  );

  // Directional arrow indicator using drawTriangle
  const arrowColor = hslColor(floorHue, 0.5, 0.6, 200);
  const ax = 362,
    ay = 20; // right side of compass panel
  if (facing === 0)
    drawTriangle(ax, ay - 5, ax - 4, ay + 3, ax + 4, ay + 3, arrowColor, true); // N ▲
  else if (facing === 1)
    drawTriangle(ax + 5, ay, ax - 3, ay - 4, ax - 3, ay + 4, arrowColor, true); // E ►
  else if (facing === 2)
    drawTriangle(ax, ay + 5, ax - 4, ay - 3, ax + 4, ay - 3, arrowColor, true); // S ▼
  else drawTriangle(ax - 5, ay, ax + 3, ay - 4, ax + 3, ay + 4, arrowColor, true); // W ◄

  // Compass arc — sweeping arc around facing direction using deg2rad
  const arcAngle = deg2rad(facing * 90);
  arc(320, 18, 28, 14, arcAngle - 0.4, arcAngle + 0.4, hslColor(floorHue, 0.6, 0.5, 100), false);

  // Mini party status (bottom)
  drawPartyBar();

  // Minimap (top-right) using createMinimap API
  if (minimap) drawMinimap(minimap, animTimer);

  // Floor message
  if (floorMessageTimer > 0) {
    const alpha = Math.min(255, Math.floor(floorMessageTimer * 200));
    drawPanel(120, 158, 400, 28, {
      bgColor: rgba8(0, 0, 0, Math.floor(alpha * 0.7)),
      borderLight: rgba8(100, 80, 40, Math.floor(alpha * 0.4)),
      borderDark: rgba8(30, 20, 10, Math.floor(alpha * 0.4)),
    });
    drawTextShadow(
      floorMessage,
      320,
      166,
      rgba8(255, 220, 100, alpha),
      rgba8(0, 0, 0, Math.floor(alpha * 0.5)),
      1
    );
  }

  // Magic energy wave divider above party bar — color shifts per floor
  const waveHue = floor > 0 ? (floor - 1) * 60 : 30;
  drawWave(0, H - 56, W, 4, 0.04, animTimer * 3, hslColor(waveHue, 0.5, 0.4, 80), 2);

  // Move cooldown indicator (shows when movement is on cooldown)
  const moveProg = cooldownProgress(cooldowns.move);
  if (moveProg < 1) {
    const barW = 40;
    const bx = 310,
      by = H - 58;
    drawRoundedRect(bx - 1, by - 1, barW + 2, 6, 2, rgba8(20, 20, 30, 180));
    rectfill(
      bx,
      by,
      Math.floor(barW * moveProg),
      4,
      rgba8(100, 180, 255, Math.floor(200 * (1 - moveProg)))
    );
  }

  // Controls hint
  print('WASD/Arrows=Move  Q/E=Turn  I=Inventory', 10, 348, rgba8(80, 80, 100, 150));

  // Thief trap proximity warning using aabb() collision check
  const thief = party.find(m => m.alive && m.class === 'Thief');
  if (thief) {
    let trapNear = false;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = px + dx,
          ty = py + dy;
        if (tx >= 0 && tx < dungeonW && ty >= 0 && ty < dungeonH && dungeon[ty][tx] === T.TRAP) {
          if (aabb(px - 1.5, py - 1.5, 3, 3, tx - 0.5, ty - 0.5, 1, 1)) trapNear = true;
        }
      }
    }
    if (trapNear) {
      const warnAlpha = Math.floor(pulse(animTimer, 3) * 100 + 155);
      drawTextShadow(
        '⚠ Trap nearby!',
        270,
        44,
        rgba8(255, 80, 60, warnAlpha),
        rgba8(0, 0, 0, 180),
        1
      );
    }
  }

  // Gold with diamond icon
  drawDiamond(534, 352, 4, 5, rgba8(220, 180, 50, 200));
  print(`${totalGold}g`, 542, 348, rgba8(220, 180, 50, 200));

  // Floor transition checkerboard wipe — use ease() for smooth in/out
  if (floorTransition > 0) {
    const rawT = clamp(floorTransition / 0.6, 0, 1);
    const easedT = ease(rawT, 'easeInOutQuad');
    const alpha = Math.floor(easedT * 200);
    drawCheckerboard(
      0,
      0,
      W,
      H,
      rgba8(0, 0, 0, alpha),
      rgba8(10, 5, 20, Math.floor(alpha * 0.5)),
      24
    );
  }
}

function drawPartyBar() {
  const barY = H - 52;
  drawPanel(0, barY, W, 52, {
    bgColor: rgba8(10, 8, 15, 220),
    borderLight: rgba8(60, 50, 40, 200),
    borderDark: rgba8(20, 15, 10, 200),
  });

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
      const hpRatio = m.hp / m.maxHp;
      const hpColor = colorLerp(rgba8(200, 40, 40, 255), rgba8(50, 180, 50, 255), hpRatio);
      drawHealthBar(bx, barY + 16, 100, 6, m.hp, m.maxHp, {
        barColor: hpColor,
        backgroundColor: rgba8(30, 20, 20, 255),
      });
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

function drawCombatUI() {
  // Dark overlay panels
  drawPanel(0, 0, W, 40, {
    bgColor: rgba8(10, 5, 15, 200),
    borderLight: rgba8(50, 30, 50, 150),
    borderDark: rgba8(10, 5, 15, 150),
  });
  drawPanel(0, H - 160, W, 160, {
    bgColor: rgba8(10, 5, 15, 220),
    borderLight: rgba8(50, 30, 50, 150),
    borderDark: rgba8(10, 5, 15, 150),
  });

  // Boss indicator with scrolling title
  if (enemies.length > 0 && enemies[0].isBoss) {
    const pulse = Math.floor(Math.sin(animTimer * 4) * 40 + 215);
    scrollingText(
      `☠ BOSS BATTLE — ${enemies[0].name} ☠    `,
      42,
      80,
      animTimer,
      rgba8(pulse, 40, 60, 255),
      2,
      W
    );
  }

  // Monster info (top)
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const x = 20 + i * 200;
    const alive = e.hp > 0;
    const nameColor = alive ? rgba8(220, 180, 180, 255) : rgba8(80, 80, 80, 150);
    const sel = combatAction === 'target' && i === selectedTarget;

    print(`${sel ? '► ' : '  '}${e.name}`, x, 6, nameColor);
    if (alive) {
      drawHealthBar(x, 20, 120, 6, e.hp, e.maxHp, {
        barColor: rgba8(200, 40, 40, 255),
        dangerColor: rgba8(255, 100, 60, 255),
        backgroundColor: rgba8(40, 20, 20, 255),
      });
      print(`${e.hp}/${e.maxHp}`, x + 124, 18, rgba8(180, 140, 140, 200));
      // Pulsing crosshair on selected target
      if (sel) {
        const pulse = Math.sin(animTimer * 6) * 0.3 + 0.7;
        const crossColor = rgba8(255, 60, 60, Math.floor(200 * pulse));
        drawCrosshair(x + 60, 14, 10, crossColor, 'cross');
        // Magic targeting circle around crosshair
        circle(x + 60, 14, 14, rgba8(255, 100, 80, Math.floor(120 * pulse)));
      }
    } else {
      print('DEAD', x + 10, 20, rgba8(100, 40, 40, 150));
    }
  }

  // Combat log (middle-bottom)
  const logY = H - 155;
  const logLines = combatLog.slice(-5);
  for (let i = 0; i < logLines.length; i++) {
    const alpha = Math.floor(255 - (5 - i - 1) * 30);
    drawTextShadow(
      logLines[i],
      20,
      logY + i * 12,
      rgba8(200, 200, 210, Math.max(80, alpha)),
      rgba8(0, 0, 0, Math.max(60, alpha)),
      1
    );
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
      // Action menu with rounded highlight
      const menuItems = ['[1/Z] Attack', '[2/X] Magic', '[3/C] Defend'];
      drawRoundedRect(14, H - 68, 200, 54, 4, rgba8(20, 15, 30, 120));
      print(menuItems[0], 20, H - 62, rgba8(220, 200, 180, 255));
      if (member.maxMp > 0) {
        print(`${menuItems[1]} (${member.mp} MP)`, 20, H - 48, rgba8(120, 140, 255, 255));
      }
      print(menuItems[2], 20, H - 34, rgba8(180, 180, 140, 255));
      const autoAlpha = Math.floor(pulse(animTimer, 1.5) * 75 + 180);
      print(
        `[A] Auto ${autoPlay ? 'ON' : 'OFF'}`,
        20,
        H - 20,
        autoPlay ? rgba8(100, 255, 100, autoAlpha) : rgba8(120, 120, 140, 180)
      );
      // Show equipped weapon
      if (member.weapon) {
        print(`Weapon: ${member.weapon.name}`, 250, H - 62, rgba8(200, 180, 140, 150));
      }
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
      // Use grid layout helper for spell list positioning
      const spellCells = grid(1, Math.max(available.length, 1), 360, 14, 0, 0);
      for (let i = 0; i < available.length; i++) {
        const sp = available[i];
        const cell = spellCells[i];
        print(
          `[${i + 1}] ${sp.name} (${sp.cost} MP) — ${sp.desc}`,
          20 + cell.x,
          H - 62 + cell.y,
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
      // Eased slide-in for victory text
      const t = ease(Math.min(1, stateElapsed() / 0.5), 'easeOutBack');
      const yOff = Math.floor((1 - t) * -30);
      printCentered('VICTORY!', 320, H - 70 + yOff, rgba8(255, 220, 50, 255), 2);
      // Victory circle burst decoration
      circle(320, H - 60 + yOff, Math.floor(t * 40), rgba8(255, 200, 50, Math.floor(t * 60)));
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

    // Flash when recently hit (invulnerability frames)
    const hitVisible = !hitStates || !hitStates[i] || isVisible(hitStates[i], animTimer);
    const hitFlash = hitStates && hitStates[i] && isFlashing(hitStates[i]);
    const labelAlpha = hitVisible ? 255 : 80;

    const labelColor = m.alive
      ? hitFlash
        ? rgba8(255, 255, 255, 255)
        : isCurrent
          ? rgba8(255, 255, 200, labelAlpha)
          : rgba8(cr, cg, cb, Math.min(200, labelAlpha))
      : rgba8(80, 80, 80, 150);
    print(`${isCurrent ? '►' : ' '} ${m.name}`, W - 200, y, labelColor);
    if (m.alive) {
      // Buff indicator: brighten HP text when buffed using colorMix
      const buffed = (m.buffAtk > 0 || m.buffDef > 0) && m.buffTimer > 0;
      const hpTextColor = buffed
        ? colorMix(rgba8(220, 220, 100, 255), 1.5)
        : rgba8(180, 180, 180, 200);
      // Use colorLerp for smooth HP bar color: green → yellow → red
      const hpRatio = m.hp / m.maxHp;
      const hpColor = colorLerp(rgba8(200, 40, 40, 255), rgba8(50, 180, 50, 255), hpRatio);
      drawHealthBar(W - 95, y + 2, 60, 5, m.hp, m.maxHp, {
        barColor: buffed ? colorMix(hpColor, 1.3) : hpColor,
        backgroundColor: rgba8(30, 20, 20, 255),
      });
      print(`${m.hp}`, W - 30, y, hpTextColor);
    }
  }
}

function drawInventoryUI() {
  const panelW = W - 80,
    panelH = H - 60;
  drawPanel(centerX(panelW), centerY(panelH), panelW, panelH, {
    bgColor: rgba8(10, 8, 20, 240),
    borderLight: rgba8(80, 70, 50, 255),
    borderDark: rgba8(30, 25, 20, 255),
  });
  // Save current font, use default for inventory title
  const prevFont = getFont();
  printCentered('═══ PARTY STATUS ═══', 320, 40, rgba8(200, 180, 120, 255), 2);

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 75 + i * 65;
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

    const totalAtk = getEffectiveAtk(m);
    const totalDef = getEffectiveDef(m);
    print(`ATK:${totalAtk}  DEF:${totalDef}  SPD:${m.spd}`, 80, y + 28, rgba8(150, 150, 170, 180));
    printRight(`XP: ${m.xp}/${m.xpNext}`, 560, y + 28, rgba8(150, 150, 170, 180));
    // XP progress bar using uiProgressBar (UI widget variant)
    uiProgressBar(430, y + 30, 80, 4, m.xp, m.xpNext, {
      fillColor: rgba8(180, 150, 50, 200),
      bgColor: rgba8(30, 25, 15, 180),
      showText: false,
    });

    // Equipment
    if (m.weapon) {
      print(`Wpn: ${m.weapon.name}`, 80, y + 40, rgba8(200, 160, 80, 180));
    }
    if (m.armor) {
      print(`Arm: ${m.armor.name}`, 260, y + 40, rgba8(120, 160, 200, 180));
    }

    if (!m.alive) {
      print('☠ FALLEN', 480, y, rgba8(200, 40, 40, 255));
    }
  }

  // Gold + Floor info
  drawDiamond(72, H - 86, 4, 5, rgba8(220, 180, 50, 230));
  const goldStr = `${totalGold}g`;
  const goldMetrics = measureText(goldStr, 1);
  print(goldStr, 80, H - 90, rgba8(220, 180, 50, 230));
  print(`Floor: ${floor}`, 80 + goldMetrics.width + 12, H - 90, rgba8(150, 150, 170, 200));
  if (bossDefeated.size > 0) {
    printRight(`Bosses slain: ${bossDefeated.size}`, 560, H - 90, n64Palette.red);
  }

  // Render stats debug info using get3DStats + getParticleStats
  const stats = get3DStats();
  if (stats) {
    let debugStr = `Tris:${stats.triangles || 0}  Draws:${stats.drawCalls || 0}  Meshes:${stats.meshes || 0}`;
    // Append particle stats if any systems are active
    if (particleSystems.length > 0) {
      const pStats = getParticleStats(particleSystems[0]);
      if (pStats) debugStr += `  Particles:${pStats.active}/${pStats.max}`;
    }
    debugStr += `  Frame:${frameCount}`;
    print(debugStr, 60, H - 55, rgba8(80, 80, 100, 120));
  }
  // Restore font after inventory rendering
  if (prevFont) setFont(prevFont.name || 'default');

  print('[S] Save Game', 60, H - 72, rgba8(100, 200, 100, 200));
  // Visual preset toggle hint
  const presetLabel = visualPreset ? `[V] Mode: ${visualPreset.toUpperCase()}` : '[V] Visual Mode';
  print(presetLabel, 250, H - 72, n64Palette.cyan);
  printCentered('Press I / TAB / ESC to close', 320, H - 55, rgba8(120, 120, 150, 180));
}

function drawGameOver() {
  // Smooth fade-in using ease() for polished game over transition
  const fadeRaw = Math.min(1, stateElapsed() / 1.0);
  const fadeIn = ease(fadeRaw, 'easeOutCubic');
  const fade = Math.floor(fadeIn * 220);
  drawSkyGradient(rgba8(15, 0, 0, fade), rgba8(0, 0, 0, fade));
  // Pulsing red radial glow behind text
  drawRadialGradient(320, 140, 120, hslColor(0, 0.8, 0.2, 60), rgba8(0, 0, 0, 0));
  // Decorative ellipse frame behind title
  ellipse(320, 130, 160, 50, rgba8(120, 20, 20, Math.floor(fade * 0.3)), false);
  drawTextOutline('GAME OVER', 320, 120, hexColor(0xcc2828, 255), rgba8(80, 0, 0, 200), 3);
  // Skull polygon icon above text
  const skullAlpha = Math.floor(pulse(animTimer, 2) * 100 + 155);
  poly(
    [
      [310, 85],
      [320, 75],
      [330, 85],
      [325, 95],
      [315, 95],
    ],
    rgba8(200, 50, 50, skullAlpha),
    true
  );
  printCentered(`Your party fell on Floor ${floor}`, 320, 180, rgba8(180, 150, 130, 200));
  drawDiamond(270, 204, 4, 5, hexColor(0xc8b432, 200));
  printCentered(`${totalGold} Gold collected`, 320, 200, hexColor(0xc8b432, 200));

  // Pulsing restart prompt using pulse() for smooth oscillation
  const restartAlpha = Math.floor(pulse(animTimer, 1.5) * 120 + 135);
  printCentered('Press SPACE to try again', 320, 260, rgba8(255, 255, 255, restartAlpha));
}

function drawVictory() {
  drawGradient(0, 0, W, H, rgba8(10, 8, 2, 200), rgba8(2, 2, 10, 200));

  // Victory crown polygon
  const crownColor = rgba8(
    255,
    220,
    50,
    Math.floor(ease(Math.min(1, stateElapsed() / 1.5), 'easeOutBack') * 255)
  );
  poly(
    [
      [280, 55],
      [290, 35],
      [305, 50],
      [320, 25],
      [335, 50],
      [350, 35],
      [360, 55],
    ],
    crownColor,
    true
  );
  poly(
    [
      [280, 55],
      [290, 35],
      [305, 50],
      [320, 25],
      [335, 50],
      [350, 35],
      [360, 55],
    ],
    rgba8(180, 120, 0, 200),
    false
  );

  // Celebratory starbursts using hslColor for rainbow cycling
  for (let i = 0; i < 5; i++) {
    const sx = 80 + i * 130;
    const sy = 50 + Math.sin(animTimer * 2 + i) * 15;
    const starColor = hslColor(animTimer * 60 + i * 72, 0.7, 0.5, 120);
    drawStarburst(sx, sy, 20, 8, 6, starColor);
  }

  drawGlowTextCentered('VICTORY!', 320, 80, rgba8(255, 220, 50, 255), rgba8(180, 120, 0, 150), 3);
  printCentered('You conquered the Dark Tower!', 320, 140, rgba8(200, 200, 220, 255));

  // Gold with diamond — use n64Palette for classic gold tone
  drawDiamond(290, 174, 4, 5, n64Palette.yellow);
  printCentered(`${totalGold} Gold`, 320, 170, n64Palette.yellow);

  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const y = 200 + i * 16;
    // Use hexColor to convert CLASS_COLORS directly to rgba8
    printCentered(
      `${m.name} — Lv${m.level} ${m.class} ${m.alive ? '✓' : '☠'}`,
      320,
      y,
      hexColor(CLASS_COLORS[m.class], 220)
    );
  }

  // Pulsing restart prompt using pulse() for smooth oscillation
  const replayAlpha = Math.floor(pulse(animTimer, 1.5) * 120 + 135);
  printCentered('Press SPACE to play again', 320, 300, rgba8(255, 255, 255, replayAlpha));
}
