import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCartCode,
  getCartRunnerUrl,
  getNovaBaseUrl,
  getNovaResourceUrl,
  normalizeCartPath,
  processCartCode,
} from '../utils/cartCode';

describe('processCartCode', () => {
  it('strips export function declarations', () => {
    const input = 'export function update(dt) { }';
    expect(processCartCode(input)).toBe('function update(dt) { }');
  });

  it('strips export async function declarations', () => {
    const input = 'export async function init() { }';
    expect(processCartCode(input)).toBe('async function init() { }');
  });

  it('strips export const declarations', () => {
    const input = 'export const speed = 5;';
    expect(processCartCode(input)).toBe('const speed = 5;');
  });

  it('strips export let declarations', () => {
    const input = 'export let score = 0;';
    expect(processCartCode(input)).toBe('let score = 0;');
  });

  it('strips export var declarations', () => {
    const input = 'export var x = 1;';
    expect(processCartCode(input)).toBe('var x = 1;');
  });

  it('strips export default', () => {
    const input = 'export default myFunc;';
    expect(processCartCode(input)).toBe('myFunc;');
  });

  it('strips named re-export blocks', () => {
    const input = 'export { update, draw, init };';
    expect(processCartCode(input)).toBe('');
  });

  it('preserves non-export lines unchanged', () => {
    const input = 'let cube;\nfunction init() { cube = createCube(1, 0xff0000, [0,0,0]); }';
    expect(processCartCode(input)).toBe(input);
  });

  it('handles a realistic modern Nova64 cart', () => {
    const input = [
      'let cube;',
      '',
      'export function init() {',
      '  cube = createCube(2, 0x0088ff, [0, 0, -5]);',
      '}',
      '',
      'export function update(dt) {',
      '  rotateMesh(cube, 0, dt, 0);',
      '}',
      '',
      'export function draw() {',
      "  print('hello', 10, 10, 0xffffff);",
      '}',
    ].join('\n');

    const result = processCartCode(input);
    expect(result).not.toContain('export');
    expect(result).toContain('function init()');
    expect(result).toContain('function update(dt)');
    expect(result).toContain('function draw()');
    expect(result).toContain('let cube;');
    expect(result).toContain('createCube');
    expect(result).toContain('rotateMesh');
  });

  it('does not mangle identifiers that start with "export"', () => {
    // e.g. a variable named "exportData" should not be altered
    const input = 'const exportData = {};';
    expect(processCartCode(input)).toBe('const exportData = {};');
  });

  it('handles multiple exports in one file without breaking indentation', () => {
    const input = [
      'export function init() {}',
      'export async function load() {}',
      'export const VERSION = 1;',
      'export let lives = 3;',
    ].join('\n');
    const result = processCartCode(input);
    expect(result).toBe(
      [
        'function init() {}',
        'async function load() {}',
        'const VERSION = 1;',
        'let lives = 3;',
      ].join('\n')
    );
  });
});

describe('cart runtime URL helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes local OS shell development to the Nova64 runtime server', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });

    expect(getNovaBaseUrl()).toBe('http://localhost:5173');
    expect(getNovaResourceUrl('/examples/demoscene/code.js')).toBe(
      'http://localhost:5173/examples/demoscene/code.js'
    );
  });

  it('uses the current origin outside local development', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'starcade9.github.io',
        port: '',
        origin: 'https://starcade9.github.io',
      },
    });

    expect(getNovaBaseUrl()).toBe('https://starcade9.github.io');
    expect(getNovaResourceUrl('/examples/demoscene/code.js')).toBe(
      'https://starcade9.github.io/examples/demoscene/code.js'
    );
  });

  it('normalizes relative cart paths and preserves absolute cart URLs', () => {
    expect(normalizeCartPath('examples/minecraft-demo/code.js')).toBe(
      '/examples/minecraft-demo/code.js'
    );
    expect(normalizeCartPath('/examples/demoscene/code.js')).toBe('/examples/demoscene/code.js');
    expect(normalizeCartPath('')).toBe('/examples/hello-world/code.js');
    expect(normalizeCartPath('https://cdn.example.test/cart.js')).toBe(
      'https://cdn.example.test/cart.js'
    );
  });

  it('encodes selected cart paths into cart-runner.html without changing carts', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });

    const url = getCartRunnerUrl('/examples/minecraft-demo/code.js');
    expect(new URL(url).origin).toBe('http://localhost:5173');
    expect(new URL(url).pathname).toBe('/cart-runner.html');
    expect(new URL(url).searchParams.get('path')).toBe('/examples/minecraft-demo/code.js');
  });

  it('fetchCartCode loads carts from the runtime server', async () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '3000', origin: 'http://localhost:3000' },
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'export function init() {}',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCartCode('/examples/demoscene/code.js')).resolves.toBe(
      'export function init() {}'
    );
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/examples/demoscene/code.js');
  });
});
