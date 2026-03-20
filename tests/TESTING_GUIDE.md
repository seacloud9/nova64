# Nova64 Testing Guide

This guide covers the comprehensive testing system for Nova64, including unit tests, integration tests, and demo validation.

## Test Suite Overview

Nova64 now includes a complete testing framework with:

- **3D API Tests**: Validate 3D rendering functions and GPU operations
- **Screen System Tests**: Test screen management and lifecycle
- **Integration Tests**: Verify system integration and demo compatibility
- **Performance Tests**: Benchmark rendering and API operations

## Running Tests

### Command Line Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:api         # 3D API tests only
pnpm test:input       # Input system tests only
pnpm test:integration # Integration tests only

# Direct CLI usage
node tests/test-cli.js           # All tests
node tests/test-cli.js api       # API tests only
node tests/test-cli.js input     # Input system tests only
node tests/test-cli.js integration # Integration tests only
```

### Web-Based Test Runner

```bash
# Open interactive test runner in browser
pnpm test:web

# Or manually start dev server and navigate to:
pnpm dev
# Then open: http://localhost:5173/tests/test-runner.html
```

## Test Files Structure

```
tests/
├── test-runner.html         # Interactive web test runner
├── test-runner.js          # Test framework (TestRunner, Assert, Performance)
├── test-cli.js             # Command-line test runner
├── test-3d-api.js          # 3D API and GPU tests
├── test-screen-system.js   # Screen management tests
├── test-input-system.js    # Enhanced input system tests
├── test-integration.js     # Integration and demo tests
└── test-suite.js           # Legacy test suite
```

## Writing Tests

### Basic Test Structure

```javascript
import { TestRunner, Assert } from './test-runner.js';

const runner = new TestRunner();

runner.test('Test Name', () => {
  const result = someFunction();
  Assert.isTrue(result, 'Function should return true');
});

const results = await runner.runAll();
```

### Available Assertions

```javascript
Assert.isTrue(condition, message);
Assert.isFalse(condition, message);
Assert.isEqual(actual, expected, message);
Assert.isNotNull(value, message);
Assert.isDefined(value, message);
Assert.isFunction(value, message);
Assert.isObject(value, message);
Assert.doesNotThrow(fn, message);
```

### Performance Testing

```javascript
import { Performance } from './test-runner.js';

const { average, min, max } = await Performance.benchmark(
  'Test Name',
  () => {
    // Code to benchmark
  },
  1000
); // Run 1000 iterations
```

## Test Categories

### 1. 3D API Tests (`test-3d-api.js`)

- **Mesh Creation**: `createCube()`, `createSphere()`, `createPlane()`
- **Transforms**: `setPosition()`, `setRotation()`, `setScale()`
- **Camera**: `setCameraPosition()`, `setCameraTarget()`, `setCameraFOV()`
- **Lighting**: `setLightDirection()`, `setAmbientLight()`, `setFog()`
- **Performance**: GPU operation benchmarks

### 2. Screen System Tests (`test-screen-system.js`)

- **ScreenManager**: Registration, switching, lifecycle
- **Screen Base Class**: Enter/exit, update/draw cycles
- **Data Management**: Screen data persistence
- **API Exposure**: Global function availability
- **Error Handling**: Invalid operations, edge cases

### 3. Integration Tests (`test-integration.js`)

- **API Availability**: All functions exposed globally
- **Demo Compatibility**: No `init3D` dependency
- **Initialization Patterns**: Proper 3D setup sequences
- **Cross-System**: Screen + 3D API interactions

## Demo Validation

### Star Fox Nova 3D Demo

The Star Fox demo has been fixed to use proper 3D initialization:

**❌ Old (Broken) Pattern:**

```javascript
init3D(); // This function doesn't exist!
```

**✅ New (Working) Pattern:**

```javascript
setCameraPosition(0, 5, 15);
setCameraTarget(0, 0, 0);
setCameraFOV(60);
setLightDirection(-1, -1, -1);
```

### Object Creation Fixes

**❌ Old Pattern:**

```javascript
createCube(x, y, z, size, options); // Wrong parameter order
```

**✅ New Pattern:**

```javascript
createCube(size, color, [x, y, z]); // Correct parameter order
```

## Test Results Interpretation

### Command Line Output

```
🎮 Nova64 Command Line Test Suite

🚀 Running All Tests...

1️⃣ Basic API Tests:
✅ API Structure - Global functions should be available
✅ Screen System - ScreenManager functionality
✅ Screen System - Screen base class
✅ Error Handling - Invalid operations

📊 Results: 4/4 passed

🏁 FINAL RESULTS:
   Total Tests: 6
   Passed: 6 ✅
   Failed: 0 ❌
   Success Rate: 100.0%
```

### Web Test Runner

The web test runner provides:

- Real-time test execution with progress bars
- Performance metrics and benchmarks
- Interactive controls for different test suites
- Detailed error reporting and console output
- Visual pass/fail indicators

## Continuous Integration

### Running Tests in CI

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    pnpm install
    pnpm test
    pnpm build  # Ensure demos still work after build
```

### Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## Best Practices

### Writing Robust Tests

1. **Mock Dependencies**: Use MockGPU for 3D API tests
2. **Test Error Conditions**: Verify proper error handling
3. **Performance Aware**: Include benchmark tests for critical operations
4. **Integration Focus**: Test how systems work together
5. **Demo Validation**: Ensure examples work with real API usage

### Debugging Failed Tests

1. **Check Console Output**: Web runner shows detailed logs
2. **Isolate Tests**: Run specific test suites to narrow issues
3. **Verify API Usage**: Ensure demos use correct function signatures
4. **Mock vs Real**: Some tests use mocks, verify real behavior separately

## Common Issues and Solutions

### "init3D is not defined"

### "isKeyPressed is not defined"

**Problem**: Demo using `isKeyPressed()` function which wasn't exposed by input API
**Solution**: Enhanced input API now includes:

```javascript
// ✅ Now available in Nova64 input API:
isKeyPressed('a'); // Single key press detection
isKeyDown('w'); // Continuous key hold detection
key('KeyA'); // Direct key code checking
btn(0); // Gamepad button checking
btnp(5); // Gamepad button press detection
```

**Key Code Handling**: The enhanced input system automatically converts:

- Single characters: `'a'` → `'KeyA'`
- Space key: `' '` → `'Space'`
- Other special keys handled appropriately

### "createCube wrong parameters"

**Problem**: Using old parameter order
**Solution**: Use correct signature: `createCube(size, color, [x, y, z])`

### ES Module Import Issues

**Problem**: `require is not defined` in Node.js
**Solution**: Use ES6 imports and ensure `"type": "module"` in package.json

## Test Coverage Metrics

Current test coverage includes:

- **3D API**: 15+ functions tested
- **Screen System**: Complete lifecycle coverage
- **Integration**: Demo compatibility verified
- **Performance**: GPU operations benchmarked
- **Error Handling**: Edge cases covered

---

For more information about Nova64 development, see the main [README.md](../README.md) and [NOVA64_3D_API.md](../NOVA64_3D_API.md).
