// runtime/backends/babylon/common.js
// Shared Babylon backend helpers.

import { Color3, Vector3 } from '@babylonjs/core';

function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// Returns a 0xRRGGBB number. rgba8() colours are BigInts packing four 16-bit
// channels (R<<48 | G<<32 | B<<16 | A); Number(bigint) lost precision and read
// the wrong bits, so every rgba8() colour came out wrong on Babylon.
export function normalizeColorValue(color) {
  if (typeof color === 'bigint') {
    const r = Math.round(Number((color >> 48n) & 0xffffn) / 257);
    const g = Math.round(Number((color >> 32n) & 0xffffn) / 257);
    const b = Math.round(Number((color >> 16n) & 0xffffn) / 257);
    return (r << 16) | (g << 8) | b;
  }
  return color ?? 0;
}

export function hexToColor3(hex) {
  const value = normalizeColorValue(hex);
  return new Color3(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255
  );
}

export const srgbToLinear = c =>
  c <= 0.04045 ? Math.max(0, c) / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
export const linearToSrgb = c =>
  c <= 0.0031308 ? Math.max(0, c) * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/**
 * sRGB hex colour -> linear Color3, which is what PBRMaterial expects for
 * albedo/emissive. Three.js does the same conversion (ColorManagement) when a
 * hex is assigned to a material colour; passing raw sRGB values made Babylon
 * meshes brighter and more washed out than Three, and pushed emissive
 * surfaces over the bloom threshold that stay under it on Three.
 */
export function linearColor3(color, intensity = 1) {
  const k = Math.max(0, Number(intensity) || 0);
  return new Color3(
    srgbToLinear(color.r) * k,
    srgbToLinear(color.g) * k,
    srgbToLinear(color.b) * k
  );
}

/**
 * For gamma-space StandardMaterial: apply an emissive intensity in linear
 * space like Three does, then re-encode, so the on-screen colour matches.
 */
export function gammaEmissiveColor3(color, intensity = 1) {
  const k = Math.max(0, Number(intensity) || 0);
  return new Color3(
    linearToSrgb(srgbToLinear(color.r) * k),
    linearToSrgb(srgbToLinear(color.g) * k),
    linearToSrgb(srgbToLinear(color.b) * k)
  );
}

/** Emissive colour for any Babylon material, matching Three's result. */
export function emissiveColor3For(material, color, intensity = 1) {
  return material?.getClassName?.() === 'PBRMaterial'
    ? linearColor3(color, intensity)
    : gammaEmissiveColor3(color, intensity);
}

export function normalizePosition(pos) {
  if (Array.isArray(pos) && pos.length >= 3) return new Vector3(pos[0], pos[1], pos[2]);
  if (pos && typeof pos === 'object' && pos.x !== undefined) {
    return new Vector3(pos.x, pos.y ?? 0, pos.z ?? 0);
  }
  return Vector3.Zero();
}

export function normalizeVectorArgs(x, y, z, fallback = 0) {
  if (Array.isArray(x)) {
    return {
      x: toFiniteNumber(x[0], fallback),
      y: toFiniteNumber(x[1], fallback),
      z: toFiniteNumber(x[2], fallback),
    };
  }

  if (x && typeof x === 'object') {
    return {
      x: toFiniteNumber(x.x, fallback),
      y: toFiniteNumber(x.y, fallback),
      z: toFiniteNumber(x.z, fallback),
    };
  }

  return {
    x: toFiniteNumber(x, fallback),
    y: toFiniteNumber(y, fallback),
    z: toFiniteNumber(z, fallback),
  };
}

export function normalizePointLightArgs(distanceOrPosition, x, y, z, defaultDistance = 20) {
  if (
    Array.isArray(distanceOrPosition) ||
    (distanceOrPosition && typeof distanceOrPosition === 'object')
  ) {
    return {
      distance: defaultDistance,
      position: normalizeVectorArgs(distanceOrPosition, 0, 0, 0),
    };
  }

  if (Array.isArray(x) || (x && typeof x === 'object')) {
    return {
      distance: toFiniteNumber(distanceOrPosition, defaultDistance),
      position: normalizeVectorArgs(x, y, z, 0),
    };
  }

  return {
    distance: toFiniteNumber(distanceOrPosition, defaultDistance),
    position: normalizeVectorArgs(x, y, z, 0),
  };
}

export function isBabylonVerboseDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('babylonDebug') === '1') return true;
  try {
    return window.localStorage?.getItem('nova64:babylonDebug') === '1';
  } catch {
    return false;
  }
}
