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

function buildCsp({ allowEval }) {
  const self = `'self' ${APP_PROTOCOL}:`;
  const dev = DEV_SERVER_URL ? ` ${new URL(DEV_SERVER_URL).origin}` : '';
  // The runtime executes cart code via `new Function`, so the runtime surface
  // (os + dev server) needs 'unsafe-eval'. The Dev/Settings tooling surfaces do
  // NOT — they stay strict.
  const evalSrc = allowEval ? " 'unsafe-eval'" : '';
  return [
    `default-src ${self}${dev}`,
    `script-src ${self}${dev} 'wasm-unsafe-eval'${evalSrc}`,
    `style-src ${self}${dev} 'unsafe-inline'`,
    `img-src ${self}${dev} data: blob:`,
    `font-src ${self}${dev} data:`,
    `connect-src ${self}${dev} data: blob:`,
    `worker-src ${self}${dev} blob:`,
    // The OS shell + Dev preview embed same-origin/app-scheme iframes (Console/
    // cart-runner, runtime preview); allow that while denying external ancestors.
    `frame-src ${self}${dev} blob:`,
    `child-src ${self}${dev} blob:`,
    `object-src 'none'`,
    `frame-ancestors 'self' ${APP_PROTOCOL}:${dev}`,
  ].join('; ');
}

/** True for the runtime surface (the OS/runtime web app), which may eval carts. */
function isRuntimeUrl(url) {
  if (typeof url !== 'string') return false;
  if (url.startsWith(`${APP_PROTOCOL}://os`)) return true;
  if (DEV_SERVER_URL) {
    try {
      if (url.startsWith(new URL(DEV_SERVER_URL).origin)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Apply a per-surface CSP: strict everywhere, plus 'unsafe-eval' only for the
 * runtime surface (which must run cart code). Denies remote script/object and
 * external frame ancestors on every surface.
 */
function applyContentSecurityPolicy(session) {
  const strict = buildCsp({ allowEval: false });
  const runtime = buildCsp({ allowEval: true });
  session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isRuntimeUrl(details.url) ? runtime : strict;
    callback({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] },
    });
  });
}

module.exports = {
  secureWebPreferences,
  hardenWebContents,
  applyContentSecurityPolicy,
  isAllowedTarget,
};
