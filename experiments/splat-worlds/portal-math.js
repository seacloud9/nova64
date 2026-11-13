import { Matrix4, Plane, Vector3, Vector4 } from 'three';

// Right-handed, upright, equal-scale doorways; local +Z is the entrance side.
export function portalTransform(entry, exit) {
  return new Matrix4()
    .copy(exit)
    .multiply(new Matrix4().makeRotationY(Math.PI))
    .multiply(new Matrix4().copy(entry).invert());
}

export function crossing(previous, next, entry, width, height, radius = 0.15) {
  const inverse = new Matrix4().copy(entry).invert();
  const a = previous.clone().applyMatrix4(inverse);
  const b = next.clone().applyMatrix4(inverse);
  if (a.z <= 0 || b.z > 0) return false;
  const t = a.z / (a.z - b.z);
  const hit = a.lerp(b, t);
  return Math.abs(hit.x) < width / 2 - radius && Math.abs(hit.y) < height / 2 - radius;
}

export function exitPlane(exit, inset = 0.015) {
  const normal = new Vector3(0, 0, 1).transformDirection(exit);
  const point = new Vector3().setFromMatrixPosition(exit).addScaledVector(normal, inset);
  return new Plane().setFromNormalAndCoplanarPoint(normal, point);
}

// Replace the near plane with the destination door (Lengyel oblique projection).
// Keep the camera's original X/Y projection so gl_FragCoord samples line up.
export function clipProjection(projection, cameraWorld, worldPlane) {
  const plane = worldPlane.clone().applyMatrix4(new Matrix4().copy(cameraWorld).invert());
  const p = new Vector4(...plane.normal.toArray(), plane.constant);
  const q = new Vector4(Math.sign(p.x) || 1, Math.sign(p.y) || 1, 1, 1).applyMatrix4(
    new Matrix4().copy(projection).invert()
  );
  p.multiplyScalar(2 / p.dot(q));
  const result = projection.clone(),
    e = result.elements;
  e[2] = p.x - e[3];
  e[6] = p.y - e[7];
  e[10] = p.z - e[11];
  e[14] = p.w - e[15];
  return result;
}
