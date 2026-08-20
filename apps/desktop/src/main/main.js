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

    // Open DevTools for content surfaces when requested (review/debugging).
    // `nova64 desktop dev --devtools` or NOVA64_DESKTOP_DEVTOOLS=1.
    if (process.env.NOVA64_DESKTOP_DEVTOOLS) {
      for (const key of ['os', 'dev', 'settings']) {
        controller.content[key].webContents.openDevTools({ mode: 'detach' });
      }
    }

    // Smoke mode (CI / verification): confirm the shell + surfaces load without
    // renderer errors, then exit non-zero if anything failed. Console errors fail
    // only for surfaces we own (chrome/dev/settings); the OS surface is a web
    // build whose remote analytics/fonts are intentionally CSP-blocked.
    if (process.env.NOVA64_DESKTOP_SMOKE) {
      let failed = false;
      const owned = { chrome: controller.chrome.webContents };
      for (const key of ['os', 'dev', 'settings']) {
        const wc = controller.content[key].webContents;
        wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
          if (code === -3 || !isMainFrame) return; // ERR_ABORTED / subresource
          failed = true;
          console.error(`nova64-desktop: ${key} load failed ${code} ${desc} ${url}`);
        });
        if (key !== 'os') owned[key] = wc;
      }
      for (const [key, wc] of Object.entries(owned)) {
        wc.on('console-message', (_e, level, message) => {
          if (level >= 3) {
            failed = true;
            console.error(`nova64-desktop: ${key} console error: ${message}`);
          }
        });
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
