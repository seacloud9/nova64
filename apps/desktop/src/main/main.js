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

    // Smoke mode (CI / verification): confirm the shell boots, then exit.
    if (process.env.NOVA64_DESKTOP_SMOKE) {
      win.once('show', () => {
        console.log('nova64-desktop: shell ready (smoke ok)');
        setTimeout(() => app.quit(), 300);
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
