import { describe, expect, it } from 'vitest';
import { GAMES } from '../apps/gameCatalog';

const cartModules = import.meta.glob('../../../examples/*/code.js');

describe('GameLauncher catalog', () => {
  it('points every launcher tile at an existing cart', () => {
    for (const game of GAMES) {
      expect(game.path).toMatch(/^\/examples\/.+\/code\.js$/);
      expect(cartModules[`../../..${game.path}`]).toBeDefined();
    }
  });

  it('keeps launcher ids mapped to their intended demos', () => {
    expect(Object.fromEntries(GAMES.map(game => [game.id, game.path]))).toMatchObject({
      fzero: '/examples/f-zero-nova-3d/code.js',
      'space-harrier': '/examples/space-harrier-3d/code.js',
      starfox: '/examples/star-fox-nova-3d/code.js',
      'space-combat': '/examples/space-combat-3d/code.js',
      fps: '/examples/fps-demo-3d/code.js',
      shooter: '/examples/shooter-demo-3d/code.js',
      strider: '/examples/strider-demo-3d/code.js',
      demoscene: '/examples/demoscene/code.js',
      minecraft: '/examples/minecraft-demo/code.js',
      physics: '/examples/physics-demo-3d/code.js',
    });
  });

  it('does not define duplicate launcher ids or duplicate demo paths', () => {
    const ids = GAMES.map(game => game.id);
    const paths = GAMES.map(game => game.path);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
