'use strict';

const fs = require('node:fs');
const { app } = require('electron');
const { APP_PROTOCOL } = require('./constants');
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
        // Diagnostic: log OS console errors (do not fail — OS is a web build).
        else if (process.env.NOVA64_DESKTOP_LOG_OS) {
          wc.on('console-message', (_e, level, message) => {
            if (level >= 2) console.error(`nova64-desktop: os console: ${message}`);
          });
        }
      }
      // Benign, well-known browser noise reported at error level.
      const BENIGN = /ResizeObserver loop/i;
      for (const [key, wc] of Object.entries(owned)) {
        wc.on('console-message', (_e, level, message, _line, sourceId) => {
          // Ignore messages from an embedded runtime iframe (the os surface),
          // whose remote analytics/fonts are intentionally CSP-blocked.
          const fromRuntimeFrame = typeof sourceId === 'string' && sourceId.startsWith(`${APP_PROTOCOL}://os`);
          if (level >= 3 && !BENIGN.test(message) && !fromRuntimeFrame) {
            failed = true;
            console.error(`nova64-desktop: ${key} console error: ${message}`);
          } else if (process.env.NOVA64_DESKTOP_LOG_OS && level >= 1) {
            console.error(`nova64-desktop: ${key} console: ${message}`);
          }
        });
      }
      win.once('show', async () => {
        console.log('nova64-desktop: shell ready (smoke ok)');
        // Optional visual verification: capture each surface to <shot>-<name>.png.
        const shot = process.env.NOVA64_DESKTOP_SHOT;
        if (shot) {
          try {
            const menu = await controller.chrome.webContents.executeJavaScript(
              'Array.from(document.querySelectorAll(".menu-item")).map(b => b.dataset.view + (b.classList.contains("is-active") ? "*" : "")).join(",")'
            );
            console.log(`nova64-desktop: menu items = ${menu}`);
          } catch (e) {
            console.error(`nova64-desktop: chrome menu query failed: ${e.message}`);
          }
          for (const name of ['os', 'dev', 'settings']) {
            controller.setActive(name);
            await new Promise(r => setTimeout(r, name === 'dev' ? 5000 : 1400));
            if (name === 'dev') {
              try {
                const kind = await controller.content.dev.webContents.executeJavaScript(
                  'window.__novaDev && (window.__novaDev.setSample(), window.__novaDev.editorKind)'
                );
                console.log(`nova64-desktop: dev editor = ${kind}`);
                if (process.env.NOVA64_DESKTOP_TEST_FOLDER) {
                  const rows = await controller.content.dev.webContents.executeJavaScript(
                    `(async () => {
                       const inp = document.getElementById('path-input');
                       inp.value = ${JSON.stringify(process.env.NOVA64_DESKTOP_TEST_FOLDER)};
                       document.getElementById('open-path-btn').click();
                       await new Promise(r => setTimeout(r, 1800));
                       return document.querySelectorAll('#tree .tree-row').length;
                     })()`
                  );
                  console.log(`nova64-desktop: explorer tree rows (button click) = ${rows}`);
                }
                if (process.env.NOVA64_DESKTOP_TEST_RUN) {
                  const out = await controller.content.dev.webContents.executeJavaScript(
                    `(async () => {
                       await window.__novaDev.openFile('code.js');
                       window.__novaDev.run();
                       await new Promise(r => setTimeout(r, 7000));
                       return window.__novaDev.runConsoleText().slice(0, 300);
                     })()`
                  );
                  console.log(`nova64-desktop: run console = ${JSON.stringify(out)}`);
                }
                await new Promise(r => setTimeout(r, 800));
              } catch (e) {
                console.error(`nova64-desktop: dev hook failed: ${e.message}`);
              }
            }
            try {
              const img = await controller.content[name].webContents.capturePage();
              const buf = img.toPNG();
              fs.writeFileSync(shot.replace(/\.png$/, `-${name}.png`), buf);
              console.log(`nova64-desktop: captured ${name} (${buf.length} bytes)`);
            } catch (e) {
              console.error(`nova64-desktop: capture ${name} failed: ${e.message}`);
            }
          }
        }
        setTimeout(() => {
          console.log(`nova64-desktop: smoke ${failed ? 'FAILED' : 'passed'}`);
          app.exit(failed ? 1 : 0);
        }, 400);
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
