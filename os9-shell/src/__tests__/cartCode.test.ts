import { describe, it, expect } from 'vitest';
import { processCartCode } from '../utils/cartCode';

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
      ['function init() {}', 'async function load() {}', 'const VERSION = 1;', 'let lives = 3;'].join('\n')
    );
  });
});
