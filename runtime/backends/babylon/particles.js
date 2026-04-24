// Explicit unsupported particle API surface for the Babylon backend.

import { warnUnsupportedBabylonFeature } from './capabilities.js';

function normalizeParticleCreateArgs(maxParticlesOrOptions, options) {
  if (
    maxParticlesOrOptions &&
    typeof maxParticlesOrOptions === 'object' &&
    !Array.isArray(maxParticlesOrOptions)
  ) {
    return {
      maxParticles: Number.isFinite(maxParticlesOrOptions.maxParticles)
        ? maxParticlesOrOptions.maxParticles
        : 200,
      options: maxParticlesOrOptions,
    };
  }

  return {
    maxParticles: Number.isFinite(maxParticlesOrOptions) ? maxParticlesOrOptions : 200,
    options: options ?? {},
  };
}

export function createBabylonParticlesApi(self) {
  return {
    createParticleSystem(maxParticlesOrOptions = 200, options = {}) {
      warnUnsupportedBabylonFeature(
        'particles',
        'Particle systems are not yet implemented for the Babylon.js backend'
      );

      const { maxParticles, options: particleOptions } = normalizeParticleCreateArgs(
        maxParticlesOrOptions,
        options
      );
      const id = -++self._particleCounter;
      self._particleSystems.set(id, {
        maxParticles,
        options: particleOptions,
        emitter: {},
      });
      return id;
    },

    setParticleEmitter(systemId, emitter = {}) {
      const entry = self._particleSystems.get(systemId);
      if (!entry) return false;
      Object.assign(entry.emitter, emitter);
      return false;
    },

    emitParticle(systemId, overrides = {}) {
      void overrides;
      return self._particleSystems.has(systemId) ? 0 : false;
    },

    burstParticles(systemId, count = 0, overrides = {}) {
      void overrides;
      return self._particleSystems.has(systemId) ? Math.max(0, Number(count) || 0) : 0;
    },

    updateParticles(dt) {
      void dt;
      return 0;
    },

    removeParticleSystem(systemId) {
      return self._particleSystems.delete(systemId);
    },

    getParticleStats(systemId) {
      const entry = self._particleSystems.get(systemId);
      return {
        active: 0,
        max: entry?.maxParticles ?? 0,
      };
    },
  };
}
