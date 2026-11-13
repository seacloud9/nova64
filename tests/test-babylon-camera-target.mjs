import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, FreeCamera, Vector3 } from '@babylonjs/core';
import { createBabylonCameraApi } from '../runtime/backends/babylon/camera.js';

function setup() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const camera = new FreeCamera('cam', new Vector3(0, 1.6, 2), scene);
  const self = { camera, _cameraTarget: new Vector3(0, 1.6, 1) };
  return { api: createBabylonCameraApi(self), camera, engine, self };
}
const finite = m => m.every(Number.isFinite);
const forward = camera => {
  const m = camera.getViewMatrix(true).m; // row 2 of the view matrix holds the view axis
  return Math.hypot(m[2], m[6], m[10]);
};

test('moving the camera onto its current target keeps a valid view', () => {
  const { api, camera, engine } = setup();
  api.setCameraTarget(0, 1.6, 1);
  api.setCameraPosition(0, 1.6, 1); // lands exactly on the stored target
  api.setCameraTarget(0, 1.6, 0);
  const m = [...camera.getViewMatrix(true).m];
  assert.ok(finite(m), 'finite view matrix');
  assert.ok(Math.abs(forward(camera) - 1) < 1e-6, 'view axis is a unit vector, not collapsed');
  assert.ok(Math.abs(camera.rotation.y) < 1e-6, 'looks down -Z toward the target');
  engine.dispose();
});

test('a coincident setCameraTarget reuses the previous direction', () => {
  const { api, camera, engine, self } = setup();
  api.setCameraTarget(1, 1.6, 2); // look +X
  const yaw = camera.rotation.y;
  api.setCameraTarget(camera.position.x, camera.position.y, camera.position.z); // == position
  assert.ok(self._cameraTarget.x > camera.position.x + 0.5, 'kept +X direction');
  assert.ok(Math.abs(camera.rotation.y - yaw) < 1e-6, 'orientation unchanged');
  assert.ok(finite([...camera.getViewMatrix(true).m]));
  engine.dispose();
});
