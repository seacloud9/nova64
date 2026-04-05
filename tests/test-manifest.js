// tests/test-manifest.js — Unit tests for cart manifest system
// Tests i18n, data, asset-loader, and manifest orchestrator modules.

import { i18nApi } from '../runtime/i18n.js';
import { dataApi } from '../runtime/data.js';
import { assetLoaderApi } from '../runtime/asset-loader.js';
import { manifestApi } from '../runtime/manifest.js';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEq(actual, expected, message) {
  if (actual !== expected)
    throw new Error(`${message || 'Not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Test Runner (matches project convention) ─────────────────

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0, errors: [] };
  }
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  async runAll() {
    for (const t of this.tests) {
      this.results.total++;
      try {
        await t.fn();
        console.log(`✅ ${t.name}`);
        this.results.passed++;
      } catch (e) {
        console.log(`❌ ${t.name}: ${e.message}`);
        this.results.failed++;
        this.results.errors.push({ test: t.name, error: e.message });
      }
    }
    console.log(`\n📊 Results: ${this.results.passed}/${this.results.total} passed`);
    return this.results;
  }
}

// ── i18n Tests ───────────────────────────────────────────────

function registerI18nTests(runner) {
  runner.test('i18n - t() returns key when no strings loaded', () => {
    const inst = i18nApi();
    inst._reset();
    assertEq(inst.t('hello'), 'hello');
  });

  runner.test('i18n - t() looks up loaded strings', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({ defaultLocale: 'en', strings: { 'hello': 'Hello World' } });
    const g = {};
    inst.exposeTo(g);
    assertEq(g.t('hello'), 'Hello World');
  });

  runner.test('i18n - t() interpolates {param} placeholders', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({ defaultLocale: 'en', strings: { 'greet': 'Hello, {name}!' } });
    const g = {};
    inst.exposeTo(g);
    assertEq(g.t('greet', { name: 'Nova' }), 'Hello, Nova!');
  });

  runner.test('i18n - t() falls back to default locale', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({
      defaultLocale: 'en',
      strings: { 'hello': 'Hello', 'bye': 'Goodbye' },
      locales: { es: { 'hello': 'Hola' } },
    });
    const g = {};
    inst.exposeTo(g);
    g.setLocale('es');
    assertEq(g.t('hello'), 'Hola');
    assertEq(g.t('bye'), 'Goodbye'); // falls back to en
  });

  runner.test('i18n - setLocale / getLocale work correctly', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({ defaultLocale: 'en', strings: {} });
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getLocale(), 'en');
    g.setLocale('es');
    assertEq(g.getLocale(), 'es');
  });

  runner.test('i18n - getAvailableLocales includes default and extras', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({
      defaultLocale: 'en',
      strings: {},
      locales: { es: {}, ja: {} },
    });
    const g = {};
    inst.exposeTo(g);
    const locales = g.getAvailableLocales();
    assert(locales.includes('en'), 'Missing en');
    assert(locales.includes('es'), 'Missing es');
    assert(locales.includes('ja'), 'Missing ja');
    assertEq(locales.length, 3);
  });

  runner.test('i18n - addStrings merges at runtime', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({ defaultLocale: 'en', strings: { 'a': 'A' } });
    const g = {};
    inst.exposeTo(g);
    g.addStrings({ 'b': 'B' });
    assertEq(g.t('a'), 'A');
    assertEq(g.t('b'), 'B');
  });

  runner.test('i18n - addStrings with locale param merges into locale', () => {
    const inst = i18nApi();
    inst._reset();
    inst._load({ defaultLocale: 'en', strings: { 'hi': 'Hi' } });
    const g = {};
    inst.exposeTo(g);
    g.addStrings({ 'hi': 'Hola' }, 'es');
    g.setLocale('es');
    assertEq(g.t('hi'), 'Hola');
  });

  runner.test('i18n - reset clears all state', () => {
    const inst = i18nApi();
    inst._load({ defaultLocale: 'en', strings: { 'x': 'X' } });
    inst._reset();
    assertEq(inst.t('x'), 'x'); // falls back to key
  });

  runner.test('i18n - t() handles null/undefined gracefully', () => {
    const inst = i18nApi();
    inst._reset();
    assertEq(inst.t(null), '');
    assertEq(inst.t(undefined), '');
  });

  runner.test('i18n - exposeTo sets all expected globals', () => {
    const inst = i18nApi();
    const g = {};
    inst.exposeTo(g);
    assert(typeof g.t === 'function', 'Missing t');
    assert(typeof g.setLocale === 'function', 'Missing setLocale');
    assert(typeof g.getLocale === 'function', 'Missing getLocale');
    assert(typeof g.getAvailableLocales === 'function', 'Missing getAvailableLocales');
    assert(typeof g.addStrings === 'function', 'Missing addStrings');
  });
}

// ── Data Tests ───────────────────────────────────────────────

function registerDataTests(runner) {
  const sampleConfig = {
    entities: {
      enemies: {
        slime: { name: 'enemy.slime', hp: 10, atk: 3, color: 0x44ff44, tier: 1 },
        demon: { name: 'enemy.demon', hp: 30, atk: 8, color: 0xff3333, tier: 2 },
      },
      npcs: {
        merchant: { name: 'npc.merchant', dialog: 'npc.merchant.greeting' },
      },
      bosses: {
        dragon: { name: 'enemy.dragon', hp: 200, atk: 25, color: 0xff2200 },
      },
    },
    items: {
      potion: { name: 'item.potion', type: 'consumable', rarity: 'common', effect: { heal: 20 } },
      sword: { name: 'item.sword', type: 'weapon', rarity: 'rare', damage: 10 },
      shield: { name: 'item.shield', type: 'armor', rarity: 'uncommon', def: 5 },
    },
    ui: { hud: { healthBar: { x: 10, y: 10 } } },
    gameplay: { player: { hp: 100, speed: 5 } },
  };

  function makeData(tFunc) {
    const inst = dataApi();
    inst._reset();
    inst._load(sampleConfig, tFunc || (k => k));
    return inst;
  }

  runner.test('Data - getEnemy returns enemy with resolved name', () => {
    const inst = makeData(k => k === 'enemy.slime' ? 'Slime' : k);
    const g = {};
    inst.exposeTo(g);
    const e = g.getEnemy('slime');
    assert(e !== null, 'Enemy not found');
    assertEq(e.name, 'Slime');
    assertEq(e.hp, 10);
    assertEq(e.tier, 1);
  });

  runner.test('Data - getEnemy returns null for missing id', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getEnemy('nonexistent'), null);
  });

  runner.test('Data - getEnemy returns a copy (not reference)', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const e1 = g.getEnemy('slime');
    e1.hp = 9999;
    const e2 = g.getEnemy('slime');
    assertEq(e2.hp, 10);
  });

  runner.test('Data - getNPC returns NPC template', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const npc = g.getNPC('merchant');
    assert(npc !== null, 'NPC not found');
    assertEq(npc.name, 'npc.merchant');
  });

  runner.test('Data - getBoss returns boss template', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const boss = g.getBoss('dragon');
    assert(boss !== null, 'Boss not found');
    assertEq(boss.hp, 200);
  });

  runner.test('Data - getEnemies returns all enemies', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const enemies = g.getEnemies();
    assertEq(Object.keys(enemies).length, 2);
    assert('slime' in enemies, 'Missing slime');
    assert('demon' in enemies, 'Missing demon');
  });

  runner.test('Data - getEnemiesByTier filters correctly', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const t1 = g.getEnemiesByTier(1);
    assertEq(Object.keys(t1).length, 1);
    assert('slime' in t1, 'Missing slime in tier 1');
    const t2 = g.getEnemiesByTier(2);
    assertEq(Object.keys(t2).length, 1);
    assert('demon' in t2, 'Missing demon in tier 2');
  });

  runner.test('Data - getItem returns item with resolved name', () => {
    const inst = makeData(k => k === 'item.potion' ? 'Health Potion' : k);
    const g = {};
    inst.exposeTo(g);
    const item = g.getItem('potion');
    assertEq(item.name, 'Health Potion');
    assertEq(item.type, 'consumable');
    assertEq(item.effect.heal, 20);
  });

  runner.test('Data - getItems returns all items', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const items = g.getItems();
    assertEq(Object.keys(items).length, 3);
  });

  runner.test('Data - getItemsByType filters correctly', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const weapons = g.getItemsByType('weapon');
    assertEq(Object.keys(weapons).length, 1);
    assert('sword' in weapons, 'Missing sword');
  });

  runner.test('Data - getItemsByRarity filters correctly', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const common = g.getItemsByRarity('common');
    assertEq(Object.keys(common).length, 1);
    assert('potion' in common, 'Missing potion in common');
    const rare = g.getItemsByRarity('rare');
    assertEq(Object.keys(rare).length, 1);
    assert('sword' in rare, 'Missing sword in rare');
  });

  runner.test('Data - getUIConfig returns copy', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const ui = g.getUIConfig();
    assert(ui !== null, 'UI config null');
    assertEq(ui.hud.healthBar.x, 10);
    ui.hud.healthBar.x = 999;
    const ui2 = g.getUIConfig();
    assertEq(ui2.hud.healthBar.x, 10);
  });

  runner.test('Data - getGameplay returns copy', () => {
    const inst = makeData();
    const g = {};
    inst.exposeTo(g);
    const gp = g.getGameplay();
    assert(gp !== null, 'Gameplay null');
    assertEq(gp.player.hp, 100);
  });

  runner.test('Data - reset clears all data', () => {
    const inst = makeData();
    inst._reset();
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getEnemy('slime'), null);
    assertEq(g.getItem('potion'), null);
    assertEq(g.getUIConfig(), null);
    assertEq(g.getGameplay(), null);
  });

  runner.test('Data - exposeTo sets all expected globals', () => {
    const inst = dataApi();
    const g = {};
    inst.exposeTo(g);
    const expected = [
      'getEnemy', 'getNPC', 'getBoss', 'getEnemies', 'getEnemiesByTier',
      'getNPCs', 'getBosses', 'getItem', 'getItems', 'getItemsByType',
      'getItemsByRarity', 'getUIConfig', 'getGameplay',
    ];
    for (const fn of expected) {
      assert(typeof g[fn] === 'function', `Missing ${fn}`);
    }
  });
}

// ── Asset Loader Tests ───────────────────────────────────────

function registerAssetLoaderTests(runner) {
  runner.test('AssetLoader - exposeTo sets all expected globals', () => {
    const inst = assetLoaderApi();
    const g = {};
    inst.exposeTo(g);
    assert(typeof g.preloadAssets === 'function', 'Missing preloadAssets');
    assert(typeof g.getAsset === 'function', 'Missing getAsset');
    assert(typeof g.getAssetStatus === 'function', 'Missing getAssetStatus');
  });

  runner.test('AssetLoader - getAssetStatus returns 100% when empty', () => {
    const inst = assetLoaderApi();
    inst._reset();
    const g = {};
    inst.exposeTo(g);
    const status = g.getAssetStatus();
    assertEq(status.percent, 100);
    assertEq(status.loaded, 0);
    assertEq(status.total, 0);
  });

  runner.test('AssetLoader - getAsset returns null for unknown name', () => {
    const inst = assetLoaderApi();
    inst._reset();
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getAsset('nonexistent'), null);
  });

  runner.test('AssetLoader - reset clears assets', () => {
    const inst = assetLoaderApi();
    inst._reset();
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getAsset('anything'), null);
    assertEq(g.getAssetStatus().total, 0);
  });

  runner.test('AssetLoader - preloadAssets handles sounds as ready', async () => {
    const inst = assetLoaderApi();
    inst._reset();
    const g = {};
    inst.exposeTo(g);
    await g.preloadAssets({ sounds: { jump: 'sfx/jump.wav', coin: 'sfx/coin.wav' } }, '/carts/game');
    const status = g.getAssetStatus();
    assertEq(status.details.jump.status, 'ready');
    assertEq(status.details.coin.status, 'ready');
    assert(g.getAsset('jump') !== null, 'jump asset missing');
  });
}

// ── Manifest Orchestrator Tests ──────────────────────────────

function registerManifestTests(runner) {
  runner.test('Manifest - exposeTo sets all subsystem globals', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);
    // i18n
    assert(typeof g.t === 'function', 'Missing t');
    assert(typeof g.setLocale === 'function', 'Missing setLocale');
    // data
    assert(typeof g.getEnemy === 'function', 'Missing getEnemy');
    assert(typeof g.getItem === 'function', 'Missing getItem');
    // assets
    assert(typeof g.preloadAssets === 'function', 'Missing preloadAssets');
    assert(typeof g.getAsset === 'function', 'Missing getAsset');
    // manifest meta
    assert(typeof g.getMeta === 'function', 'Missing getMeta');
  });

  runner.test('Manifest - getMeta returns null before loading', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);
    assertEq(g.getMeta(), null);
  });

  runner.test('Manifest - _loadFromCart loads full manifest', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);

    const mockCart = {
      env: {
        meta: { name: 'Test Game', version: '1.0.0', author: 'Tester' },
        text: {
          defaultLocale: 'en',
          strings: { 'enemy.slime': 'Green Slime', 'game.title': 'Test Game' },
          locales: { es: { 'game.title': 'Juego de Prueba' } },
        },
        entities: {
          enemies: {
            slime: { name: 'enemy.slime', hp: 10, tier: 1 },
          },
        },
        items: {
          potion: { name: 'item.potion', type: 'consumable', rarity: 'common' },
        },
        gameplay: { player: { hp: 50, speed: 3 } },
      },
    };

    inst._loadFromCart(mockCart, '/examples/test-game/code.js');

    const meta = g.getMeta();
    assertEq(meta.name, 'Test Game');
    assertEq(meta.version, '1.0.0');

    // i18n should be loaded
    assertEq(g.t('game.title'), 'Test Game');
    g.setLocale('es');
    assertEq(g.t('game.title'), 'Juego de Prueba');
    g.setLocale('en');

    // data should be loaded with i18n resolution
    const enemy = g.getEnemy('slime');
    assertEq(enemy.name, 'Green Slime');
    assertEq(enemy.hp, 10);

    const item = g.getItem('potion');
    assert(item !== null, 'Item not found');

    const gp = g.getGameplay();
    assertEq(gp.player.hp, 50);
  });

  runner.test('Manifest - _reset clears everything', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);

    inst._loadFromCart({
      env: {
        meta: { name: 'X' },
        text: { defaultLocale: 'en', strings: { 'a': 'A' } },
        entities: { enemies: { slime: { name: 'a', hp: 1 } } },
      },
    });

    inst._reset();

    assertEq(g.getMeta(), null);
    assertEq(g.t('a'), 'a'); // falls back to key
    assertEq(g.getEnemy('slime'), null);
  });

  runner.test('Manifest - _loadFromCart with no env is a no-op', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);
    inst._loadFromCart({}); // cart with no env export
    assertEq(g.getMeta(), null);
  });

  runner.test('Manifest - partial manifest (only meta + text)', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);

    inst._loadFromCart({
      env: {
        meta: { name: 'Minimal' },
        text: { defaultLocale: 'en', strings: { 'title': 'Mini' } },
      },
    });

    assertEq(g.getMeta().name, 'Minimal');
    assertEq(g.t('title'), 'Mini');
    assertEq(g.getEnemy('anything'), null); // no entities loaded
  });

  runner.test('Manifest - getMeta returns copy', () => {
    const inst = manifestApi();
    const g = {};
    inst.exposeTo(g);
    inst._loadFromCart({ env: { meta: { name: 'Copy Test' } } });
    const m1 = g.getMeta();
    m1.name = 'Mutated';
    const m2 = g.getMeta();
    assertEq(m2.name, 'Copy Test');
  });
}

// ── Cart Source Parse Tests ──────────────────────────────────

async function registerCartParseTests(runner) {
  const fs = await import('fs');
  const path = await import('path');
  const vm = await import('vm');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const examplesDir = path.join(__dirname, '..', 'examples');

  const cartsWithManifest = [
    'minecraft-demo',
    'wizardry-3d',
    'fps-demo-3d',
    'strider-demo-3d',
    'dungeon-crawler-3d',
    'star-fox-nova-3d',
    'mystical-realm-3d',
  ];

  for (const cart of cartsWithManifest) {
    runner.test(`Cart ${cart} - exports valid env manifest`, () => {
      const src = fs.readFileSync(path.join(examplesDir, cart, 'code.js'), 'utf8');
      assert(src.includes('export const env'), `${cart} missing export const env`);
      assert(src.includes('meta:'), `${cart} missing meta section`);
    });

    runner.test(`Cart ${cart} - has meta with name`, () => {
      const src = fs.readFileSync(path.join(examplesDir, cart, 'code.js'), 'utf8');
      assert(src.includes("name:"), `${cart} meta missing name`);
    });

    runner.test(`Cart ${cart} - has i18n text section`, () => {
      const src = fs.readFileSync(path.join(examplesDir, cart, 'code.js'), 'utf8');
      assert(src.includes('text:'), `${cart} missing text section`);
      assert(src.includes('strings:'), `${cart} missing strings in text`);
    });

    runner.test(`Cart ${cart} - parses without syntax errors`, () => {
      const src = fs.readFileSync(path.join(examplesDir, cart, 'code.js'), 'utf8');
      const stripped = src.replace(/export\s+(function|const|let|var|async\s+function)/g, '$1');
      new vm.Script(stripped, { filename: `${cart}/code.js` });
    });
  }
}

// ── Main Runner ──────────────────────────────────────────────

export async function runManifestTests() {
  const runner = new TestRunner();

  registerI18nTests(runner);
  registerDataTests(runner);
  registerAssetLoaderTests(runner);
  registerManifestTests(runner);
  await registerCartParseTests(runner);

  return await runner.runAll();
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runManifestTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
