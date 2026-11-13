// Analytic, project-owned fixture. No third-party scan or training data.
export function makeSyntheticPly() {
  const names = [
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
  const around = 96,
    tube = 12,
    count = around * tube;
  const header = new TextEncoder().encode(
    `ply\nformat binary_little_endian 1.0\ncomment Nova64 analytic torus, DC-only synthetic Gaussian fixture\nelement vertex ${count}\n${names.map(n => `property float ${n}`).join('\n')}\nend_header\n`
  );
  const bytes = new Uint8Array(header.length + count * names.length * 4);
  bytes.set(header);
  const view = new DataView(bytes.buffer, header.length);
  const linearToSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  for (let i = 0; i < count; i++) {
    const theta = (Math.floor(i / tube) / around) * Math.PI * 2,
      phi = ((i % tube) / tube) * Math.PI * 2;
    // Rotation about Y maps the long local X axis onto the ring tangent.
    const yaw = -theta - Math.PI / 2;
    const color = [0, 2, 4].map(phase => 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(theta + phase)));
    const values = [
      (2 + 0.38 * Math.cos(phi)) * Math.cos(theta),
      0.38 * Math.sin(phi),
      (2 + 0.38 * Math.cos(phi)) * Math.sin(theta),
      Math.log(0.11),
      Math.log(0.055),
      Math.log(0.055),
      Math.cos(yaw / 2),
      0,
      Math.sin(yaw / 2),
      0,
      0.5,
      ...color.map(c => (linearToSrgb(c) - 0.5) / 0.28209479177387814),
    ];
    values.forEach((v, p) => view.setFloat32((i * names.length + p) * 4, v, true));
  }
  return bytes;
}
