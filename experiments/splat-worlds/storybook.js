// Original, deterministic Nova64 scenery under the repository MIT license.
// Authored geometry is sampled into Gaussian splats, not trained from images.
const trees = [
  [-6, -6],
  [6, -6],
  [-7, 1],
  [7, 1],
  [-6, 6],
  [6, 6],
];
const rocks = [
  [-4, 5, 1.2],
  [4, 7, 1],
  [-5, 9, 0.8],
];
export const storybookWorlds = [
  {
    id: 'voxel-grove',
    name: 'MOONBLOOM / VOXEL FANTASY GROVE',
    file: 'voxel-grove.splat',
    door: [0, 1.6, -2],
    background: 0x17233d,
    floor: 0x243c37,
    accent: 0x9c83ff,
    walk: {
      bounds: [-9.5, -10, 9.5, 10],
      blockers: [
        ...trees.map(([x, z]) => [x - 0.5, z - 0.5, x + 0.5, z + 0.5]),
        [-3, -7, -2, -5],
        [2, -7, 3, -5],
        [-5.4, -8, -3.8, -6.4],
        [3.8, -8, 5.4, -6.4],
        [-1.2, -9.8, 1.2, -8.2],
      ],
    },
  },
  {
    id: 'zen-garden',
    name: 'STILLWATER / ZEN GARDEN',
    file: 'zen-garden.splat',
    door: [0, 1.6, 0],
    background: 0x607d80,
    floor: 0xa5997c,
    accent: 0xf5c98d,
    walk: {
      bounds: [-9.5, -3, 9.5, 12],
      blockers: [
        ...rocks.map(([x, z, r]) => [x - r, z - r, x + r, z + r]),
        [-7.5, 2, -5.5, 3.5],
        [5.5, 2, 7.5, 3.5],
        [-3.4, 2.6, -2.6, 3.4],
        [2.6, 2.6, 3.4, 3.4],
        [-2.6, 8.6, -2.1, 9.4],
        [2.1, 8.6, 2.6, 9.4],
        [5, 5, 8, 8],
      ],
    },
  },
];

export function generateStorybookWorld(id) {
  const splats = [];
  const noise = (x, y, z) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
  };
  function point(x, y, z, color, scale = [0.085, 0.085, 0.085], shade = 1) {
    const variation = 0.92 + noise(x, y, z) * 0.16;
    splats.push([
      x,
      y,
      z,
      ...scale,
      ...color.map(c => Math.min(255, Math.round(c * shade * variation))),
    ]);
  }
  function box(cx, cy, cz, w, h, d, color, step = 0.15) {
    const sizes = [w, h, d],
      center = [cx, cy, cz];
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3,
        v = (axis + 2) % 3;
      const nu = Math.ceil(sizes[u] / step),
        nv = Math.ceil(sizes[v] / step);
      for (const side of [-1, 1]) {
        for (let a = 0; a <= nu; a++)
          for (let b = 0; b <= nv; b++) {
            const p = [...center];
            p[axis] += (side * sizes[axis]) / 2;
            p[u] += (a / nu - 0.5) * sizes[u];
            p[v] += (b / nv - 0.5) * sizes[v];
            point(
              ...p,
              color,
              [step * 0.61, step * 0.61, step * 0.61],
              axis === 1 && side === 1 ? 1 : axis === 0 ? 0.78 : 0.62
            );
          }
      }
    }
  }
  function ellipsoid(cx, cy, cz, rx, ry, rz, color, count = 1400) {
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const a = i * 2.399963229728653;
      const r = Math.sqrt(1 - y * y);
      point(
        cx + rx * Math.cos(a) * r,
        cy + ry * y,
        cz + rz * Math.sin(a) * r,
        color,
        [0.095, 0.095, 0.095],
        0.7 + 0.3 * Math.max(0, y)
      );
    }
  }
  function ground(zen) {
    for (let x = -10; x <= 10; x += 0.14)
      for (let z = zen ? -3.5 : -10.5; z <= (zen ? 12.5 : 10.5); z += 0.14) {
        const path = Math.abs(x) < 1.2;
        let color;
        if (zen) {
          const nearest = Math.min(...rocks.map(([rx, rz]) => Math.hypot(x - rx, z - rz)));
          const rake = 0.86 + 0.14 * Math.cos(nearest * 28);
          color = [214 * rake, 199 * rake, 163 * rake];
        } else color = path ? [117, 111, 153] : [48, 103 + 12 * Math.sin(x * 1.4 + z), 82];
        if (zen && x > 5 && x < 8 && z > 5 && z < 8)
          color = [44, 121 + 15 * Math.cos(x * 8 + z * 3), 128];
        point(x, 0, z, color, [0.095, 0.025, 0.095]);
      }
  }
  if (id === 'voxel-grove') {
    ground(false);
    // Exposed block walls make the island silhouette read as voxel terrain.
    for (let x = -10; x <= 10; x += 0.7)
      for (const z of [-10.5, 10.5]) box(x, -0.75, z, 0.7, 1.5, 0.7, [58, 58, 98], 0.23);
    for (let z = -10; z <= 10; z += 0.7)
      for (const x of [-10, 10]) box(x, -0.75, z, 0.7, 1.5, 0.7, [58, 58, 98], 0.23);
    for (const [i, [x, z]] of trees.entries()) {
      box(x, 1.45, z, 0.7, 2.9, 0.7, [98, 70, 108]);
      const color = i % 2 ? [93, 171, 176] : [163, 107, 185];
      box(x, 3, z, 2.8, 1.1, 2.8, color, 0.2);
      box(x + 0.4, 3.9, z, 2.1, 0.8, 2.1, color, 0.2);
      box(x - 0.3, 4.5, z, 1.1, 0.5, 1.3, color, 0.2);
    }
    // Ruined arch, two crenellated towers and a luminous crystal altar.
    for (const x of [-2.5, 2.5]) box(x, 1.75, -6, 1, 3.5, 2, [129, 123, 167]);
    box(0, 3.6, -6, 6, 0.7, 1.2, [163, 149, 197]);
    for (const x of [-4.6, 4.6]) {
      box(x, 1.7, -7.2, 1.6, 3.4, 1.6, [123, 123, 164]);
      for (const dx of [-0.55, 0.55])
        for (const dz of [-0.55, 0.55]) box(x + dx, 3.6, -7.2 + dz, 0.5, 0.6, 0.5, [183, 162, 202]);
    }
    box(0, 0.35, -9, 2.4, 0.7, 1.6, [126, 111, 164]);
    for (let layer = 0; layer < 12; layer++) {
      const width = (1 - Math.abs(layer - 4) / 9) * 0.85;
      box(0, 0.9 + layer * 0.17, -9, width, 0.18, width, [110, 231, 242], 0.12);
    }
    for (let i = 0; i < 22; i++) {
      const x = (i % 2 ? -1 : 1) * (2 + noise(i, 0, 0) * 6);
      const z = -4 + noise(i, 1, 0) * 13;
      box(x, 0.22, z, 0.13, 0.44, 0.13, [75, 126, 117], 0.13);
      box(x, 0.48, z, 0.48, 0.2, 0.48, [225, 143, 218], 0.12);
    }
  } else if (id === 'zen-garden') {
    ground(true);
    for (const [x, z, r] of rocks) {
      ellipsoid(x, r * 0.55, z, r, r * 0.9, r * 0.8, [103, 120, 112]);
      ellipsoid(x - 0.12, r * 0.95, z, r * 0.8, r * 0.18, r * 0.65, [96, 132, 87], 700);
    }
    // Stepping stones keep the central walk route legible.
    for (let z = 1.8; z <= 11; z += 1.15)
      ellipsoid(Math.sin(z) * 0.25, 0.04, z, 0.65, 0.06, 0.43, [142, 151, 142], 400);
    for (const x of [-6.5, 6.5]) {
      box(x, 1.35, 2.8, 0.4, 2.7, 0.4, [105, 83, 63]);
      for (let i = 0; i < 5; i++) {
        ellipsoid(
          x + Math.sin(i * 2.4) * 1.1,
          3 + 0.3 * Math.cos(i),
          2.8 + Math.cos(i * 2.4) * 0.9,
          1.1,
          0.6,
          1,
          [194, 156 + i * 5, 163],
          850
        );
      }
    }
    for (const x of [-3, 3]) {
      box(x, 0.15, 3, 0.8, 0.3, 0.8, [114, 128, 119]);
      box(x, 0.65, 3, 0.25, 0.8, 0.25, [146, 151, 128]);
      box(x, 1.2, 3, 0.65, 0.45, 0.65, [244, 208, 135]);
      box(x, 1.5, 3, 1, 0.18, 1, [104, 119, 106]);
    }
    // A torii frames the garden's far end, open beneath its crossbeam.
    for (const x of [-2.35, 2.35]) box(x, 1.8, 9, 0.45, 3.6, 0.65, [153, 69, 49]);
    box(0, 3.5, 9, 6, 0.3, 0.8, [169, 79, 54]);
    box(0, 3, 9, 5.2, 0.18, 0.4, [117, 55, 42]);
    for (let i = 0; i < 20; i++) {
      const x = -9 + noise(i, 4, 2) * 18;
      const z = 11.6 + noise(i, 5, 3) * 0.5;
      box(x, 1.9, z, 0.12, 3.8, 0.12, [83, 137, 86], 0.15);
      for (let y = 0.6; y < 3.8; y += 0.5) box(x, y, z, 0.19, 0.07, 0.19, [136, 163, 103], 0.12);
    }
    for (const x of [-9.8, 9.8]) box(x, 0.4, 4.7, 0.25, 0.8, 16, [114, 105, 76], 0.2);
  } else throw new Error('Unknown storybook world: ' + id);

  // Standard .splat layout: xyz float32, scale float32, RGBA8, wxyz UNORM8.
  // Hosts apply a pi X rotation to source assets, so store Y/Z inverted here.
  const bytes = new Uint8Array(splats.length * 32);
  const view = new DataView(bytes.buffer);
  splats.forEach((s, i) => {
    const o = i * 32;
    [s[0], -s[1], -s[2], s[3], s[4], s[5]].forEach((v, j) => view.setFloat32(o + j * 4, v, true));
    bytes.set([...s.slice(6), 255, 255, 128, 128, 128], o + 24);
  });
  return bytes;
}
