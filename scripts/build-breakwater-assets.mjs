// Original low-poly split-delta hydrofoil, authored as flat-shaded glTF geometry.
// Regenerate with: pnpm exec node scripts/build-breakwater-assets.mjs
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
const colors = [0x0055ff, 0x00ff8a, 0xff1c9e, 0x6938ff, 0x00d5ff, 0xf5faff];
const rgb = hex => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
for (let livery = 0; livery < 6; livery++) {
  const groups = Array.from({ length: 5 }, () => []);
  const tri = (group, a, b, c) => {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((n, i) => n - a[i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(...n) || 1;
    for (const p of [a, b, c]) groups[group].push(...p, ...n.map(x => x / len));
  };
  // Extrude an X/Z outline with an individually sculpted upper surface.
  const hull = (points, bottom, top, group) => {
    const low = points.map(([x, z]) => [x, bottom, z]);
    const high = points.map(([x, z], i) => [x, Array.isArray(top) ? top[i] : top, z]);
    for (let i = 1; i < points.length - 1; i++) {
      tri(group, high[0], high[i + 1], high[i]);
      tri(3, low[0], low[i], low[i + 1]);
    }
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      tri(group, low[i], high[i], high[j]);
      tri(group, low[i], high[j], low[j]);
    }
  };
  hull(
    [
      [0, -4.4],
      [0.65, -1.7],
      [1.05, 1.5],
      [0.55, 2.8],
      [-0.55, 2.8],
      [-1.05, 1.5],
      [-0.65, -1.7],
    ],
    -0.32,
    [0, 0.35, 0.5, 0.2, 0.2, 0.5, 0.35],
    0
  );
  for (const side of [-1, 1]) {
    hull(
      [
        [side * 0.8, -1.6],
        [side * 2.7, 1.7],
        [side * 2.6, 2.5],
        [side * 1.0, 1.9],
      ],
      -0.18,
      [0.05, 0.25, 0.1, 0.4],
      0
    );
    hull(
      [
        [side * 1.45, -3.3],
        [side * 1.95, -1.6],
        [side * 2.15, 2.3],
        [side * 1.35, 2.3],
        [side * 1.05, -1.4],
      ],
      -0.4,
      [0, 0.3, 0.25, 0.25, 0.15],
      0
    );
    hull(
      [
        [side * 1.52, -2.3],
        [side * 1.72, -1.45],
        [side * 1.84, 1.8],
        [side * 1.57, 1.8],
      ],
      0.31,
      0.34,
      1
    );
    hull(
      [
        [side * 2, 1.1],
        [side * 2.16, 1.9],
        [side * 2.05, 2.6],
        [side * 1.91, 1.8],
      ],
      0.23,
      [1.15, 0.65, 0.45, 0.75],
      0
    );
  }
  hull(
    [
      [-0.48, -1.0],
      [0, -1.8],
      [0.48, -1.0],
      [0.55, 0.7],
      [-0.55, 0.7],
    ],
    0.35,
    [0.55, 0.38, 0.55, 0.85, 0.85],
    2
  );
  hull(
    [
      [-0.18, -3.7],
      [0.18, -3.7],
      [0.22, -1.7],
      [-0.22, -1.7],
    ],
    0.1,
    0.14,
    1
  );
  hull(
    [
      [-1.0, 1.1],
      [1.0, 1.1],
      [1.3, 1.65],
      [-1.3, 1.65],
    ],
    0.52,
    0.56,
    1
  );
  // Three inset identification stripes, and bright reactor apertures.
  for (let i = 0; i < 3; i++)
    hull(
      [
        [-0.28 + i * 0.2, 1.9],
        [-0.17 + i * 0.2, 1.9],
        [-0.17 + i * 0.2, 2.45],
        [-0.28 + i * 0.2, 2.45],
      ],
      0.24,
      0.27,
      4
    );
  const palette = [rgb(colors[livery]), rgb(0xecffff), rgb(0x03091f), rgb(0x051947), rgb(0x00ffa2)];
  const buffers = [],
    views = [],
    accessors = [],
    primitives = [];
  let offset = 0;
  for (let group = 0; group < groups.length; group++) {
    const data = new Float32Array(groups[group]),
      count = data.length / 6;
    if (!count) continue;
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i++)
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], data[i * 6 + a]);
        max[a] = Math.max(max[a], data[i * 6 + a]);
      }
    const view = views.length;
    views.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: data.byteLength,
      byteStride: 24,
      target: 34962,
    });
    const pos = accessors.length;
    accessors.push({
      bufferView: view,
      byteOffset: 0,
      componentType: 5126,
      count,
      type: 'VEC3',
      min,
      max,
    });
    accessors.push({ bufferView: view, byteOffset: 12, componentType: 5126, count, type: 'VEC3' });
    primitives.push({ attributes: { POSITION: pos, NORMAL: pos + 1 }, material: group });
    buffers.push(Buffer.from(data.buffer));
    offset += data.byteLength;
  }
  const gltf = {
    asset: { version: '2.0', generator: 'Nova64 original Breakwater split-delta' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'BW-01 Split Delta' }],
    meshes: [{ primitives }],
    materials: palette.map((c, i) => ({
      name: ['Livery', 'Ceramic stripe', 'Canopy', 'Underside', 'Reactor'][i],
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [...c, 1],
        metallicFactor: 0,
        roughnessFactor: 0.65,
      },
      emissiveFactor: c.map(v => v * (i === 4 ? 0.7 : 0.16)),
    })),
    buffers: [{ byteLength: offset }],
    bufferViews: views,
    accessors,
  };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const bin = Buffer.concat(buffers),
    header = Buffer.alloc(12),
    jh = Buffer.alloc(8),
    bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  jh.writeUInt32LE(json.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(bin.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  const name = `hydrofoil-${livery}.glb`,
    dir = 'examples/breakwater-circuit/assets',
    mirror = 'dist/examples/breakwater-circuit/assets';
  await mkdir(dir, { recursive: true });
  await mkdir(mirror, { recursive: true });
  await writeFile(`${dir}/${name}`, Buffer.concat([header, jh, json, bh, bin]));
  await copyFile(`${dir}/${name}`, `${mirror}/${name}`);
}
console.log('Built and mirrored six original hydrofoil liveries.');
