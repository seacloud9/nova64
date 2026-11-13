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
