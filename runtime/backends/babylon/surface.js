// runtime/backends/babylon/surface.js
// Contract-driven cart-facing surface exposure for Babylon.

import { applyBackendSurface } from '../../shared/backend-surface.js';

export function createBabylonSurfaceApi(self) {
  return {
    exposeTo(target) {
      applyBackendSurface(target, self);
      Object.assign(target, {
        cls: c => self.cls(c),
      });
    },
  };
}
