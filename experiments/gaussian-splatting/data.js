// Feasibility data contract, not a frozen runtime file format.
// Gaussian PLY: xyz, log-scale, wxyz rotation, logit opacity and SH DC color.
export const MAX_SPLATS = 16384;
const C0 = 0.28209479177387814;
const linear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function validateSplats(data) {
  const count = data.positions?.length / 3;
  if (!Number.isInteger(count) || count < 1 || count > MAX_SPLATS)
    throw new RangeError('Prototype requires 1–16384 Gaussians');
  for (const [name, size] of [
    ['positions', 3],
    ['scales', 3],
    ['rotations', 4],
    ['colors', 4],
  ]) {
    const values = data[name];
    if (
      !(values instanceof Float32Array) ||
      values.length !== count * size ||
      !values.every(Number.isFinite)
    )
      throw new TypeError(`Invalid ${name}`);
  }
  if (data.scales.some(v => v <= 0)) throw new RangeError('Gaussian scales must be positive');
  if (data.colors.some(v => v < 0 || v > 1))
    throw new RangeError('Colors and opacity must be in [0,1]');
  for (let i = 0; i < count; i++)
    if (Math.hypot(...data.rotations.subarray(i * 4, i * 4 + 4)) < 1e-8)
      throw new RangeError('Zero Gaussian quaternion');
  return count;
}

export function decodeGaussianPly(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 16 * 1024 * 1024)
    throw new RangeError('Prototype PLY limit is 16 MiB');
  const headerText = new TextDecoder().decode(bytes.subarray(0, 65536));
  const end = /^end_header\r?\n/m.exec(headerText);
  if (!headerText.startsWith('ply\n') && !headerText.startsWith('ply\r\n'))
    throw new Error('Not a PLY file');
  if (!end) throw new Error('Missing or oversized PLY header');
  const header = headerText.slice(0, end.index);
  const format = /^format (ascii|binary_little_endian) 1\.0\r?$/m.exec(header)?.[1];
  if (!format) throw new Error('Only ASCII and binary little-endian PLY 1.0 are supported');
  const elements = [...header.matchAll(/^element (\w+) (\d+)\r?$/gm)];
  if (elements.length !== 1 || elements[0][1] !== 'vertex')
    throw new Error('Expected one Gaussian vertex element');
  const count = Number(elements[0][2]);
  if (count < 1 || count > MAX_SPLATS)
    throw new RangeError('Prototype Gaussian count limit exceeded');
  const propertyLines = header.split(/\r?\n/).filter(line => line.startsWith('property '));
  const names = propertyLines.map(line => {
    const match = /^property (?:float|float32) (\w+)$/.exec(line);
    if (!match) throw new Error('Only scalar float32 Gaussian properties are supported');
    return match[1];
  });
  if (new Set(names).size !== names.length) throw new Error('Duplicate PLY property');
  const required = [
    'x',
    'y',
    'z',
    'scale_0',
    'scale_1',
    'scale_2',
    'rot_0',
    'rot_1',
    'rot_2',
    'rot_3',
    'opacity',
    'f_dc_0',
    'f_dc_1',
    'f_dc_2',
  ];
  for (const name of required)
    if (!names.includes(name)) throw new Error(`Missing Gaussian property ${name}`);
  const offset = new TextEncoder().encode(headerText.slice(0, end.index + end[0].length)).length;
  const body = bytes.subarray(offset),
    stride = names.length;
  let read;
  if (format === 'binary_little_endian') {
    if (body.length !== count * stride * 4)
      throw new Error('Truncated or trailing binary PLY payload');
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    read = index => view.getFloat32(index * 4, true);
  } else {
    const tokens = new TextDecoder().decode(body).trim().split(/\s+/);
    if (tokens.length !== count * stride) throw new Error('Incorrect ASCII PLY payload length');
    read = index => Number(tokens[index]);
  }
  const data = {
    positions: new Float32Array(count * 3),
    scales: new Float32Array(count * 3),
    rotations: new Float32Array(count * 4),
    colors: new Float32Array(count * 4),
  };
  for (let i = 0; i < count; i++) {
    const values = names.map((_, p) => read(i * stride + p));
    if (!values.every(Number.isFinite)) throw new Error('Non-finite PLY value');
    const get = name => values[names.indexOf(name)];
    for (let axis = 0; axis < 3; axis++) {
      data.positions[i * 3 + axis] = get(['x', 'y', 'z'][axis]);
      data.scales[i * 3 + axis] = Math.exp(get(`scale_${axis}`));
      // Training PLY DC RGB is treated as display-encoded color in this prototype.
      data.colors[i * 4 + axis] = linear(Math.max(0, Math.min(1, 0.5 + C0 * get(`f_dc_${axis}`))));
      data.rotations[i * 4 + axis] = get(`rot_${axis + 1}`);
    }
    data.rotations[i * 4 + 3] = get('rot_0');
    const opacity = get('opacity');
    data.colors[i * 4 + 3] =
      opacity >= 0 ? 1 / (1 + Math.exp(-opacity)) : Math.exp(opacity) / (1 + Math.exp(opacity));
  }
  validateSplats(data);
  return {
    ...data,
    sourceProperties: names,
    discardedHigherSH: names.some(name => name.startsWith('f_rest_')),
  };
}
