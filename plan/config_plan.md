# Cart Manifest System — Full Plan

**Date**: April 2026
**Goal**: Expand `export const env` into a full **cart manifest** that covers environment,
text/i18n, assets, UI, entities (enemies/NPCs/items), and gameplay config.

---

## Design Principles

1. **Convention over configuration** — the manifest IS the format. Because Nova64
   builds the cart, the runtime knows how to consume every section automatically.
2. **Declarative data, imperative logic** — carts export data; the runtime applies it.
   Carts still have `init()`, `update()`, `draw()` for behavior.
3. **i18n-ready** — all user-facing strings live in `text.strings` with dot-notation keys.
   Helper `t('key')` does lookup + locale fallback. Carts never hardcode display text.
4. **Convention-based assets** — assets section declares logical names → paths.
   Runtime preloads them and exposes by name. Paths relative to cart directory.
5. **Per-level overrides** — every section supports level-specific overrides via deep merge.
6. **Backward compatible** — carts that don't export `env` keep working unchanged.
   Sections are optional. Old env-only configs keep working.

---

## Expanded Schema

```javascript
export const env = {
  // ── Meta ───────────────────────────────────────────────────
  meta: {
    name: 'My Game', // cart display name
    version: '1.0.0',
    author: 'Dev Name',
    description: 'A cool game',
  },

  // ── Text / i18n ───────────────────────────────────────────
  text: {
    defaultLocale: 'en',
    strings: {
      // Flat dot-notation keys
      title: 'Dragon Quest',
      'menu.start': 'New Game',
      'menu.continue': 'Continue',
      'menu.options': 'Options',
      'hud.hp': 'HP',
      'hud.score': 'Score',
      'hud.level': 'Level',
      'enemy.slime.name': 'Slime',
      'enemy.slime.death': 'The slime dissolves!',
      'item.potion.name': 'Health Potion',
      'item.potion.desc': 'Restores 20 HP',
      'npc.merchant.greeting': 'Welcome, traveler!',
      'dialog.intro.1': 'The kingdom is in danger...',
    },
    locales: {
      es: {
        title: 'Aventura del Dragón',
        'menu.start': 'Nuevo Juego',
        // ... only override what changes
      },
      ja: {
        /* ... */
      },
    },
  },

  // ── Assets ────────────────────────────────────────────────
  assets: {
    // basePath defaults to cart directory (convention)
    textures: {
      player: 'sprites/player.png',
      tileset: 'sprites/tileset.png',
      enemy_slime: 'sprites/slime.png',
    },
    models: {
      sword: 'models/sword.glb',
      shield: 'models/shield.glb',
    },
    sounds: {
      jump: 'sfx/jump', // can omit extension, runtime tries .wav/.mp3
      coin: 'sfx/coin',
      bgm_overworld: 'music/overworld.mp3',
    },
  },

  // ── Environment (existing, unchanged) ─────────────────────
  defaults: {
    sky: { type: 'gradient', topColor: 0x87ceeb, bottomColor: 0xe0f0ff },
    fog: { enabled: true, color: 0x87ceeb, near: 25, far: 50 },
    camera: { position: [0, 5, 10], target: [0, 0, 0], fov: 75 },
    lighting: {
      ambient: 0x666666,
      directional: { direction: [1, 2, 1], color: 0xffffff, intensity: 0.6 },
    },
    effects: {},
    voxel: null,
    cheats: { enabled: true, items: { noclip: false, godMode: false } },
  },
  levels: {
    overworld: {
      sky: { type: 'gradient', topColor: 0x87ceeb, bottomColor: 0xe0f0ff },
    },
    dungeon: {
      sky: { type: 'solid', color: 0x000000 },
      fog: { color: 0x111111, near: 5, far: 20 },
    },
  },
  onCheatsChanged(cheats) {
    /* ... */
  },

  // ── Entities ──────────────────────────────────────────────
  entities: {
    enemies: {
      slime: {
        name: 'enemy.slime.name', // t() key reference
        hp: 10,
        atk: 3,
        def: 1,
        speed: 1.5,
        color: 0x44ff44,
        model: 'enemy_slime', // ref to assets.textures or .models
        behavior: 'wander', // 'wander' | 'chase' | 'patrol' | 'guard' | 'flee'
        loot: [
          { item: 'gel', chance: 0.5, quantity: [1, 3] },
          { item: 'coin', chance: 0.8 },
        ],
        spawnBiomes: ['plains', 'forest'],
        tier: 1, // difficulty tier for scaling
      },
      skeleton: {
        name: 'enemy.skeleton.name',
        hp: 20,
        atk: 6,
        def: 3,
        speed: 2.0,
        color: 0xddddaa,
        behavior: 'chase',
        tier: 2,
      },
    },

    npcs: {
      merchant: {
        name: 'npc.merchant.name',
        model: 'npc_merchant',
        dialog: 'npc.merchant.greeting', // t() key
        inventory: ['potion', 'sword', 'shield'], // refs to items
      },
    },

    bosses: {
      dragon: {
        name: 'enemy.dragon.name',
        hp: 200,
        atk: 25,
        def: 10,
        color: 0xff2200,
        phases: [{ hpThreshold: 0.5, behavior: 'chase', atkMultiplier: 1.5 }],
        loot: [{ item: 'dragon_scale', chance: 1.0 }],
      },
    },
  },

  // ── Items ─────────────────────────────────────────────────
  items: {
    potion: {
      name: 'item.potion.name',
      description: 'item.potion.desc',
      type: 'consumable', // 'consumable' | 'weapon' | 'armor' | 'key' | 'material'
      effect: { heal: 20 },
      stackable: true,
      maxStack: 99,
      rarity: 'common', // 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
      icon: 'item_potion', // asset ref
      value: 25, // buy/sell price
    },
    sword: {
      name: 'item.sword.name',
      type: 'weapon',
      damage: 10,
      attackSpeed: 1.0,
      rarity: 'uncommon',
      value: 100,
    },
  },

  // ── UI ────────────────────────────────────────────────────
  ui: {
    hud: {
      healthBar: {
        x: 10,
        y: 10,
        width: 100,
        height: 12,
        color: 0xff0000,
        bgColor: 0x333333,
        show: true,
      },
      score: { x: 10, y: 30, color: 0xffffff, format: '{hud.score}: {value}' },
      minimap: { enabled: true, x: -120, y: 10, size: 100, shape: 'circle' },
    },
    dialog: {
      style: 'rpg', // 'rpg' | 'visual-novel' | 'minimal'
      boxColor: 0x222244,
      textColor: 0xffffff,
      typewriterSpeed: 30, // chars per second
      nameColor: 0xffff00,
    },
    menus: {
      main: {
        items: [
          { key: 'start', label: 'menu.start', action: 'startGame' },
          { key: 'options', label: 'menu.options', action: 'showOptions' },
        ],
      },
    },
    palette: {
      primary: 0x4488ff,
      secondary: 0x44ff88,
      danger: 0xff4444,
      warning: 0xffaa00,
      background: 0x111122,
      text: 0xffffff,
    },
  },

  // ── Gameplay ──────────────────────────────────────────────
  gameplay: {
    player: {
      hp: 100,
      maxHp: 100,
      speed: 5.0,
      jumpForce: 0.35,
      startPosition: [0, 80, 0],
    },
    difficulty: {
      enemyHpScale: 1.0, // multiplier per level/floor
      enemyAtkScale: 1.0,
      lootChanceBonus: 0,
    },
    progression: {
      xpPerLevel: 100,
      xpScaling: 1.5, // xp needed = base * scaling^level
    },
  },
};
```

---

## New Runtime Modules

### 1. `runtime/manifest.js` (NEW — orchestrator, replaces env.js as entry point)

- Imports and orchestrates all subsystems (env, i18n, data, asset-loader)
- `loadManifest(config)` — parse and dispatch sections to subsystems
- `_loadFromCart(mod)` — checks `mod.env`, calls loadManifest
- `_reset()` — resets all subsystems
- `exposeTo(target)` — exposes all new globals from all subsystems

### 2. `runtime/i18n.js` (NEW)

- `t(key, params)` — lookup translated string, supports `{param}` interpolation
- `setLocale(locale)` — switch language
- `getLocale()` — current locale
- `addStrings(strings)` — merge additional strings at runtime
- `getAvailableLocales()` — list configured locales
- Fallback chain: locale-specific → defaultLocale → key itself

### 3. `runtime/data.js` (NEW)

- `getEnemy(id)` — returns enemy template (with name resolved via t())
- `getNPC(id)` — returns NPC template
- `getBoss(id)` — returns boss template
- `getItem(id)` — returns item template
- `getEnemies()` / `getEnemiesByTier(tier)` — query utilities
- `getItems()` / `getItemsByType(type)` — filter helpers
- `getGameplay()` — gameplay config section
- All return copies with names resolved through i18n

### 4. `runtime/asset-loader.js` (NEW)

- `preloadAssets(assetConfig, basePath)` — preload all declared assets
- `getAsset(name)` — retrieve preloaded asset by logical name
- `getAssetStatus()` — loading progress `{ loaded, total, percent }`
- Uses existing `loadTexture()` / `loadModel()` under the hood
- Convention: paths relative to cart directory

### 5. `runtime/env.js` (MODIFY — keep environment logic, called by manifest)

- Keep all existing env API (`loadEnv`, `setLevel`, `getEnv`, etc.)
- Cheat overlay stays here
- Now called by manifest.js instead of directly by console.js

---

## New Global API Functions

| Function                 | Module          | Purpose                                      |
| ------------------------ | --------------- | -------------------------------------------- |
| `t(key, params)`         | i18n.js         | Translate string with optional interpolation |
| `setLocale(locale)`      | i18n.js         | Switch language                              |
| `getLocale()`            | i18n.js         | Get current locale                           |
| `getEnemy(id)`           | data.js         | Get enemy template by id                     |
| `getNPC(id)`             | data.js         | Get NPC template by id                       |
| `getBoss(id)`            | data.js         | Get boss template by id                      |
| `getItem(id)`            | data.js         | Get item template by id                      |
| `getEnemies()`           | data.js         | Get all enemy templates                      |
| `getEnemiesByTier(tier)` | data.js         | Filter enemies by difficulty tier            |
| `getItems()`             | data.js         | Get all item templates                       |
| `getItemsByType(type)`   | data.js         | Filter items by type                         |
| `getGameplay()`          | data.js         | Get gameplay config                          |
| `getUIConfig()`          | data.js         | Get UI config                                |
| `preloadAssets()`        | asset-loader.js | Begin preloading declared assets             |
| `getAsset(name)`         | asset-loader.js | Get preloaded asset by logical name          |
| `getAssetStatus()`       | asset-loader.js | Get loading progress                         |

---

## Implementation Phases

### Phase A: i18n System (`runtime/i18n.js`)

- Create i18n.js with `t()`, `setLocale()`, `getLocale()`
- Wire into manifest loading
- Add ESLint globals
- Existing 113 tests keep passing

### Phase B: Data System (`runtime/data.js`)

- Create data.js with entity/item/gameplay query API
- Wire into manifest loading
- Resolves `t()` keys automatically when returning data
- Add ESLint globals

### Phase C: Asset Loader (`runtime/asset-loader.js`)

- Create asset-loader.js with preload/get API
- Convention: paths relative to cart directory
- Progress tracking for loading screens
- Wire into manifest loading
- Add ESLint globals

### Phase D: Manifest Orchestrator (`runtime/manifest.js`)

- Refactor: `env.js _loadFromCart` → `manifest.js _loadFromCart`
- Manifest parses sections, dispatches to env/i18n/data/asset-loader
- Update `console.js` to use manifest instead of env directly
- Update `src/main.js` imports

### Phase E: Update Dev Console Overlay

- Expand overlay to show entities, items, text keys
- Add locale switcher to overlay
- Add asset loading status

### Phase F: Apply to Demo Carts

- **minecraft-demo**: full manifest with mobs, blocks, i18n strings
- **dungeon-crawler-3d**: enemies, bosses, themes, items
- **wizardry-3d**: classes, monsters, spells, equipment
- **fps-demo-3d**: enemy types, level layouts, materials
- **star-fox-nova-3d**: ship config, enemy templates
- **strider-demo-3d**: character classes, world themes

### Phase G: Build, Test, Commit

- `pnpm build`, `pnpm test` (113/113)
- Git commit with detailed message

---

## Key Design Decisions

1. **Single export `env`** — backward compatible name, manifest is a superset
2. **t() key references** — entity name fields hold i18n keys, resolved on query
3. **Assets by logical name** — `getAsset('player')` not `getAsset('./sprites/player.png')`
4. **Copy-on-read** — all getters return copies, carts can't mutate manifest data
5. **Optional sections** — every section is optional, carts opt-in to what they need
6. **Convention paths** — `basePath` defaults to cart's directory, no absolute URLs needed
7. **Deep merge for levels** — levels can override ANY section (entities, items, text, etc.)

---

## Dependency Graph

```
Phase A (i18n) ──┐
                  ├─→ Phase D (manifest) ─→ Phase E (overlay) ─→ Phase F (demos) ─→ Phase G
Phase B (data) ──┤
                  │
Phase C (assets) ─┘
```

Phases A, B, C are independent and can be built in any order.
Phase D depends on A+B+C. Phase E depends on D. Phase F depends on D+E.
