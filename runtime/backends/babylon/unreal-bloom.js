// runtime/backends/babylon/unreal-bloom.js
// Port of three.js UnrealBloomPass (three r182) to a Babylon.js PostProcess
// chain, so nova64.fx.enableBloom(strength, radius, threshold) produces the
// same look on both backends. Babylon's built-in DefaultRenderingPipeline
// bloom is a single blur with a hard luma step; UnrealBloom is a 5-mip
// Gaussian pyramid whose widest levels give the soft, screen-filling halo
// carts are tuned against. Keep this file in lock-step with
// node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js.
//
// Nova64 meshes use PBRMaterial (linear colours, see linearColor3 in
// common.js) and the DefaultRenderingPipeline applies image processing as a
// post-process, so the buffer this chain reads is linear HDR — the same data
// Three's UnrealBloomPass gets between RenderPass and OutputPass.
//
// Chain (attached at the FRONT of the camera's post-processes, so it runs
// before the DefaultRenderingPipeline's FXAA/vignette/image processing, as
// Three's UnrealBloomPass runs before its OutputPass):
//   highPass (1.0) -> [blurH_i, blurV_i] at 1/2, 1/4, ... 1/32 -> composite (1.0)

import { Constants, Effect, PostProcess } from '@babylonjs/core';

const N_MIPS = 5;
const KERNEL_SIZES = [6, 10, 14, 18, 22];
const BLOOM_FACTORS = [1.0, 0.8, 0.6, 0.4, 0.2];
const SMOOTH_WIDTH = 0.01;

Effect.ShadersStore['nova64UnrealHighPassFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float luminosityThreshold;
  uniform float smoothWidth;
  void main(void) {
    vec4 texel = texture2D(textureSampler, vUV);
    float v = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
    float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
    gl_FragColor = mix(vec4(0.0), texel, alpha);
  }
`;

// One shader per kernel radius (KERNEL_RADIUS is a compile-time define).
Effect.ShadersStore['nova64UnrealBlurFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 invSize;
  uniform vec2 direction;
  uniform float gaussianCoefficients[KERNEL_RADIUS];
  void main(void) {
    float weightSum = gaussianCoefficients[0];
    vec3 diffuseSum = texture2D(textureSampler, vUV).rgb * weightSum;
    for (int i = 1; i < KERNEL_RADIUS; i++) {
      float x = float(i);
      float w = gaussianCoefficients[i];
      vec2 uvOffset = direction * invSize * x;
      vec3 sample1 = texture2D(textureSampler, vUV + uvOffset).rgb;
      vec3 sample2 = texture2D(textureSampler, vUV - uvOffset).rgb;
      diffuseSum += (sample1 + sample2) * w;
    }
    gl_FragColor = vec4(diffuseSum, 1.0);
  }
`;

// Three composites the mips into a half-res target and then additively
// blends it over the scene; doing both in one full-res pass is equivalent
// (bilinear upsampling of the same mips) and saves a target.
Effect.ShadersStore['nova64UnrealCompositeFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D sceneSampler;
  uniform sampler2D blurTexture1;
  uniform sampler2D blurTexture2;
  uniform sampler2D blurTexture3;
  uniform sampler2D blurTexture4;
  uniform sampler2D blurTexture5;
  uniform float bloomStrength;
  uniform float bloomRadius;
  uniform float bloomFactors[5];
  float lerpBloomFactor(const in float factor) {
    float mirrorFactor = 1.2 - factor;
    return mix(factor, mirrorFactor, bloomRadius);
  }
  void main(void) {
    vec4 scene = texture2D(sceneSampler, vUV);
    vec3 bloom = 3.0 * bloomStrength * (
      lerpBloomFactor(bloomFactors[0]) * texture2D(blurTexture1, vUV).rgb +
      lerpBloomFactor(bloomFactors[1]) * texture2D(blurTexture2, vUV).rgb +
      lerpBloomFactor(bloomFactors[2]) * texture2D(blurTexture3, vUV).rgb +
      lerpBloomFactor(bloomFactors[3]) * texture2D(blurTexture4, vUV).rgb +
      lerpBloomFactor(bloomFactors[4]) * texture2D(blurTexture5, vUV).rgb
    );
    gl_FragColor = vec4(scene.rgb + bloom, scene.a);
  }
`;

/** Same coefficients as UnrealBloomPass._getSeparableBlurMaterial(). */
export function gaussianCoefficients(kernelRadius) {
  const sigma = kernelRadius / 3;
  const out = [];
  for (let i = 0; i < kernelRadius; i++) {
    out.push((0.39894 * Math.exp((-0.5 * i * i) / (sigma * sigma))) / sigma);
  }
  return out;
}

export function createUnrealBloom(scene, camera, { strength = 1, radius = 0, threshold = 0 } = {}) {
  const engine = scene.getEngine();
  const caps = engine.getCaps?.() ?? {};
  // HDR intermediate targets like Three's HalfFloatType render targets, so
  // emissive values > 1.0 survive into the high-pass.
  const textureType = caps.textureHalfFloatRender
    ? Constants.TEXTURETYPE_HALF_FLOAT
    : Constants.TEXTURETYPE_UNSIGNED_BYTE;
  const LINEAR = Constants.TEXTURE_BILINEAR_SAMPLINGMODE;

  const state = { strength, radius, threshold };
  const passes = [];
  const make = (name, shader, uniforms, samplers, size, defines = null) => {
    const pp = new PostProcess(
      name,
      shader,
      uniforms,
      samplers,
      size,
      null,
      LINEAR,
      engine,
      false,
      defines,
      textureType
    );
    passes.push(pp);
    return pp;
  };

  const highPass = make(
    'nova64UnrealHighPass',
    'nova64UnrealHighPass',
    ['luminosityThreshold', 'smoothWidth'],
    null,
    1.0
  );
  highPass.onApply = effect => {
    effect.setFloat('luminosityThreshold', state.threshold);
    effect.setFloat('smoothWidth', SMOOTH_WIDTH);
  };

  const verticals = [];
  for (let i = 0; i < N_MIPS; i++) {
    const size = 0.5 / 2 ** i;
    const k = KERNEL_SIZES[i];
    const coeffs = gaussianCoefficients(k);
    for (const dir of [
      [1, 0],
      [0, 1],
    ]) {
      const pp = make(
        `nova64UnrealBlur${i}${dir[0] ? 'H' : 'V'}`,
        'nova64UnrealBlur',
        ['invSize', 'direction', 'gaussianCoefficients'],
        null,
        size,
        `#define KERNEL_RADIUS ${k}`
      );
      // Three uses the *output* mip's texel size for both passes of mip i.
      pp.onApply = effect => {
        effect.setFloat2('invSize', 1 / Math.max(1, pp.width), 1 / Math.max(1, pp.height));
        effect.setFloat2('direction', dir[0], dir[1]);
        effect.setFloatArray('gaussianCoefficients', coeffs);
      };
      if (dir[1]) verticals.push(pp);
    }
  }

  const composite = make(
    'nova64UnrealComposite',
    'nova64UnrealComposite',
    ['bloomStrength', 'bloomRadius', 'bloomFactors'],
    [
      'sceneSampler',
      'blurTexture1',
      'blurTexture2',
      'blurTexture3',
      'blurTexture4',
      'blurTexture5',
    ],
    1.0
  );
  composite.onApply = effect => {
    // highPass's *input* is the full-res scene render.
    effect.setTextureFromPostProcess('sceneSampler', highPass);
    verticals.forEach((v, i) => effect.setTextureFromPostProcessOutput(`blurTexture${i + 1}`, v));
    effect.setFloat('bloomStrength', state.strength);
    effect.setFloat('bloomRadius', state.radius);
    effect.setFloatArray('bloomFactors', BLOOM_FACTORS);
  };

  // Front of the camera chain, in order (scene renders into highPass's input).
  passes.forEach((pp, i) => camera.attachPostProcess(pp, i));

  return {
    get strength() {
      return state.strength;
    },
    set strength(v) {
      state.strength = v;
    },
    get radius() {
      return state.radius;
    },
    set radius(v) {
      state.radius = v;
    },
    get threshold() {
      return state.threshold;
    },
    set threshold(v) {
      state.threshold = v;
    },
    passes,
    dispose() {
      for (const pp of passes) pp.dispose(camera);
      passes.length = 0;
    },
  };
}
