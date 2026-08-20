'use strict';

const { protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { APP_PROTOCOL, APP_ROOTS } = require('./constants');

/**
 * Register `nova64-app://` as a privileged, standard scheme BEFORE app-ready.
 * Must be called at module load in the main process (Electron requirement).
 */
function registerAppProtocolScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_PROTOCOL,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

/**
 * Serve staged files from BUILD_DIR over `nova64-app://<surface>/<path>`.
 * Path traversal is rejected: the resolved absolute path must stay inside
 * BUILD_DIR. Missing files return 404. Call after app is ready.
 */
function handleAppProtocol() {
  protocol.handle(APP_PROTOCOL, request => {
    const url = new URL(request.url);
    // host = surface (nav | dev | os); pathname = file under that surface root
    const root = APP_ROOTS[url.hostname];
    if (!root) return new Response('Unknown surface', { status: 404 });

    let rel = decodeURIComponent(url.pathname);
    if (!rel || rel === '/') rel = '/index.html';
    const abs = path.join(root, rel);

    // Containment check — reject anything that escapes the surface root.
    const resolvedRoot = path.resolve(root);
    const normalizedAbs = path.resolve(abs);
    if (normalizedAbs !== resolvedRoot && !normalizedAbs.startsWith(resolvedRoot + path.sep)) {
      return new Response('Forbidden', { status: 403 });
    }

    return net
      .fetch(pathToFileURL(normalizedAbs).toString())
      .catch(() => new Response('Not found', { status: 404 }));
  });
}

module.exports = { registerAppProtocolScheme, handleAppProtocol };
