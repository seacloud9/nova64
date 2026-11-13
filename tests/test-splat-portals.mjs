import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3, Vector4 } from 'three';
import {
  portalTransform,
  crossing,
  clipProjection,
  exitPlane,
} from '../experiments/splat-worlds/portal-math.js';

const entry = new Matrix4().makeTranslation(0, 1.6, -2);
const exit = new Matrix4().makeRotationY(0.7).setPosition(5, 1.6, 8);
test('linked doorway transform is reversible and preserves distances', () => {
  const a = portalTransform(entry, exit),
    b = portalTransform(exit, entry);
  const point = new Vector3(0.5, 1.6, -3);
  assert.ok(point.clone().applyMatrix4(a).applyMatrix4(b).distanceTo(point) < 1e-10);
  const p = new Vector3(1, 2, 3),
    q = new Vector3(3, 4, 5);
  assert.ok(
    Math.abs(p.distanceTo(q) - p.clone().applyMatrix4(a).distanceTo(q.clone().applyMatrix4(a))) <
      1e-10
  );
});
test('crossing requires front-to-back intersection within the usable doorway', () => {
  assert.equal(crossing(new Vector3(0, 1.6, -1), new Vector3(0, 1.6, -3), entry, 2.2, 3.2), true);
  assert.equal(crossing(new Vector3(0, 1.6, -3), new Vector3(0, 1.6, -1), entry, 2.2, 3.2), false);
  assert.equal(crossing(new Vector3(2, 1.6, -1), new Vector3(2, 1.6, -3), entry, 2.2, 3.2), false);
  assert.equal(crossing(new Vector3(0, 4, -1), new Vector3(0, 4, -3), entry, 2.2, 3.2), false);
  // Check the swept intersection, rather than only the endpoint.
  assert.equal(crossing(new Vector3(0, 1.6, -1), new Vector3(1.5, 1.6, -3), entry, 2.2, 3.2), true);
});
test('portal camera preserves corresponding doorway screen coordinates', () => {
  const viewer = new Matrix4().makeTranslation(0.6, 1.6, 2);
  const linked = portalTransform(entry, exit).multiply(viewer);
  const projection = new Matrix4().makePerspective(-0.1, 0.1, 0.06, -0.06, 0.1, 100);
  const point = new Vector3(0.3, 1.8, 0).applyMatrix4(entry);
  const screen = new Vector4(...point.toArray(), 1)
    .applyMatrix4(viewer.clone().invert())
    .applyMatrix4(projection);
  const remote = point.clone().applyMatrix4(portalTransform(entry, exit));
  const clip = new Vector4(...remote.toArray(), 1)
    .applyMatrix4(linked.clone().invert())
    .applyMatrix4(projection);
  assert.ok(Math.abs(screen.x / screen.w - clip.x / clip.w) < 1e-10);
  assert.ok(Math.abs(screen.y / screen.w - clip.y / clip.w) < 1e-10);
});
test('oblique clipping keeps the destination side and rejects geometry behind its doorway', () => {
  const exit = new Matrix4();
  const camera = new Matrix4().makeRotationY(Math.PI).setPosition(0.4, 0, -3);
  const base = new Matrix4().makePerspective(-0.1, 0.1, 0.06, -0.06, 0.1, 100);
  const projection = clipProjection(base, camera, exitPlane(exit));
  const clip = z =>
    new Vector4(0, 0, z, 1).applyMatrix4(camera.clone().invert()).applyMatrix4(projection);
  const visible = clip(1),
    hidden = clip(-1);
  assert.ok(visible.z >= -visible.w && visible.z <= visible.w);
  assert.ok(hidden.z < -hidden.w);
  assert.equal(projection.elements[0], base.elements[0]);
  assert.equal(projection.elements[5], base.elements[5]);
});

import { resolveMove, doorBlockers } from '../experiments/splat-worlds/collision.js';
const room = { bounds: [-5, -5, 5, 5], blockers: [[-1, -1, 1, 1]] };
test('collision proxy keeps the player inside bounds and outside blockers', () => {
  const out = resolveMove(new Vector3(0, 1.6, 3), new Vector3(0, 1.6, 0), room, 0.25);
  assert.ok(out.z >= 1.25 - 1e-9, 'stopped at blocker face');
  const edge = resolveMove(new Vector3(0, 1.6, 3), new Vector3(40, 1.6, 3), room, 0.25);
  assert.ok(Math.abs(edge.x - 4.75) < 1e-9 && Math.abs(edge.z - 3) < 1e-9, 'slides along wall');
});
test('collision proxy does not tunnel through thin blockers on huge steps', () => {
  const wall = { bounds: [-50, -50, 50, 50], blockers: [[-10, -0.05, 10, 0.05]] };
  const out = resolveMove(new Vector3(0, 1.6, 5), new Vector3(0, 1.6, -40), wall, 0.25);
  assert.ok(out.z > 0, 'still on the starting side');
});
test('collision proxy recovers from a start inside a blocker and rejects NaN', () => {
  const out = resolveMove(new Vector3(0.9, 1.6, 0), new Vector3(0.9, 1.6, 0), room, 0.25);
  assert.ok(out.x >= 1.25 - 1e-9);
  const nan = resolveMove(new Vector3(3, 1.6, 3), new Vector3(NaN, 1.6, 3), room, 0.25);
  assert.ok(Number.isFinite(nan.x) && Number.isFinite(nan.z));
});
test('door posts block the frame but leave the usable opening crossable', () => {
  const door = new Matrix4().makeTranslation(0, 1.6, -2);
  const region = { bounds: [-10, -10, 10, 10], blockers: doorBlockers(door) };
  const through = resolveMove(new Vector3(0.8, 1.6, -1), new Vector3(0.8, 1.6, -3), region);
  assert.ok(Math.abs(through.z + 3) < 1e-9, 'opening is free');
  assert.ok(crossing(new Vector3(0.8, 1.6, -1), through, door, 2.2, 3.2));
  const post = resolveMove(new Vector3(1.17, 1.6, -1), new Vector3(1.17, 1.6, -3), region);
  assert.ok(post.z > -2, 'post is solid');
});
