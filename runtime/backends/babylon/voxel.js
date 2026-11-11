// runtime/backends/babylon/voxel.js
// Babylon-native voxel helpers for chunk meshes, atlas materials, and simple entity meshes.

import {
  Color3,
  Constants,
  Effect,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Vector2,
  VertexData,
} from '@babylonjs/core';

import {
  applyBabylonMaterialCompatibility,
  applyBabylonMeshCompatibility,
  applyBabylonTextureCompatibility,
} from './compat.js';
import { linearToSrgb, srgbToLinear } from './common.js';

const VOXEL_SHADER_NAME = 'nova64VoxelChunk';

// ── Three.js voxel lighting parity ─────────────────────────────────────────
// On Three.js, voxel chunks are a lit MeshStandardMaterial (roughness 0.8,
// metalness 0.1) under the default rig plus an environment map, and the
// result is sRGB-encoded. Babylon draws chunks unlit, so the baked vertex
// colours used to show raw — flat, and brighter/greener than on Three.
// Voxel faces are axis-aligned, so Three's lighting is one RGB factor per
// face direction; we bake linearToSrgb(colour * F(face)) into the vertex
// colours. Values below were measured from the Three.js backend
// (white cube, same material, rendered to a float target per face).
const SRGB = hex =>
  [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff].map(v => srgbToLinear(v / 255));
const THREE_RIG = {
  diffuse: 0.9 / Math.PI, // (1 - metalness) * BRDF_Lambert
  ambient: 0.3,
  hemiSky: SRGB(0xc8d8ff),
  hemiGround: SRGB(0x383838),
  hemiIntensity: 0.5,
  dir: [5, 8, 3].map(v => v / Math.hypot(5, 8, 3)),
  dirIntensity: 1.5,
};
// Environment term per face [+x, -x, +y, -y, +z, -z]:
// default RoomEnvironment (grey), measured on Three.
const ROOM_ENV = [0.87, 0.734, 1.429, 0.697, 1.454, 0.638];
// Procedural sky dome env ~ horizon colour scaled per face (fitted on Three).
const SKY_ENV_SCALE = [0.82, 0.82, 0.92, 0.52, 0.82, 0.82];
const FACE_NORMALS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** RGB light factors per face, for the current sky (linear Color3 horizon or null). */
export function voxelFaceLight(skyHorizon = null) {
  const R = THREE_RIG;
  return FACE_NORMALS.map((n, f) => {
    const t = 0.5 * n[1] + 0.5;
    const ndl = Math.max(0, n[0] * R.dir[0] + n[1] * R.dir[1] + n[2] * R.dir[2]);
    const horizon = skyHorizon ? [skyHorizon.r, skyHorizon.g, skyHorizon.b] : null;
    return [0, 1, 2].map(i => {
      const hemi = R.hemiGround[i] + (R.hemiSky[i] - R.hemiGround[i]) * t;
      const direct = R.diffuse * (R.ambient + R.hemiIntensity * hemi + R.dirIntensity * ndl);
      const env = horizon ? horizon[i] * SKY_ENV_SCALE[f] : ROOM_ENV[f];
      return direct + env;
    });
  });
}

function faceIndex(nx, ny, nz) {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  if (ay >= ax && ay >= az) return ny >= 0 ? 2 : 3;
  if (ax >= az) return nx >= 0 ? 0 : 1;
  return nz >= 0 ? 4 : 5;
}

/** Bake Three-equivalent lighting into RGBA vertex colours (returns a new array). */
export function lightVoxelColors(colors, normals, faceLight) {
  const out = new Float32Array(colors.length);
  const vertexCount = colors.length / 4;
  for (let v = 0; v < vertexCount; v++) {
    const F = faceLight[faceIndex(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2])];
    for (let i = 0; i < 3; i++) out[v * 4 + i] = linearToSrgb(colors[v * 4 + i] * F[i]);
    out[v * 4 + 3] = colors[v * 4 + 3];
  }
  return out;
}

function ensureVoxelShaderRegistered() {
  if (Effect.ShadersStore[`${VOXEL_SHADER_NAME}VertexShader`]) return;

  Effect.ShadersStore[`${VOXEL_SHADER_NAME}VertexShader`] = `
    precision highp float;

    attribute vec3 position;
    attribute vec2 uv;
    attribute vec2 uv2;
    attribute vec4 color;

    uniform mat4 worldViewProjection;

    varying vec2 vUv;
    varying vec2 vUv2;
    varying vec4 vColor;

    void main(void) {
      gl_Position = worldViewProjection * vec4(position, 1.0);
      vUv = uv;
      vUv2 = uv2;
      vColor = color;
    }
  `;

  Effect.ShadersStore[`${VOXEL_SHADER_NAME}FragmentShader`] = `
    precision highp float;

    varying vec2 vUv;
    varying vec2 vUv2;
    varying vec4 vColor;

    uniform sampler2D textureSampler;
    uniform vec2 uTileSize;
    uniform float uOpacity;
    uniform float uUseAtlasTiling;

    void main(void) {
      vec2 sampleUv = vUv;
      if (uUseAtlasTiling > 0.5) {
        // Babylon.js DynamicTexture has inverted Y compared to Three.js CanvasTexture.
        // Flip V coordinate: sample from (1 - v) to match Three.js UV convention.
        vec2 tileOrigin = vec2(vUv2.x, 1.0 - vUv2.y - uTileSize.y);
        vec2 tileOffset = fract(vUv) * uTileSize;
        tileOffset.y = uTileSize.y - tileOffset.y; // flip within tile too
        sampleUv = tileOrigin + tileOffset;
      }

      vec4 texel = texture2D(textureSampler, sampleUv);
      vec4 outColor = vec4(texel.rgb * vColor.rgb, texel.a * vColor.a * uOpacity);

      if (outColor.a <= 0.01) {
        discard;
      }

      gl_FragColor = outColor;
    }
  `;
}

function cloneFloatArray(values, translate = null, stride = 1) {
  const source =
    values instanceof Float32Array
      ? values
      : values
        ? new Float32Array(values)
        : new Float32Array(0);

  if (!translate || stride !== 3) return source;

  const cloned = new Float32Array(source);
  for (let i = 0; i < cloned.length; i += 3) {
    cloned[i] += translate[0] ?? 0;
    cloned[i + 1] += translate[1] ?? 0;
    cloned[i + 2] += translate[2] ?? 0;
  }
  return cloned;
}

function cloneIndexArray(values) {
  if (values instanceof Uint16Array || values instanceof Uint32Array) return values;
  return values ? new Uint32Array(values) : new Uint32Array(0);
}

function expandColors(colors) {
  const source =
    colors instanceof Float32Array
      ? colors
      : colors
        ? new Float32Array(colors)
        : new Float32Array(0);
  if (source.length === 0) return source;
  if (source.length % 4 === 0) return source;

  const expanded = new Float32Array((source.length / 3) * 4);
  for (let src = 0, dst = 0; src < source.length; src += 3, dst += 4) {
    expanded[dst] = source[src];
    expanded[dst + 1] = source[src + 1];
    expanded[dst + 2] = source[src + 2];
    expanded[dst + 3] = 1;
  }
  return expanded;
}

function toColor3(hex) {
  return Color3.FromHexString(`#${(Number(hex) & 0xffffff).toString(16).padStart(6, '0')}`);
}

function getWhiteTexture(self) {
  if (!self._voxelWhiteTexture) {
    self._voxelWhiteTexture = self._adapter.createDataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      {
        filter: 'nearest',
        wrap: 'repeat',
        generateMipmaps: false,
      }
    );
  }
  return self._voxelWhiteTexture;
}

function createChunkShaderMaterial(self, opts = {}) {
  ensureVoxelShaderRegistered();

  const transparent = !!opts.transparent || (opts.opacity ?? 1) < 1;
  const texture = applyBabylonTextureCompatibility(opts.texture ?? getWhiteTexture(self));
  const material = new ShaderMaterial(
    `nova64_voxel_chunk_${self._counter + 1}`,
    self.scene,
    {
      vertex: VOXEL_SHADER_NAME,
      fragment: VOXEL_SHADER_NAME,
    },
    {
      attributes: ['position', 'uv', 'uv2', 'color'],
      uniforms: ['worldViewProjection', 'uTileSize', 'uOpacity', 'uUseAtlasTiling'],
      samplers: ['textureSampler'],
      needAlphaBlending: transparent,
      needAlphaTesting: transparent,
    }
  );

  material.setTexture('textureSampler', texture);
  material.setVector2('uTileSize', new Vector2(opts.tileSizeU ?? 1, opts.tileSizeV ?? 1));
  material.setFloat('uOpacity', opts.opacity ?? 1);
  material.setFloat('uUseAtlasTiling', opts.atlasTiling ? 1 : 0);
  material.backFaceCulling = false;
  material.separateCullingPass = false;
  material.alphaMode = Constants.ALPHA_COMBINE;
  material.fogEnabled = true;

  return applyBabylonMaterialCompatibility(material);
}

function createLitChunkMaterial(self, opts = {}) {
  const transparent = !!opts.transparent || (opts.opacity ?? 1) < 1;
  const texture = applyBabylonTextureCompatibility(opts.texture ?? getWhiteTexture(self));
  const material = new StandardMaterial(`nova64_voxel_chunk_${self._counter + 1}`, self.scene);

  // Voxel colors are pre-baked in vertex colors (including AO and lighting).
  // We use emissive channel to display them without scene lighting re-modulating.
  // This matches Three.js MeshStandardMaterial with vertexColors=true behavior.
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(1, 1, 1); // Full brightness, no tint

  // Disable scene lighting - vertex colors already include lighting/AO
  material.disableLighting = true;

  // Enable vertex colors to modulate the emissive output
  material.useVertexColors = true;
  material.useVertexAlpha = transparent;

  // Diffuse not needed since we use emissive, but set for consistency
  material.diffuseColor = new Color3(0, 0, 0);
  material.ambientColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);

  // Rendering settings
  material.alpha = opts.opacity ?? 1;
  material.backFaceCulling = false;
  material.separateCullingPass = false;
  material.alphaMode = Constants.ALPHA_COMBINE;
  material.fogEnabled = true;

  if (transparent) {
    texture.hasAlpha = true;
    material.opacityTexture = texture;
    if ('useAlphaFromDiffuseTexture' in material) {
      material.useAlphaFromDiffuseTexture = true;
    }
  }

  return applyBabylonMaterialCompatibility(material);
}

export function createBabylonVoxelApi(self) {
  // Chunk meshes keep their unlit colours so they can be re-lit when the sky
  // (and so the environment lighting) changes.
  const litChunks = new Set();
  let faceLight = voxelFaceLight(null);

  // Called by the skybox module: linear horizon Color3 of a baked procedural
  // sky, or null when the default environment applies.
  self._setVoxelSkyLight = skyHorizon => {
    faceLight = voxelFaceLight(skyHorizon);
    for (const mesh of litChunks) {
      if (mesh.isDisposed?.()) {
        litChunks.delete(mesh);
        continue;
      }
      const src = mesh._nova64VoxelSrc;
      mesh.setVerticesData('color', lightVoxelColors(src.colors, src.normals, faceLight), true);
    }
  };

  return {
    createVoxelTextureFromCanvas(canvas) {
      if (!canvas) return null;
      return self._adapter.createCanvasTexture(canvas, {
        filter: 'nearest',
        wrap: 'repeat',
        generateMipmaps: false,
      });
    },

    createVoxelTextureFromImage(image) {
      if (!image || typeof document === 'undefined') return null;

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width || 1;
      canvas.height = image.naturalHeight || image.height || 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return this.createVoxelTextureFromCanvas(canvas);
    },

    createVoxelChunkMaterial(opts = {}) {
      if (!opts.atlasTiling) {
        return createLitChunkMaterial(self, opts);
      }
      return createChunkShaderMaterial(self, opts);
    },

    createVoxelChunkMesh(meshData, material, opts = {}) {
      if (!meshData?.positions?.length) return null;

      const mesh = new Mesh(opts.name || `nova64_voxel_chunk_${self._counter + 1}`, self.scene);
      const vertexData = new VertexData();

      vertexData.positions = cloneFloatArray(meshData.positions, opts.translate, 3);
      vertexData.normals = cloneFloatArray(meshData.normals);
      const baseColors = expandColors(meshData.colors);
      vertexData.colors = baseColors.length
        ? lightVoxelColors(baseColors, vertexData.normals, faceLight)
        : baseColors;
      vertexData.uvs = cloneFloatArray(meshData.uvs);
      vertexData.uvs2 = cloneFloatArray(meshData.uv2s);
      vertexData.indices = cloneIndexArray(meshData.indices);
      vertexData.applyToMesh(mesh, false);

      mesh.material = applyBabylonMaterialCompatibility(material);
      mesh.position.set(opts.position?.[0] ?? 0, opts.position?.[1] ?? 0, opts.position?.[2] ?? 0);
      mesh.receiveShadows = opts.receiveShadow !== false;
      mesh.castShadow = !!opts.castShadow;
      mesh.renderingGroupId = opts.renderOrder && opts.renderOrder > 0 ? 1 : 0;
      mesh.alphaIndex = opts.renderOrder ?? 0;

      if (baseColors.length) {
        mesh._nova64VoxelSrc = { colors: baseColors, normals: vertexData.normals };
        litChunks.add(mesh);
        mesh.onDisposeObservable?.add(() => litChunks.delete(mesh));
      }

      applyBabylonMeshCompatibility(mesh);
      return mesh;
    },

    createVoxelEntityMaterial(color = 0xffffff) {
      const material = new StandardMaterial(`nova64_voxel_entity_${self._counter + 1}`, self.scene);
      material.diffuseColor = toColor3(color);
      material.ambientColor = new Color3(1, 1, 1);
      material.specularColor = new Color3(0.08, 0.08, 0.08);
      material.specularPower = 32;
      return applyBabylonMaterialCompatibility(material);
    },

    createVoxelEntityMesh(size = [1, 1, 1], material) {
      const mesh = MeshBuilder.CreateBox(
        `nova64_voxel_entity_${self._counter + 1}`,
        {
          width: size[0] ?? 1,
          height: size[1] ?? 1,
          depth: size[2] ?? 1,
        },
        self.scene
      );
      mesh.material = applyBabylonMaterialCompatibility(material);
      mesh.receiveShadows = true;
      mesh.castShadow = true;
      applyBabylonMeshCompatibility(mesh);
      return mesh;
    },

    disposeVoxelMesh(mesh) {
      mesh?.dispose?.(false, false);
    },
  };
}
