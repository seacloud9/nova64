// Tests for GameStudio demo loading utilities
// Verifies that demo fetch URLs are constructed correctly for all environments
// and that processCartCode handles realistic demo code.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { processCartCode, getNovaBaseUrl } from '../utils/cartCode';

// ---------------------------------------------------------------------------
// getNovaBaseUrl — environment detection
// ---------------------------------------------------------------------------

describe('getNovaBaseUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns localhost:5173 when running on a different local port (os9-shell dev server)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });
    expect(getNovaBaseUrl()).toBe('http://localhost:5173');
  });

  it('returns the same origin when running on port 5173 (nova64 dev server)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '5173', origin: 'http://localhost:5173' },
    });
    expect(getNovaBaseUrl()).toBe('http://localhost:5173');
  });

  it('returns the same origin in production (starcade9.github.io)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'starcade9.github.io', port: '', origin: 'https://starcade9.github.io' },
    });
    expect(getNovaBaseUrl()).toBe('https://starcade9.github.io');
  });

  it('returns localhost:5173 when running on 127.0.0.1 with a non-5173 port', () => {
    vi.stubGlobal('window', {
      location: { hostname: '127.0.0.1', port: '8080', origin: 'http://127.0.0.1:8080' },
    });
    expect(getNovaBaseUrl()).toBe('http://localhost:5173');
  });
});

// ---------------------------------------------------------------------------
// Demo URL construction — verify that demo fetches use getNovaBaseUrl() base
// ---------------------------------------------------------------------------

describe('demo fetch URL construction', () => {
  const DEMO_PATHS = [
    '/examples/hello-3d/code.js',
    '/examples/f-zero-nova-3d/code.js',
    '/examples/strider-demo-3d/code.js',
    '/examples/star-fox-nova-3d/code.js',
    '/examples/space-harrier-3d/code.js',
    '/examples/cyberpunk-city-3d/code.js',
    '/examples/crystal-cathedral-3d/code.js',
    '/examples/mystical-realm-3d/code.js',
    '/examples/fps-demo-3d/code.js',
    '/examples/physics-demo-3d/code.js',
    '/examples/minecraft-demo/code.js',
    '/examples/voxel-terrain/code.js',
    '/examples/voxel-creative/code.js',
    '/examples/dungeon-crawler-3d/code.js',
    '/examples/wizardry-3d/code.js',
    '/examples/nature-explorer-3d/code.js',
    '/examples/super-plumber-64/code.js',
    '/examples/demoscene/code.js',
    '/examples/shooter-demo-3d/code.js',
    '/examples/audio-lab/code.js',
    '/examples/boids-flocking/code.js',
    '/examples/particles-demo/code.js',
    '/examples/pbr-showcase/code.js',
    '/examples/adventure-comic-3d/code.js',
    '/examples/wing-commander-space/code.js',
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('all demo paths start with /examples/ and end with /code.js', () => {
    for (const path of DEMO_PATHS) {
      expect(path).toMatch(/^\/examples\/.+\/code\.js$/);
    }
  });

  it('demo fetch URL resolves correctly on port 3000 (standalone dev)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });
    const base = getNovaBaseUrl();
    // Should always point to the nova64 runtime server, not the shell dev server
    for (const path of DEMO_PATHS) {
      const url = `${base}${path}`;
      expect(url).toMatch(/^http:\/\/localhost:5173\/examples\//);
    }
  });

  it('demo fetch URL resolves correctly on port 5173 (nova64 dev server)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '5173', origin: 'http://localhost:5173' },
    });
    const base = getNovaBaseUrl();
    for (const path of DEMO_PATHS) {
      const url = `${base}${path}`;
      expect(url).toMatch(/^http:\/\/localhost:5173\/examples\//);
    }
  });

  it('demo fetch URL resolves correctly in production', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'starcade9.github.io', port: '', origin: 'https://starcade9.github.io' },
    });
    const base = getNovaBaseUrl();
    for (const path of DEMO_PATHS) {
      const url = `${base}${path}`;
      expect(url).toMatch(/^https:\/\/starcade9\.github\.io\/examples\//);
    }
  });

  it('demo fetch URL never uses relative path (no cross-origin fetch failure)', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });
    const base = getNovaBaseUrl();
    for (const path of DEMO_PATHS) {
      const url = `${base}${path}`;
      // Must be an absolute URL, never a bare /examples/... path
      expect(url.startsWith('http')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// processCartCode — demo-specific patterns
// ---------------------------------------------------------------------------

describe('processCartCode (demo patterns)', () => {
  it('strips all forms of exports from a realistic demo cart', () => {
    const input = [
      '// F-Zero cart',
      'let player = { x: 0, y: 0, speed: 5 };',
      '',
      'export function init() {',
      '  player = { x: 0, y: 0, speed: 5 };',
      '}',
      '',
      'export function update(dt) {',
      '  player.x += player.speed * dt;',
      '}',
      '',
      'export function draw() {',
      "  print('Score', 10, 10);",
      '}',
      '',
      'export { init, update, draw };',
    ].join('\n');

    const out = processCartCode(input);
    expect(out).not.toContain('export');
    expect(out).toContain('function init()');
    expect(out).toContain('function update(dt)');
    expect(out).toContain('function draw()');
    // Non-export lines untouched
    expect(out).toContain("let player = { x: 0, y: 0, speed: 5 };");
  });

  it('handles export async function (used in some demo carts)', () => {
    const input = 'export async function init() { await loadAssets(); }';
    const out = processCartCode(input);
    expect(out).toBe('async function init() { await loadAssets(); }');
    expect(out).not.toContain('export');
  });

  it('does not corrupt variable declarations that contain the word "export"', () => {
    const input = 'const exportPath = "/data";';
    const out = processCartCode(input);
    expect(out).toBe('const exportPath = "/data";');
  });

  it('handles multiple export const declarations in one cart', () => {
    const input = [
      'export const SPEED = 5;',
      'export const COLOR = 0xff0000;',
      'export const MAX_HEALTH = 100;',
    ].join('\n');
    const out = processCartCode(input);
    expect(out).not.toContain('export');
    expect(out).toContain('const SPEED = 5;');
    expect(out).toContain('const COLOR = 0xff0000;');
    expect(out).toContain('const MAX_HEALTH = 100;');
  });
});
