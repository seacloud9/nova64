'use strict';

const path = require('node:path');
const fs = require('node:fs');

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
/** Repo root (used to fall back to the built web app during dev/review). */
const REPO_ROOT = path.resolve(SRC_DIR, '..', '..', '..');

/** Where `nova64 desktop build --dir` stages the full web build for packaging. */
const BUILD_DIR = path.resolve(__dirname, '..', '..', 'build');

/**
 * The `os` surface serves the whole Nova64 web build (OS shell + runtime +
 * assets), so its cross-app iframes (Console, Game Studio) resolve serverlessly.
 * The root build uses a relative base, so no path rewriting is needed. Prefer a
 * staged copy (packaged/relocatable), else fall back to the repo `dist/`.
 */
const STAGED_OS = path.join(BUILD_DIR, 'os');
const REPO_DIST = path.join(REPO_ROOT, 'dist');
const OS_ROOT = fs.existsSync(STAGED_OS) ? STAGED_OS : REPO_DIST;

/**
 * Map `nova64-app://<host>/...` to a filesystem root.
 *  - nav / dev: app chrome, always served from source (works inside the asar).
 *  - os: the full Nova64 web build (see OS_ROOT above).
 *  - lib: shared host-neutral packages consumed by the Dev renderer as ESM.
 */
const APP_ROOTS = Object.freeze({
  nav: path.join(SRC_DIR, 'navigation'),
  dev: path.join(SRC_DIR, 'dev'),
  os: OS_ROOT,
  lib: path.join(REPO_ROOT, 'packages', 'workspace-core'),
});

module.exports = { APP_PROTOCOL, VIEW, RAIL_WIDTH, DEV_SERVER_URL, SRC_DIR, BUILD_DIR, APP_ROOTS };
