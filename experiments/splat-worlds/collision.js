import { Vector3 } from 'three';

// Authored navigation proxy on the XZ plane, independent of baked scan geometry.
// region = { bounds: [minX, minZ, maxX, maxZ], blockers: [[minX, minZ, maxX, maxZ], ...] }
// The player is a circle of `radius`. Movement is resolved in sub-steps no longer
// than `radius`, so a large step can never tunnel through a thin blocker.

function pushOut(p, box, radius) {
  const [x0, z0, x1, z1] = box;
  const cx = Math.max(x0, Math.min(x1, p.x));
  const cz = Math.max(z0, Math.min(z1, p.z));
  const dx = p.x - cx,
    dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * radius;
    p.z = cz + (dz / d) * radius;
    return true;
  }
  // Centre inside the box: leave by the nearest face.
  const exits = [
    [p.x - x0 + radius, -1, 0],
    [x1 - p.x + radius, 1, 0],
    [p.z - z0 + radius, 0, -1],
    [z1 - p.z + radius, 0, 1],
  ].sort((a, b) => a[0] - b[0]);
  const [depth, sx, sz] = exits[0];
  p.x += sx * depth;
  p.z += sz * depth;
  return true;
}

function constrain(p, region, radius) {
  const [x0, z0, x1, z1] = region.bounds;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const box of region.blockers ?? []) moved = pushOut(p, box, radius) || moved;
    p.x = Math.max(x0 + radius, Math.min(x1 - radius, p.x));
    p.z = Math.max(z0 + radius, Math.min(z1 - radius, p.z));
    if (!moved) break;
  }
  return p;
}

export function resolveMove(previous, next, region, radius = 0.25) {
  const out = constrain(previous.clone(), region, radius);
  const delta = new Vector3(next.x - out.x, 0, next.z - out.z);
  const length = delta.length();
  if (!Number.isFinite(length)) return out.setY(next.y);
  const steps = Math.max(1, Math.ceil(length / (radius * 0.5)));
  delta.divideScalar(steps);
  for (let i = 0; i < steps; i++) constrain(out.add(delta), region, radius);
  out.y = next.y;
  return out;
}

// Door posts become solid blockers so the frame is walk-through only via the opening.
export function doorBlockers(door, width = 2.2, post = 0.14, depth = 0.18) {
  const boxes = [];
  for (const side of [-1, 1]) {
    const xs = side * (width / 2 + post / 2);
    const corners = [
      [xs - post / 2, -depth / 2 + 0.03],
      [xs + post / 2, -depth / 2 + 0.03],
      [xs - post / 2, depth / 2 + 0.03],
      [xs + post / 2, depth / 2 + 0.03],
    ].map(([x, z]) => new Vector3(x, 0, z).applyMatrix4(door));
    boxes.push([
      Math.min(...corners.map(c => c.x)),
      Math.min(...corners.map(c => c.z)),
      Math.max(...corners.map(c => c.x)),
      Math.max(...corners.map(c => c.z)),
    ]);
  }
  return boxes;
}
