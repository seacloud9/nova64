// runtime/backends/babylon/camera.js
// Camera controls for the Babylon backend.

import { normalizeVectorArgs } from './common.js';

// Babylon's TargetCamera.setTarget scales its internal _referencePoint by the
// position->target distance. A coincident target zeroes it permanently and the
// view matrix stays degenerate (blank frames) for every later setTarget call.
// Never hand Babylon a coincident target: reuse the last valid view direction.
// 1 cm: setTarget itself nudges position.z by 1e-3 when z values match.
const MIN_TARGET_DISTANCE = 1e-2;
function applyTarget(self) {
  const camera = self.camera,
    target = self._cameraTarget,
    p = camera.position;
  let dx = target.x - p.x,
    dy = target.y - p.y,
    dz = target.z - p.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length >= MIN_TARGET_DISTANCE) {
    self._cameraDirection = [dx / length, dy / length, dz / length];
  } else {
    [dx, dy, dz] = self._cameraDirection ?? [0, 0, -1];
    target.copyFromFloats(p.x + dx, p.y + dy, p.z + dz);
  }
  const ref = camera._referencePoint;
  if (ref && !(ref.lengthSquared() > 0)) ref.copyFromFloats(0, 0, 1);
  camera.setTarget(target);
}

export function createBabylonCameraApi(self) {
  return {
    setCameraPosition(x, y, z) {
      const position = normalizeVectorArgs(x, y, z, 0);
      self.camera.position.copyFromFloats(position.x, position.y, position.z);
      applyTarget(self);
    },

    setCameraTarget(x, y, z) {
      const target = normalizeVectorArgs(x, y, z, 0);
      self._cameraTarget.copyFromFloats(target.x, target.y, target.z);
      applyTarget(self);
    },

    setCameraLookAt(x, y, z) {
      const lookAt = normalizeVectorArgs(x, y, z, 0);
      const isDirectionVector = Array.isArray(x) || (x && typeof x === 'object');
      if (isDirectionVector) {
        self._cameraTarget.copyFromFloats(
          self.camera.position.x + lookAt.x,
          self.camera.position.y + lookAt.y,
          self.camera.position.z + lookAt.z
        );
      } else {
        self._cameraTarget.copyFromFloats(lookAt.x, lookAt.y, lookAt.z);
      }
      applyTarget(self);
    },

    setCameraFOV(fovDegrees) {
      self.camera.fov = (fovDegrees * Math.PI) / 180;
    },
  };
}
