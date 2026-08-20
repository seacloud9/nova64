'use strict';

const { APP_PROTOCOL, DEV_SERVER_URL } = require('./constants');

/** Secure webPreferences shared by every renderer view. No Node, sandboxed. */
function secureWebPreferences(extra = {}) {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    ...extra,
  };
}

/** Origins a view is permitted to navigate to / load top-level documents from. */
function allowedOrigins() {
  const origins = [`${APP_PROTOCOL}://os`, `${APP_PROTOCOL}://dev`];
  if (DEV_SERVER_URL) {
    try {
      origins.push(new URL(DEV_SERVER_URL).origin);
    } catch {
      /* ignore malformed dev url */
    }
  }
  return origins;
}

function isAllowedTarget(targetUrl) {
  try {
    const u = new URL(targetUrl);
    if (u.protocol === 'file:') return false; // never allow file:// navigation
    const origin = u.origin === 'null' ? `${u.protocol}//${u.hostname}` : u.origin;
    return allowedOrigins().some(o => origin === o || targetUrl.startsWith(o));
  } catch {
    return false;
  }
}

/**
 * Lock a webContents down: deny popups, block navigation outside allowed
 * origins, deny permission requests, and drop attempts to attach webviews.
 */
function hardenWebContents(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));

  contents.on('will-navigate', (event, url) => {
    if (!isAllowedTarget(url)) event.preventDefault();
  });

  // Block <webview> tag entirely.
  contents.on('will-attach-webview', event => event.preventDefault());

  const session = contents.session;
  if (!session.__novaPermissionsHardened) {
    session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    session.setPermissionCheckHandler(() => false);
    session.__novaPermissionsHardened = true;
  }
}

/**
 * Apply a strict Content-Security-Policy to responses in the given session.
 * Kept permissive enough for the Three.js runtime (blob/data for workers,
 * wasm-unsafe-eval) but denies remote script/object and frame ancestors.
 */
function applyContentSecurityPolicy(session) {
  // Allow the whole custom scheme (nav/dev/os/lib are distinct origins that
  // import each other via import maps), plus the dev server in dev mode.
  const self = `'self' ${APP_PROTOCOL}:`;
  const dev = DEV_SERVER_URL ? ` ${new URL(DEV_SERVER_URL).origin}` : '';
  const csp = [
    `default-src ${self}${dev}`,
    `script-src ${self}${dev} 'wasm-unsafe-eval'`,
    `style-src ${self}${dev} 'unsafe-inline'`,
    `img-src ${self}${dev} data: blob:`,
    `font-src ${self}${dev} data:`,
    `connect-src ${self}${dev} data: blob:`,
    `worker-src ${self}${dev} blob:`,
    // The OS shell embeds its apps (Console/cart-runner, HyperNova) in same-origin
    // iframes, so allow same-origin framing while still denying external ancestors.
    `frame-src ${self}${dev} blob:`,
    `child-src ${self}${dev} blob:`,
    `object-src 'none'`,
    `frame-ancestors 'self' ${APP_PROTOCOL}:${dev}`,
  ].join('; ');

  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

module.exports = {
  secureWebPreferences,
  hardenWebContents,
  applyContentSecurityPolicy,
  isAllowedTarget,
};
