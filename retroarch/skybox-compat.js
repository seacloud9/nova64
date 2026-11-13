// Built into generated/sky.h. The marked constructors/presets come directly
// from runtime/api-skybox.js; THREE math is bundled, without a browser renderer.
import { Color } from 'three/src/math/Color.js';
import { Matrix4 } from 'three/src/math/Matrix4.js';
import { Vector3 } from 'three/src/math/Vector3.js';
(() => {
  const backendSkybox = null;
  const SPACE_FRAG = 'space',
    STAR_VERT = '',
    STAR_FRAG = '';
  let skyboxMesh = null,
    starField = null;
  let time = 0,
    rotation = 0,
    speed = 1,
    auto = false;
  let reflectionIntensity = 0;
  class BufferGeometry {
    constructor() {
      this.attributes = {};
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  }
  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
    }
  }
  class ShaderMaterial {
    constructor(options) {
      Object.assign(this, options);
    }
  }
  class Points {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
    }
  }
  const THREE = { Color, Vector3, BufferGeometry, BufferAttribute, ShaderMaterial, Points };
  const gpu = { scene: { add() {} } };
  const _supportsSkybox = () => true;
  const _warnUnsupportedSkybox = () => {};
  const _pixelScale = () => 300;
  const GRADIENT_FRAG = 'gradient';
  function _clearSky() {
    skyboxMesh = starField = null;
    time = rotation = 0;
    reflectionIntensity = 0;
    __novaSetProceduralSky(0, {}, []);
  }
  function _skyDome(kind, uniforms) {
    const mesh = { kind, material: { uniforms }, rotation: { y: 0 } };
    return mesh;
  }
  function _bakeDomeEnvironment(_mesh, intensity) {
    reflectionIntensity = intensity;
  }
  /* WEB_SKY_CONSTRUCTORS */
  function upload() {
    const uniforms = {};
    if (!skyboxMesh) return;
    for (const [name, { value }] of Object.entries(skyboxMesh.material.uniforms)) {
      uniforms[name] = value?.isColor
        ? [value.r, value.g, value.b]
        : value?.isVector3
          ? value.toArray()
          : value;
    }
    const stars = [];
    if (starField) {
      const a = starField.geometry.attributes;
      for (let i = 0; i < a.aSize.array.length; i++) {
        stars.push(
          ...a.position.array.subarray(i * 3, i * 3 + 3),
          ...a.color.array.subarray(i * 3, i * 3 + 3),
          a.aSize.array[i],
          a.aPhase.array[i]
        );
      }
    }
    uniforms.uSize = starField?.material.uniforms.uSize.value ?? 0;
    __novaSetProceduralSky(
      skyboxMesh.kind === 'space' ? 2 : 1,
      uniforms,
      stars,
      reflectionIntensity
    );
  }
  function createEnvironmentSkybox(preset = 'neon', opts = {}) {
    _clearSky();
    const p = ENV_PRESETS[preset] || ENV_PRESETS.neon;
    const top = new Color(opts.top ?? p.top),
      horizon = new Color(opts.horizon ?? p.horizon);
    const bottom = new Color(opts.bottom ?? p.bottom);
    const gain = opts.intensity ?? 1;
    const panels = (p.panels || []).map(panel => {
      const transform = new Matrix4()
        .makeRotationY(panel.rotY || 0)
        .multiply(new Matrix4().makeRotationX(panel.rotX || 0));
      return {
        ...panel,
        pos: new Vector3(...panel.pos),
        normal: new Vector3(0, 0, 1).transformDirection(transform),
        right: new Vector3(1, 0, 0).transformDirection(transform),
        up: new Vector3(0, 1, 0).transformDirection(transform),
        color: new Color(panel.color).multiplyScalar(panel.intensity * gain),
      };
    });
    const width = 512,
      height = 256,
      data = new Float32Array(width * height * 4);
    const direction = new Vector3(),
      hit = new Vector3(),
      color = new Color();
    const sun = p.sun && {
      direction: new Vector3(...p.sun.dir).normalize(),
      color: new Color(p.sun.color).multiplyScalar(p.sun.intensity * gain),
      radius: p.sun.radius / 40,
    };
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const lat = (y / (height - 1) - 0.5) * Math.PI,
          lon = (x / (width - 1) - 0.5) * 2 * Math.PI;
        direction.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        color
          .copy(horizon)
          .lerp(
            direction.y > 0 ? top : bottom,
            Math.pow(Math.abs(direction.y), direction.y > 0 ? 0.6 : 0.4)
          );
        let nearest = Infinity;
        for (const panel of panels) {
          const denom = direction.dot(panel.normal);
          if (Math.abs(denom) < 1e-6) continue;
          const distance = panel.pos.dot(panel.normal) / denom;
          if (distance <= 0 || distance >= nearest) continue;
          hit.copy(direction).multiplyScalar(distance).sub(panel.pos);
          if (
            Math.abs(hit.dot(panel.right)) <= panel.size[0] / 2 &&
            Math.abs(hit.dot(panel.up)) <= panel.size[1] / 2
          ) {
            color.copy(panel.color);
            nearest = distance;
          }
        }
        if (sun && direction.dot(sun.direction) > Math.sqrt(1 - sun.radius * sun.radius))
          color.copy(sun.color);
        const offset = (y * width + x) * 4;
        data[offset] = color.r;
        data[offset + 1] = color.g;
        data[offset + 2] = color.b;
        data[offset + 3] = 1;
      }
    __novaSetSkyPixels(data.buffer, width, height, opts.blur ?? 0);
    return { isTexture: true };
  }
  const api = {
    createGradientSkybox(...args) {
      const mesh = createGradientSkybox(...args);
      upload();
      return mesh;
    },
    createSpaceSkybox(...args) {
      const mesh = createSpaceSkybox(...args);
      upload();
      return mesh;
    },
    createSkyPreset(...args) {
      const mesh = createSkyPreset(...args);
      upload();
      return mesh;
    },
    getSkyPresets,
    createEnvironmentSkybox,
    createHDRSkybox(url, opts = {}) {
      return Promise.resolve().then(() => {
        _clearSky();
        __novaSetImageSky(url, opts.intensity ?? 1, opts.rotation ?? 0, opts.blur ?? 0);
        return { isTexture: true };
      });
    },
    createImageSkybox(urls) {
      return Promise.resolve().then(() => {
        _clearSky();
        __novaSetImageSky(urls, 1, 0, 0);
        return { isTexture: true };
      });
    },
    clearSkybox: _clearSky,
    createSolidSkybox(color = 0) {
      _clearSky();
      setSkyColor(color, color);
      return new Color(color);
    },
    animateSkybox(dt) {
      if (starField) rotation += dt * 0.01 * speed;
    },
    setSkyboxSpeed(value) {
      speed = value;
    },
    enableSkyboxAutoAnimate(value = 1) {
      auto = true;
      speed = value;
    },
    disableSkyboxAutoAnimate() {
      auto = false;
    },
  };
  Object.assign(nova64.light, api);
  Object.assign(globalThis, api);
  globalThis.__nova64TickSky = dt => {
    time += dt;
    if (auto) api.animateSkybox(dt);
    __novaProceduralSkyTime(time, rotation);
  };
})();
