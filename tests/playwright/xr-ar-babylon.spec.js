import { test, expect } from '@playwright/test';

import { loadCart, waitFor3DScene } from './helpers.js';

function collectBrowserIssues(page) {
  const issues = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      issues.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    issues.push({ type: 'pageerror', text: err.message });
  });
  return issues;
}

function fatalIssues(issues) {
  return issues.filter(issue => !issue.text.includes('Failed to load resource'));
}

async function openBabylonSandbox(page) {
  await page.goto('/babylon_console.html?demo=test-minimal');
  await page.waitForFunction(
    () =>
      typeof globalThis.nova64?.xr?.enableAR === 'function' &&
      typeof globalThis.nova64?.input?.startCamera === 'function' &&
      typeof globalThis.nova64?.scene?.getScene === 'function',
    { timeout: 30000 }
  );
  await page.waitForTimeout(500);
}

test.describe('Babylon XR and AR demo compatibility', () => {
  test('VR demos initialize under Babylon with an XR or Cardboard entry point', async ({ page }) => {
    for (const cartName of ['vr-demo', 'vr-sword-combat']) {
      const issues = collectBrowserIssues(page);

      await loadCart(page, cartName, 'babylon');
      await waitFor3DScene(page, 'babylon');

      const state = await page.evaluate(() => ({
        backend: nova64.scene.getBackendCapabilities?.().backend,
        mode: nova64.xr.getXRMode(),
        active: nova64.xr.isXRActive(),
        supported: nova64.xr.isXRSupported(),
        controllers: nova64.xr.getXRControllers().length,
        hands: nova64.xr.getXRHands().length,
        entryStatus: document.querySelector('[data-nova64-xr-status]')?.dataset
          .nova64XrStatus,
        entryText: document.querySelector('[data-nova64-xr-status]')?.textContent,
      }));

      expect(fatalIssues(issues), `${cartName} should not throw browser errors`).toEqual([]);
      expect(state.backend).toBe('babylon');
      expect(state.mode).toBe('vr');
      expect(state.active).toBe(false);
      expect(state.controllers).toBe(0);
      expect(state.hands).toBe(0);
      expect(['babylon-ready', 'cardboard-fallback']).toContain(state.entryStatus);
      expect(state.entryText).toMatch(/Enter VR|Use Cardboard VR/);

      if (state.entryStatus === 'cardboard-fallback') {
        expect(state.supported).toBe(false);
        await page.click('[data-nova64-xr-status="cardboard-fallback"]');
        await page.waitForFunction(() => nova64.xr.getXRMode() === 'cardboard');
        const cardboard = await page.evaluate(() => ({
          mode: nova64.xr.getXRMode(),
          active: nova64.xr.isXRActive(),
        }));
        expect(cardboard.mode).toBe('cardboard');
        expect(cardboard.active).toBe(true);
      } else {
        expect(state.supported).toBe(true);
      }
    }
  });

  test('Babylon VR offers Cardboard fallback when WebXR is unavailable', async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openBabylonSandbox(page);

    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, 'xr', {
        configurable: true,
        value: undefined,
      });

      const enabled = await nova64.xr.enableVR({ referenceSpace: 'local-floor' });
      return {
        enabled,
        mode: nova64.xr.getXRMode(),
        active: nova64.xr.isXRActive(),
        supported: nova64.xr.isXRSupported(),
        fallbackText: document.querySelector('[data-nova64-xr-status="cardboard-fallback"]')
          ?.textContent,
      };
    });

    expect(fatalIssues(issues)).toEqual([]);
    expect(state.enabled).toBe(false);
    expect(state.mode).toBe('vr');
    expect(state.active).toBe(false);
    expect(state.supported).toBe(false);
    expect(state.fallbackText).toContain('Use Cardboard VR');
  });

  test('WebXR AR creates a Babylon.js AR entry point when WebXR is available', async ({
    page,
  }) => {
    const issues = collectBrowserIssues(page);
    await openBabylonSandbox(page);

    const result = await page.evaluate(async () => {
      Object.defineProperty(navigator, 'xr', {
        configurable: true,
        value: {
          isSessionSupported: async mode => mode === 'immersive-ar',
        },
      });

      const scene = nova64.scene.getScene();
      scene.createDefaultXRExperienceAsync = async () => ({
        baseExperience: {
          state: 3,
          onStateChangedObservable: { add: () => {} },
          enterXRAsync: async () => ({ session: {} }),
          exitXRAsync: async () => {},
          sessionManager: { session: null },
        },
        renderTarget: {},
        input: { controllers: [] },
        dispose: () => {},
      });

      const enabled = await nova64.xr.enableAR({ referenceSpace: 'local-floor' });
      await new Promise(resolve => setTimeout(resolve, 500));
      const beforeDisable = {
        enabled,
        mode: nova64.xr.getXRMode(),
        active: nova64.xr.isXRActive(),
        supported: nova64.xr.isXRSupported(),
        session: nova64.xr.getXRSession(),
        controllers: nova64.xr.getXRControllers().length,
        hands: nova64.xr.getXRHands().length,
        referenceSet: nova64.xr.setXRReferenceSpace('local'),
        rigMoved: nova64.xr.setCameraRigPosition(1, 2, 3),
        buttonText: document.querySelector('[data-nova64-xr-status="babylon-ready"]')
          ?.textContent,
      };

      nova64.xr.disableXR();

      return {
        ...beforeDisable,
        modeAfterDisable: nova64.xr.getXRMode(),
      };
    });

    expect(fatalIssues(issues)).toEqual([]);
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe('ar');
    expect(result.active).toBe(false);
    expect(result.supported).toBe(true);
    expect(result.session).toBeNull();
    expect(result.controllers).toBe(0);
    expect(result.hands).toBe(0);
    expect(result.referenceSet).toBe(true);
    expect(result.rigMoved).toBe(true);
    expect(result.buttonText).toContain('Start AR');
    expect(result.modeAfterDisable).toBeNull();
  });

  test('Babylon camera background path accepts a MediaStream-backed AR video layer', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => new MediaStream(),
        },
      });
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    const issues = collectBrowserIssues(page);
    await openBabylonSandbox(page);

    const result = await page.evaluate(async () => {
      await nova64.input.startCamera();
      nova64.input.showCameraBackground();
      const video = document.querySelector('video');
      const scene = nova64.scene.getScene();
      const whileActive = {
        videoInDom: !!video?.parentElement,
        videoPosition: video?.style.position,
        videoZIndex: video?.style.zIndex,
        clearAlpha: scene.clearColor?.a,
      };

      nova64.input.hideCameraBackground();
      const afterHide = {
        videoDisplay: video?.style.display,
        clearAlpha: scene.clearColor?.a,
      };
      nova64.input.stopCamera();

      return { whileActive, afterHide };
    });

    expect(fatalIssues(issues)).toEqual([]);
    expect(result.whileActive.videoInDom).toBe(true);
    expect(result.whileActive.videoPosition).toBe('absolute');
    expect(result.whileActive.videoZIndex).toBe('0');
    expect(result.whileActive.clearAlpha).toBe(0);
    expect(result.afterHide.videoDisplay).toBe('none');
    expect(result.afterHide.clearAlpha).toBeGreaterThan(0);
  });

  test('AR hand demo loads under Babylon when camera access is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            throw new DOMException('Camera disabled for test', 'NotAllowedError');
          },
        },
      });
    });

    const issues = collectBrowserIssues(page);
    await loadCart(page, 'ar-hand-demo', 'babylon');
    await waitFor3DScene(page, 'babylon');

    const state = await page.evaluate(() => ({
      backend: nova64.scene.getBackendCapabilities?.().backend,
      landmarks: nova64.input.getHandLandmarks().length,
      gestures: nova64.input.getHandGesture().length,
      meshCount: nova64.scene.get3DStats?.().meshes ?? 0,
    }));

    expect(fatalIssues(issues)).toEqual([]);
    expect(state.backend).toBe('babylon');
    expect(state.landmarks).toBe(0);
    expect(state.gestures).toBe(0);
    expect(state.meshCount).toBeGreaterThan(0);
  });
});
