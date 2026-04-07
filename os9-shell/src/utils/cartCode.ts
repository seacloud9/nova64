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

/**
 * Returns the base URL of the Nova64 main server.
 * In local dev, os9-shell runs on port 3000/3001 while the Nova64 runtime
 * is served from port 5173. In production (e.g. GitHub Pages), everything
 * is served from the same origin.
 */
export function getNovaBaseUrl(): string {
  const { hostname, port } = window.location;
  // os9-shell dev server runs on 3000/3001; Nova64 Vite dev server runs on 5173.
  // Only redirect when we know we're on the separate os9-shell dev server.
  // In production (GitHub Pages, npx serve, etc.) everything is same-origin.
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && (port === '3000' || port === '3001')) {
    return 'http://localhost:5173';
  }
  return window.location.origin;
}
