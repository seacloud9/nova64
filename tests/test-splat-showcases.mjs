import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3, Matrix4 } from 'three';
import { showcases, showcaseFrame } from '../experiments/splat-worlds/showcases.js';
import { portalTransform } from '../experiments/splat-worlds/portal-math.js';

test('guided cameras remain finite and loop to the same pose', () => {
  for (const [name, spec] of Object.entries(showcases)) {
    for (let t = 0; t < spec.duration * 2; t += 0.05) {
      const frame = showcaseFrame(name, t);
      assert.ok([...frame.position, frame.yaw, frame.time].every(Number.isFinite));
      assert.ok(frame.world === 0 || frame.world === 1);
      assert.ok(frame.effect >= 0 && frame.effect <= 11);
    }
    assert.deepEqual(showcaseFrame(name, 0), showcaseFrame(name, spec.duration));
  }
});

test('threshold camera crosses at the actual linked door transform', () => {
  const before = showcaseFrame('portal', 10 - 0.00001);
  const after = showcaseFrame('portal', 10);
  const transform = portalTransform(
    new Matrix4().makeTranslation(0, 1.6, -2),
    new Matrix4().makeTranslation(0, 1.6, 0)
  );
  assert.equal(before.world, 0);
  assert.equal(after.world, 1);
  assert.ok(
    new Vector3(...before.position)
      .applyMatrix4(transform)
      .distanceTo(new Vector3(...after.position)) < 0.00001
  );
  const forward = new Vector3(-Math.sin(before.yaw), 0, -Math.cos(before.yaw)).transformDirection(
    transform
  );
  assert.ok(
    forward.distanceTo(new Vector3(-Math.sin(after.yaw), 0, -Math.cos(after.yaw))) < 0.00001
  );
});
