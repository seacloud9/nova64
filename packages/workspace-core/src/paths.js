/**
 * Host-neutral path helpers for workspace-relative paths. Paths are always
 * forward-slash, relative to the workspace root, with no leading slash. These
 * functions never touch the filesystem — host adapters map the safe relative
 * path onto disk. The traversal guard here is the first line of defence; host
 * adapters must ALSO re-check containment against the real root.
 */

/** Split a path into non-empty segments. */
export function segments(p) {
  return String(p == null ? '' : p)
    .replace(/\\/g, '/')
    .split('/')
    .filter(seg => seg.length > 0);
}

/**
 * Normalize a workspace-relative path. Resolves `.`/empty segments and rejects
 * any path that escapes the root (a `..` that would pop above the root, an
 * absolute path, or a Windows drive/UNC path). Returns the clean relative path
 * ('' for the root), or throws on an unsafe path.
 */
export function normalizeRelative(input) {
  const raw = String(input == null ? '' : input).replace(/\\/g, '/');
  if (/^([a-zA-Z]:|\/|\\\\)/.test(raw)) {
    throw new Error(`unsafe path (absolute): ${input}`);
  }
  const out = [];
  for (const seg of segments(raw)) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (out.length === 0) throw new Error(`unsafe path (escapes root): ${input}`);
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join('/');
}

/** True if `p` is a safe workspace-relative path. */
export function isSafeRelative(p) {
  try {
    normalizeRelative(p);
    return true;
  } catch {
    return false;
  }
}

export function basename(p) {
  const s = segments(p);
  return s.length ? s[s.length - 1] : '';
}

export function dirname(p) {
  const s = segments(p);
  s.pop();
  return s.join('/');
}

export function extname(p) {
  const base = basename(p);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot) : '';
}

export function joinRelative(...parts) {
  return normalizeRelative(parts.filter(Boolean).join('/'));
}
