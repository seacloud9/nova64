/**
 * Strip ES module export syntax from cart code so it can be executed in a
 * global eval() context where export keywords are illegal.
 */
export function processCartCode(code: string): string {
  let out = code;
  out = out.replace(/export\s+async\s+function\s/g, 'async function ');
  out = out.replace(/export\s+function\s/g, 'function ');
  out = out.replace(/export\s+const\s/g, 'const ');
  out = out.replace(/export\s+let\s/g, 'let ');
  out = out.replace(/export\s+var\s/g, 'var ');
  out = out.replace(/export\s+default\s+/g, '');
  out = out.replace(/export\s*\{[^}]*\}\s*;?/g, '');
  return out;
}

export const DEFAULT_CART_PATH = '/examples/hello-world/code.js';

export function normalizeCartPath(path: string | null | undefined): string {
  const trimmed = path?.trim();
  if (!trimmed) return DEFAULT_CART_PATH;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Returns the base URL of the Nova64 main server.
 * In local dev, os9-shell runs on port 3000/3001 while the Nova64 runtime
 * is served from port 5173. In production (e.g. GitHub Pages), everything
 * is served from the same origin.
 */
export function getNovaBaseUrl(): string {
  // In dev, os9-shell runs on its own server (3000/3001) while Nova64's
  // Vite server is on 5173. import.meta.env.DEV is tree-shaken to false
  // in production builds, so localhost:5173 never appears in the bundle.
  if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:5173';
  }
  return window.location.origin;
}

export function getNovaResourceUrl(path: string): string {
  const normalized = normalizeCartPath(path);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return new URL(normalized, getNovaBaseUrl()).toString();
}

export function getCartRunnerUrl(path: string): string {
  const url = new URL('/cart-runner.html', getNovaBaseUrl());
  url.searchParams.set('path', normalizeCartPath(path));
  return url.toString();
}

export async function fetchCartCode(path: string): Promise<string> {
  const response = await fetch(getNovaResourceUrl(path));
  if (!response.ok) {
    throw new Error(response.statusText || `HTTP ${response.status}`);
  }
  return response.text();
}
