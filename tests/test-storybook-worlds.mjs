import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { Vector3 } from 'three';
import { generateStorybookWorld, storybookWorlds } from '../experiments/splat-worlds/storybook.js';
import { resolveMove } from '../experiments/splat-worlds/collision.js';

for (const world of storybookWorlds) {
  test(`${world.id}: deterministic, finite Gaussian asset with bounded scene size`, () => {
    const bytes = generateStorybookWorld(world.id);
    assert.equal(bytes.length % 32, 0);
    assert.ok(bytes.length / 32 > 20000 && bytes.length / 32 < 150000);
    const digest = value => createHash('sha256').update(value).digest('hex');
    assert.equal(digest(bytes), digest(generateStorybookWorld(world.id)));
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < bytes.length; i += 32) {
      for (let j = 0; j < 6; j++) {
        const v = view.getFloat32(i + j * 4, true);
        assert.ok(Number.isFinite(v));
        if (j >= 3) assert.ok(v > 0 && v <= 0.2);
      }
      assert.equal(bytes[i + 27], 255);
    }
  });
}

test('central paths reach the grove portal and garden torii', () => {
  for (const [index, start, finish] of [
    [0, [0, 1.6, 2], [0, 1.6, -7.8]],
    [1, [0, 1.6, 0.5], [0, 1.6, 10]],
  ]) {
    const out = resolveMove(
      new Vector3(...start),
      new Vector3(...finish),
      storybookWorlds[index].walk
    );
    assert.ok(out.distanceTo(new Vector3(...finish)) < 1e-8);
  }
});

test('authored tree and pond footprints stop walking', () => {
  const tree = resolveMove(
    new Vector3(-6, 1.6, -4),
    new Vector3(-6, 1.6, -7),
    storybookWorlds[0].walk
  );
  assert.ok(tree.z >= -5.25);
  const pond = resolveMove(new Vector3(6, 1.6, 4), new Vector3(6, 1.6, 7), storybookWorlds[1].walk);
  assert.ok(pond.z <= 4.75);
});
