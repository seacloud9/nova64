'use strict';

const path = require('node:path');

/** Custom scheme used to serve packaged app assets (serverless production). */
const APP_PROTOCOL = 'nova64-app';

/** Logical surfaces. OS and Dev are isolated renderer contexts that keep state. */
const VIEW = Object.freeze({
  OS: 'os',
  DEV: 'dev',
});

/** Width of the persistent activity rail (navigation) in CSS px. */
const RAIL_WIDTH = 64;

/**
 * In `nova64 desktop dev` the CLI starts a local server and passes its URL here,
 * so OS loads live from Vite. When empty (packaged), assets load over
 * `nova64-app://` from the staged build directory — no localhost, no server.
 */
const DEV_SERVER_URL = process.env.NOVA64_DESKTOP_DEV_URL || '';

/** apps/desktop/src — app chrome (navigation rail, Dev placeholder) ships here. */
const SRC_DIR = path.resolve(__dirname, '..');

/** Where `nova64 desktop build --dir` stages external web assets (the OS shell). */
const BUILD_DIR = path.resolve(__dirname, '..', '..', 'build');

/**
 * Map `nova64-app://<host>/...` to a filesystem root.
 *  - nav / dev: app chrome, always served from source (works inside the asar).
 *  - os: the external OS 9 shell, staged by `nova64 desktop build --dir`.
 */
const APP_ROOTS = Object.freeze({
  nav: path.join(SRC_DIR, 'navigation'),
  dev: path.join(SRC_DIR, 'dev'),
  os: path.join(BUILD_DIR, 'os'),
});

module.exports = { APP_PROTOCOL, VIEW, RAIL_WIDTH, DEV_SERVER_URL, SRC_DIR, BUILD_DIR, APP_ROOTS };
