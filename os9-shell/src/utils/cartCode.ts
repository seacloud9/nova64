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
 * Returns the base URL of the Nova64 main server (always port 5173).
 * os9-shell may run on port 3000/3001 (prod via pnpm dev) or any other port,
 * while the Nova64 runtime is always served from port 5173.
 */
export function getNovaBaseUrl(): string {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5173';
  }
  // LAN or remote access: same hostname, standard Nova64 dev port
  return `http://${hostname}:5173`;
}
