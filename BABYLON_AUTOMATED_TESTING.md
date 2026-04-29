# Babylon.js Automated Testing with Playwright

## Overview

Automated browser testing using Playwright to systematically compare Three.js vs Babylon.js backend behavior.

## Why Automated Testing?

✅ **Consistent** - Same tests run every time
✅ **Fast** - Can test all 71 demos in minutes
✅ **Data-Driven** - Captures console logs, screenshots, metrics
✅ **Repeatable** - Run after every code change
✅ **CI/CD Ready** - Can run in GitHub Actions

## Quick Start

### Install Dependencies
```bash
pnpm install
```

### Run All Backend Parity Tests
```bash
pnpm test:babylon
```

### Run Tests with UI (Interactive)
```bash
pnpm test:babylon:ui
```

### Debug a Failing Test
```bash
pnpm test:playwright:debug
```

## URL Query Parameters

Both `console.html` (Three.js) and `babylon_console.html` (Babylon.js) support:

- **`?demo=cart-name`** - Load cart by name
  ```
  http://localhost:5173/console.html?demo=space-harrier-3d
  http://localhost:5173/babylon_console.html?demo=space-harrier-3d
  ```

- **`?path=/examples/cart/code.js`** - Load cart by path
  ```
  http://localhost:5173/console.html?path=/examples/hello-3d/code.js
  ```

## Test Structure

### Directory Layout
```
tests/
├── playwright/
│   ├── backend-parity.spec.js  # Main test suite
│   ├── helpers.js               # Helper functions
│   └── ...
playwright.config.js             # Playwright configuration
```

### Test Categories

#### 1. **Load Tests** - Does cart load without errors?
```javascript
test('should load without errors in Babylon.js', async ({ page }) => {
  await loadCart(page, 'space-harrier-3d', 'babylon');
  const metrics = extractMetrics(logs);
  expect(metrics.errors.length).toBe(0);
});
```

#### 2. **Console Output Tests** - Do both backends log similar output?
```javascript
test('should have matching console output', async ({ page }) => {
  // Compare print() calls, framebuffer pixels, etc.
  expect(metricsThreejs.printCalls.length)
    .toBeCloseTo(metricsBabylon.printCalls.length, tolerance);
});
```

#### 3. **Text Rendering Tests** - Is text visible?
```javascript
test('should render start screen text', async ({ page }) => {
  const textStatus = isTextRendering(logs);
  expect(textStatus.printCallsMade).toBe(true);
  expect(textStatus.hasFramebufferContent).toBe(true);
});
```

#### 4. **Player Control Tests** - Do controls work correctly?
```javascript
test('should move player left', async ({ page }) => {
  await pressKey(page, 'a', 500);
  const finalPos = getPlayerPosition(logs);
  expect(finalPos.x).toBeLessThan(initialPos.x);
});
```

#### 5. **Boundary Tests** - Are player boundaries enforced?
```javascript
test('should enforce player boundaries', async ({ page }) => {
  await pressKey(page, 'd', 3000); // Hold right
  const pos = getPlayerPosition(logs);
  expect(pos.x).toBeLessThanOrEqual(22);
});
```

#### 6. **Visual Comparison Tests** - Do they look the same?
```javascript
test('should have similar visual output', async ({ page }) => {
  const screenshotThreejs = await screenshotCanvas(page, 'threejs');
  const screenshotBabylon = await screenshotCanvas(page, 'babylon');
  // Screenshots saved to playwright-report/
});
```

## Test Helpers (tests/playwright/helpers.js)

### Load a Cart
```javascript
await loadCart(page, 'space-harrier-3d', 'babylon');
```

### Simulate Input
```javascript
await pressKey(page, 'Space', 200);  // Press space for 200ms
await pressKey(page, 'a', 500);      // Hold 'a' for 500ms
```

### Extract Metrics from Console
```javascript
const metrics = extractMetrics(logs);
// Returns:
// {
//   printCalls: ['SPACE', 'HARRIER', ...],
//   framebufferPixels: [12500, 12480, ...],
//   playerMoves: ['5.23, 0.00, -5.00', ...],
//   errors: [],
//   warnings: []
// }
```

### Check Text Rendering
```javascript
const textStatus = isTextRendering(logs);
// Returns:
// {
//   printCallsMade: true,
//   hasFramebufferContent: true,
//   printCalls: 15,
//   samplePrint: '[API] print() called: text="SPACE"'
// }
```

### Get Player Position
```javascript
const pos = getPlayerPosition(logs);
// Returns: { x: 5.23, y: 0.0, z: -5.0 }
```

## Current Test Coverage

### Carts Being Tested
- ✅ space-harrier-3d
- ✅ crystal-cathedral-3d
- ✅ f-zero-nova-3d
- ✅ wad-demo
- ✅ hello-3d

### To Add (All 71 Demos)
Modify `CARTS_TO_TEST` array in `backend-parity.spec.js`:
```javascript
const CARTS_TO_TEST = [
  { name: 'space-harrier-3d', description: 'Space Harrier 3D' },
  { name: 'minecraft-demo', description: 'Minecraft Demo' },
  // ... add all 71 carts
];
```

## Test Reports

After running tests, open the HTML report:
```bash
npx playwright show-report
```

Reports include:
- ✅ Test results (pass/fail)
- 📊 Console logs from both backends
- 📷 Screenshots (on failure)
- 🎥 Videos (on failure)
- ⏱️ Performance timings

## Debugging Failed Tests

### 1. Run in UI Mode
```bash
pnpm test:babylon:ui
```
- See tests run in real-time
- Pause/resume execution
- Inspect DOM at any point
- Time-travel debugging

### 2. Run in Debug Mode
```bash
pnpm test:playwright:debug
```
- Opens Playwright Inspector
- Step through test line-by-line
- View console logs live

### 3. Check Screenshots
Failed tests automatically save screenshots to:
```
playwright-report/screenshots/
```

### 4. Check Videos
Failed tests save videos to:
```
playwright-report/videos/
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Babylon Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:babylon
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Extending Tests

### Add a New Cart
```javascript
const CARTS_TO_TEST = [
  // ... existing carts
  { name: 'my-new-cart', description: 'My New Cart' },
];
```

### Add a Custom Test
```javascript
test('should do something specific', async ({ page }) => {
  await loadCart(page, 'my-cart', 'babylon');

  // Custom test logic here
  const customMetric = await page.evaluate(() => {
    return window.myGlobalVariable;
  });

  expect(customMetric).toBe(expectedValue);
});
```

### Add Visual Regression Testing
Install pixelmatch:
```bash
pnpm add -D pixelmatch
```

Use in test:
```javascript
import pixelmatch from 'pixelmatch';

test('should match visual output', async ({ page }) => {
  const img1 = await screenshotCanvas(page, 'threejs');
  const img2 = await screenshotCanvas(page, 'babylon');

  const diff = pixelmatch(img1, img2, null, 640, 360, {
    threshold: 0.1
  });

  expect(diff).toBeLessThan(1000); // Less than 1000 different pixels
});
```

## Known Limitations

1. **Canvas Screenshot Issues** - Some canvas rendering might not be captured correctly
2. **Timing Sensitivity** - Tests use fixed waits; may need adjustment
3. **MCP Integration** - Playwright MCP server could provide real-time updates (TODO)

## Next Steps

1. ✅ Add all 71 demos to `CARTS_TO_TEST`
2. ✅ Add visual regression testing with pixelmatch
3. ✅ Set up GitHub Actions CI
4. ✅ Investigate Playwright MCP server for real-time monitoring
5. ✅ Add performance benchmarking (FPS comparison)

## Success Criteria

A cart passes when:
- ✅ Loads without console errors in both backends
- ✅ Text rendering works (print calls + framebuffer content)
- ✅ Player controls work identically
- ✅ Visual output matches (>95% similar)
- ✅ Performance within 20% (FPS)

## FAQ

### Q: How do I test just one cart?
```bash
npx playwright test -g "Space Harrier"
```

### Q: How do I run tests in headed mode (see browser)?
```bash
npx playwright test --headed
```

### Q: How do I run only failing tests?
```bash
npx playwright test --last-failed
```

### Q: How do I update test snapshots?
```bash
npx playwright test --update-snapshots
```

### Q: Is there an MCP server for Playwright?
Check the Playwright MCP registry - if available, we can integrate it for real-time test monitoring and control through Claude!
