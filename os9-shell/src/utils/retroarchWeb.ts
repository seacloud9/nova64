// URLs for the RetroArch web player (public/retroarch-web/), which runs Nova64
// carts on the libretro core compiled to WebAssembly. Side-effect free, so the
// desktop and mobile shells can both import it.
import { getNovaBaseUrl, normalizeCartPath } from './cartCode';

export function getRetroArchWebUrl(path: string): string {
  const url = new URL('/retroarch-web/index.html', getNovaBaseUrl());
  url.searchParams.set('cart', normalizeCartPath(path));
  return url.toString();
}

/** Player URL that waits for the cart bytes over postMessage (see index.html). */
export function getRetroArchWebMessageUrl(fileName: string): string {
  const url = new URL('/retroarch-web/index.html', getNovaBaseUrl());
  url.searchParams.set('cart', 'message');
  url.searchParams.set('name', fileName);
  return url.toString();
}
