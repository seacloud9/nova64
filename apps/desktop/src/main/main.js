'use strict';

const { app } = require('electron');
const { registerAppProtocolScheme, handleAppProtocol } = require('./protocol');
const { WindowController } = require('./window-controller');

// Must run before app is ready (Electron requirement for privileged schemes).
registerAppProtocolScheme();

// Single instance — a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let controller = null;

  app.on('second-instance', () => {
    if (controller?.win) {
      if (controller.win.isMinimized()) controller.win.restore();
      controller.win.focus();
    }
  });

  // Refuse to attach to remote content / disable navigation globally as defence
  // in depth (each view is also individually hardened).
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-redirect', (event, url) => {
      if (!url.startsWith('nova64-app://') && !url.startsWith(process.env.NOVA64_DESKTOP_DEV_URL || '\0')) {
        event.preventDefault();
      }
    });
  });

  app.whenReady().then(() => {
    handleAppProtocol();
    controller = new WindowController();
    const win = controller.create();

    // Smoke mode (CI / verification): confirm the shell + both surfaces load
    // without renderer errors, then exit non-zero if anything failed.
    if (process.env.NOVA64_DESKTOP_SMOKE) {
      let failed = false;
      for (const key of ['os', 'dev']) {
        const wc = controller.content[key].webContents;
        // Document navigation failure counts for both surfaces.
        wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
          if (code === -3 || !isMainFrame) return; // ERR_ABORTED / subresource
          failed = true;
          console.error(`nova64-desktop: ${key} load failed ${code} ${desc} ${url}`);
        });
        // Console errors fail only for the Dev surface we own. The OS surface is
        // a web build whose remote analytics/fonts are intentionally CSP-blocked.
        if (key === 'dev') {
          wc.on('console-message', (_e, level, message) => {
            if (level >= 3) {
              failed = true;
              console.error(`nova64-desktop: dev console error: ${message}`);
            }
          });
        }
      }
      win.once('show', () => {
        console.log('nova64-desktop: shell ready (smoke ok)');
        setTimeout(() => {
          console.log(`nova64-desktop: smoke ${failed ? 'FAILED' : 'passed'}`);
          app.exit(failed ? 1 : 0);
        }, 800);
      });
    }

    app.on('activate', () => {
      if (!controller.win) controller.create();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
