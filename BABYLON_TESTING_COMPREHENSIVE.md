# Comprehensive Babylon.js Backend Testing Guide

## 📋 Overview

This document provides complete documentation for the automated testing infrastructure for the Nova64 Babylon.js backend. The test suite includes 4 comprehensive test categories with 71 demo carts tested across both Three.js and Babylon.js backends.

**Last Updated:** Session completed with comprehensive test expansion

---

## 🎯 Test Categories

### 1. **Backend Parity Tests** (`backend-parity.spec.js`)

Tests 71 demo carts across both backends to verify functional parity.

**Coverage:**

- ✅ 71 carts organized by category (basic, 3d-games, 3d-showcase, fps, voxel, rendering, physics, particles, creative, stage, ui, tween, xr, systems, platformer, nft, babylon)
- ✅ Load tests (no errors on initialization)
- ✅ Console output matching (print calls, framebuffer content)
- ✅ Text rendering verification
- ✅ Player control tests (Space Harrier specific)
- ✅ Boundary enforcement tests
- ✅ Visual comparison (screenshot capture)

**Test Structure:**

```javascript
// For each of 71 carts:
1. Should load without errors in Three.js
2. Should load without errors in Babylon.js
3. Should have matching console output between backends

// Plus specific tests for:
- Text rendering (Space Harrier)
- Player controls (movement, boundaries)
- Visual comparison (screenshots)
```

### 2. **API Compatibility Tests** (`api-compatibility.spec.js`)

Verifies all Nova64 API functions work correctly in both backends.

**Coverage:**

- ✅ Core 3D API: createCube, createSphere, createPlane, createCylinder
- ✅ Camera API: setCameraPosition, setCameraTarget, setCameraFOV
- ✅ Transform API: rotateMesh, setPosition, setScale
- ✅ Lighting API: setAmbientLight, createPointLight, setFog
- ✅ Skybox API: createSpaceSkybox, createGradientSkybox
- ✅ 2D Drawing API: print, cls
- ✅ Advanced Materials: holographic, metallic

**Test Pattern:**

```javascript
for (const backend of ['threejs', 'babylon']) {
  // Test each API function
  const result = await page.evaluate(() => {
    try {
      // Execute API call
      createCube(2, 0xff0000, [0, 0, -5]);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  expect(result.success).toBe(true);
}
```

### 3. **Performance Comparison Tests** (`performance-comparison.spec.js`)

Measures and compares performance metrics between backends.

**Coverage:**

- ✅ FPS benchmarking (4 carts tested: hello-3d, space-harrier-3d, crystal-cathedral-3d, particles-demo)
- ✅ Memory usage comparison
- ✅ Render stats comparison (triangle count, draw calls, geometries, textures)
- ✅ Load time comparison (3 carts tested)
- ✅ Stress testing (100 cubes)
- ✅ Frame time consistency (variance analysis)

**Key Metrics:**

```javascript
{
  avgFPS: 60,          // Average frames per second
  minFPS: 55,          // Minimum FPS
  maxFPS: 62,          // Maximum FPS
  medianFPS: 60,       // Median FPS
  sampleCount: 180     // Number of frames measured
}
```

**Performance Thresholds:**

- Minimum FPS: 30 (general), 20 (stress test)
- FPS variance tolerance: 30% between backends
- Memory usage: < 200MB
- Triangle count variance: < 20%
- Frame time consistency: stddev < 10ms

### 4. **Visual Regression Tests** (`visual-regression.spec.js`)

Pixel-perfect visual comparison using pixelmatch.

**Coverage:**

- ✅ Basic 3D (hello-3d, hello-skybox)
- ✅ 3D Showcases (crystal-cathedral-3d, pbr-showcase)
- ✅ Start Screens (space-harrier-3d, startscreen-demo)
- ✅ UI Demos (hud-demo, ui-demo)
- ✅ Particle Systems (particles-demo)
- ✅ 2D Canvas (test-2d-overlay, canvas-ui-showcase)
- ✅ Lighting comparison
- ✅ Materials (holographic, metallic)
- ✅ Fog rendering

**Difference Thresholds:**

```javascript
{
  Basic 3D: 5%,              // Strict
  2D Canvas: 2%,             // Very strict
  UI/Text: 5%,               // Strict
  Advanced Materials: 15-20%, // Lenient (rendering differences)
  Particles: 20%             // Lenient (randomness)
}
```

**Output:**

- Screenshots: `test-results/screenshots/`
- Diff images: `test-results/diffs/`
- HTML report: `test-results/visual-regression-report.html`

---

## 🚀 Running Tests

### Quick Start

```bash
# Run all Babylon.js backend tests
pnpm test:babylon:all

# Run specific test suites
pnpm test:babylon          # Backend parity only
pnpm test:babylon:api      # API compatibility
pnpm test:babylon:perf     # Performance comparison
pnpm test:babylon:visual   # Visual regression
pnpm test:babylon:gameplay # Detailed gameplay tests

# Interactive UI mode (RECOMMENDED)
pnpm test:babylon:ui       # Backend parity with UI
pnpm test:playwright:ui    # All tests with UI

# Debug mode
pnpm test:playwright:debug # Opens Playwright inspector
```

### Test Execution Order

**Recommended workflow:**

1. **First Run - Backend Parity** (identify broken carts):

```bash
pnpm test:babylon:ui
```

This will show which of the 71 carts load successfully in both backends.

2. **Second Run - API Compatibility** (verify all APIs work):

```bash
pnpm test:babylon:api
```

3. **Third Run - Performance** (measure speed/memory):

```bash
pnpm test:babylon:perf
```

4. **Fourth Run - Visual Regression** (pixel comparison):

```bash
pnpm test:babylon:visual
```

5. **Review Results**:

```bash
# Open HTML report
open test-results/visual-regression-report.html

# Open Playwright report
pnpm exec playwright show-report
```

---

## 📊 Test Results Interpretation

### Backend Parity Results

**Expected Output:**

```
✅ PASS: hello-3d - Backend Parity - should load without errors in Three.js
✅ PASS: hello-3d - Backend Parity - should load without errors in Babylon.js
✅ PASS: hello-3d - Backend Parity - should have matching console output

❌ FAIL: f-zero-nova-3d - Backend Parity - should load without errors in Babylon.js
   Error: createInstancedMesh is not a function
```

**What to do with failures:**

1. Check console logs in test output
2. Look for specific error messages
3. Identify missing API implementations
4. Add to TODO list for implementation

### API Compatibility Results

**Expected Output:**

```
✅ PASS: createCube should work in both backends
✅ PASS: createSphere should work in both backends
❌ FAIL: createInstancedMesh should work in both backends
   Error: babylon - createInstancedMesh is not a function
```

**Action Items:**

- Implement missing APIs in `runtime/gpu-babylon.js`
- Add to `exposeTo()` method
- Verify with re-run

### Performance Results

**Expected Output:**

```
=== hello-3d FPS Comparison ===
Three.js: 60.00 avg, 58.00 min
Babylon:  59.50 avg, 57.00 min
Performance difference: 0.83%
✅ PASS
```

**Red Flags:**

- FPS < 30 average
- Difference > 30% between backends
- Memory > 200MB
- High frame time variance (stddev > 10ms)

### Visual Regression Results

**Expected Output:**

```
hello-3d visual comparison: {
  numDiffPixels: 1234,
  totalPixels: 921600,
  percentDiff: 0.13
}
✅ PASS: Visual output should be similar (0.13% < 5%)
```

**Reviewing Diffs:**

1. Open `test-results/visual-regression-report.html`
2. Review side-by-side comparisons
3. Check diff images (red = different pixels)
4. Acceptable differences:
   - Anti-aliasing variations
   - Slight color differences (< 2%)
   - Particle randomness
5. Unacceptable differences:
   - Missing geometry
   - Wrong colors (> 10%)
   - Text rendering issues
   - Lighting completely different

---

## 🔧 Test Configuration

### Playwright Config (`playwright.config.js`)

```javascript
{
  testDir: './tests/playwright',
  fullyParallel: false,          // Run sequentially (one worker)
  workers: 1,                    // Single worker to avoid conflicts
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',     // Capture trace on retry
    screenshot: 'only-on-failure', // Screenshot failures
    video: 'retain-on-failure',  // Video of failures
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,             // 2 minute startup timeout
  }
}
```

### Environment Variables

```bash
# Set log level for debugging
export LOG_LEVEL=DEBUG

# Run in headless mode (default)
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
```

---

## 📝 Writing New Tests

### Adding a New Cart to Backend Parity

```javascript
// In tests/playwright/backend-parity.spec.js

const CARTS_TO_TEST = [
  // ... existing carts
  { name: 'my-new-demo', description: 'My New Demo', category: 'custom' },
];
```

### Adding a New API Test

```javascript
// In tests/playwright/api-compatibility.spec.js

test('myNewAPI should work in both backends', async ({ page }) => {
  for (const backend of ['threejs', 'babylon']) {
    const url = backend === 'babylon' ? '/babylon_console.html' : '/console.html';
    await page.goto(url);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
      try {
        myNewAPI(param1, param2);
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success, `myNewAPI should work in ${backend}`).toBe(true);
  }
});
```

### Adding a New Performance Test

```javascript
// In tests/playwright/performance-comparison.spec.js

test('my-cart - FPS comparison', async ({ page }) => {
  const results = {};

  for (const backend of ['threejs', 'babylon']) {
    await loadCart(page, 'my-cart', backend);
    await page.waitForTimeout(2000);

    const fps = await measureFPS(page, 3000);
    results[backend] = fps;
  }

  expect(results.threejs.avgFPS).toBeGreaterThanOrEqual(30);
  expect(results.babylon.avgFPS).toBeGreaterThanOrEqual(30);
});
```

### Adding a New Visual Regression Test

```javascript
// In tests/playwright/visual-regression.spec.js

test('my-cart should look identical', async ({ page }) => {
  const result = await compareBackends(page, 'my-cart', {
    waitTime: 2000,
    threshold: 0.1,
    maxDiffPercent: 5,
  });

  expect(result.percentDiff).toBeLessThan(5);
});
```

---

## 🐛 Debugging Failed Tests

### Step 1: Run in Debug Mode

```bash
pnpm test:playwright:debug
```

This opens the Playwright Inspector where you can:

- Step through tests line by line
- Inspect page state
- View console logs
- Take manual screenshots

### Step 2: Run Specific Test

```bash
# Run only tests matching "Space Harrier"
npx playwright test -g "Space Harrier"

# Run only tests matching "text rendering"
npx playwright test -g "text rendering"

# Run single test file
npx playwright test tests/playwright/backend-parity.spec.js
```

### Step 3: Enable Verbose Logging

```bash
# In browser console (when running cart manually):
setLogLevel('TRACE');

# Or via URL:
http://localhost:3001/console.html?demo=space-harrier-3d&debug=1
```

### Step 4: Check Test Artifacts

After a test run, check:

- `playwright-report/` - HTML test report
- `test-results/` - Screenshots, videos, traces
- `test-results/screenshots/` - Visual regression screenshots
- `test-results/diffs/` - Diff images showing pixel differences

### Step 5: Analyze Failures

Common failure patterns:

**1. Timeout Waiting for Scene:**

```
Error: waitFor3DScene() timeout exceeded
```

**Fix:** Increase timeout or check if cart has rendering issues

**2. Missing API:**

```
Error: createInstancedMesh is not a function
```

**Fix:** Implement missing API in `runtime/gpu-babylon.js`

**3. Visual Difference > Threshold:**

```
Expected: percentDiff < 5
Received: 12.5
```

**Fix:** Review diff image, adjust threshold if acceptable, or fix rendering issue

**4. Performance Degradation:**

```
Expected: avgFPS >= 30
Received: 18.5
```

**Fix:** Profile performance, optimize Babylon.js backend

---

## 📈 Test Coverage Summary

### Total Test Count

```
Backend Parity:        213 tests (71 carts × 3 tests each)
API Compatibility:     21 tests (7 categories)
Performance:           13 tests (6 categories)
Visual Regression:     18 tests (9 categories)
---------------------------------------------------
TOTAL:                 265 automated tests
```

### Cart Categories Tested

```
✅ Basic (3 carts)
✅ 3D Games (9 carts)
✅ 3D Showcases (5 carts)
✅ FPS (4 carts)
✅ Voxel (5 carts)
✅ Rendering (5 carts)
✅ Physics (3 carts)
✅ Particles (3 carts)
✅ Creative (5 carts)
✅ Stage/2D (5 carts)
✅ UI (5 carts)
✅ Tween (3 carts)
✅ XR/VR (3 carts)
✅ Systems (5 carts)
✅ Platformer (3 carts)
✅ NFT (1 cart)
✅ Babylon-specific (1 cart)
```

---

## 🎯 Success Criteria

### Definition of "Backend Parity Achieved"

A cart is considered to have backend parity when:

1. ✅ **Loads without errors** in both backends
2. ✅ **Console output matches** (±20% print calls)
3. ✅ **Text renders correctly** (print() calls visible)
4. ✅ **Visual output similar** (< 15% pixel difference for 3D, < 5% for 2D)
5. ✅ **Performance acceptable** (FPS within 30% of Three.js)
6. ✅ **Player controls work** (if applicable)
7. ✅ **No missing API errors**

### Current Status (After Test Expansion)

**Expected Results:**

- Backend Parity: ~33% passing initially (7/21 baseline carts)
- API Compatibility: TBD (needs implementation)
- Performance: TBD (needs benchmarking)
- Visual Regression: TBD (needs pixel analysis)

**Goal:**

- Backend Parity: 90%+ (64/71 carts)
- API Compatibility: 100% (all APIs implemented)
- Performance: 90%+ (FPS within 30%)
- Visual Regression: 80%+ (acceptable visual similarity)

---

## 🔄 Continuous Integration

### Running Tests in CI

```yaml
# .github/workflows/babylon-tests.yml (example)

name: Babylon.js Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run backend parity tests
        run: pnpm test:babylon

      - name: Run API compatibility tests
        run: pnpm test:babylon:api

      - name: Run performance tests
        run: pnpm test:babylon:perf

      - name: Run visual regression tests
        run: pnpm test:babylon:visual

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            playwright-report/
            test-results/
```

---

## 📚 Additional Resources

### Playwright Documentation

- [Playwright Docs](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Playwright Inspector](https://playwright.dev/docs/debug)

### Nova64 Documentation

- `BABYLON_AUTOMATED_TESTING.md` - Original testing guide
- `BABYLON_DEBUG_SUMMARY.md` - Manual debugging guide
- `LOGGING.md` - Environment-aware logging system
- `SESSION_SUMMARY.md` - Implementation session summary
- `CLAUDE.md` - Complete development guide

### Test Files

- `tests/playwright/backend-parity.spec.js` - Main parity tests (71 carts)
- `tests/playwright/api-compatibility.spec.js` - API tests (21 tests)
- `tests/playwright/performance-comparison.spec.js` - Performance tests (13 tests)
- `tests/playwright/visual-regression.spec.js` - Visual tests (18 tests)
- `tests/playwright/space-harrier-gameplay.spec.js` - Detailed gameplay tests
- `tests/playwright/helpers.js` - Shared test utilities

---

## 🎓 Best Practices

### 1. Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Keep tests independent (no shared state)

### 2. Test Reliability

- Use explicit waits (`waitForTimeout`) instead of arbitrary delays
- Set appropriate timeouts for heavy carts
- Allow tolerance for timing-dependent tests (physics, particles)

### 3. Performance Testing

- Warmup period before measuring (2 seconds)
- Measure over sufficient duration (3+ seconds)
- Allow variance between runs (±30%)

### 4. Visual Regression

- Use strict thresholds for 2D/text (2-5%)
- Use lenient thresholds for 3D/materials (15-20%)
- Review diff images manually for critical carts

### 5. Debugging

- Use Playwright UI for interactive debugging
- Enable trace on retry for failure diagnosis
- Check console logs for cart-specific errors

---

**Last Updated:** Comprehensive test expansion completed
**Status:** 265 automated tests across 4 categories
**Coverage:** All 71 demo carts + complete API surface + performance benchmarks + visual regression
