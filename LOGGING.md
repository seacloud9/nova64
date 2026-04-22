# Nova64 Environment-Aware Logging System

## Overview

Nova64 uses an environment-aware logging system that automatically adjusts verbosity based on the deployment context. This ensures production builds have minimal console noise while development builds provide rich debugging information.

## Log Levels

```javascript
LogLevel.NONE  = 0  // No logging
LogLevel.ERROR = 1  // Only errors (production default)
LogLevel.WARN  = 2  // Errors + warnings
LogLevel.INFO  = 3  // Errors + warnings + info
LogLevel.DEBUG = 4  // Development default - includes debug info
LogLevel.TRACE = 5  // Verbose tracing - use with ?debug=1
```

## Automatic Environment Detection

The logging system automatically detects the environment:

### **Production Mode** (LogLevel.ERROR)
- `NODE_ENV=production`
- `import.meta.env.PROD`
- Deployed on non-localhost domains
- **Only critical errors logged**

### **Development Mode** (LogLevel.DEBUG)
- `NODE_ENV=development`
- `import.meta.env.DEV`
- Running on `localhost`
- **Debug information visible**

### **Debug Mode** (LogLevel.TRACE)
- URL parameter: `?debug=1`
- **All logging enabled**

## Usage in Code

```javascript
import { createLogger } from '../runtime/debug-logger.js';

const logger = createLogger('MyModule');

// Always logs in production (errors only)
logger.error('Critical failure', { code: 500 });

// Logs in dev/debug only
logger.warn('Potential issue');
logger.info('Informational message');
logger.debug('Debug details');
logger.trace('Verbose tracing');

// Logs ONLY in development (suppressed in production)
logger.devOnly('This will never appear in production builds');
```

## Runtime Control

### Change Log Level Dynamically

In the browser console:

```javascript
// Set to DEBUG level
setLogLevel('DEBUG');

// Set to TRACE (maximum verbosity)
setLogLevel('TRACE');

// Disable all logging
setLogLevel('NONE');

// Reset to ERROR (production mode)
setLogLevel('ERROR');
```

### URL Parameters

```
// Enable debug mode
http://localhost:5173/console.html?debug=1

// Set specific log level
http://localhost:5173/console.html?logLevel=TRACE

// Combine with cart selection
http://localhost:5173/console.html?demo=space-harrier-3d&debug=1
```

### LocalStorage Persistence

Log level settings persist across page reloads:

```javascript
// Set and save log level
setLogLevel('DEBUG');

// Level is stored in localStorage as 'nova64:logLevel'
// Reload the page - level persists!
```

## Examples

### Basic Logging

```javascript
const logger = createLogger('Physics');

export function stepPhysics(dt) {
  logger.trace('stepPhysics called', { dt });

  try {
    // Physics calculations
    logger.debug('Collision detected', { objectA, objectB });
  } catch (error) {
    logger.error('Physics simulation failed', error);
  }
}
```

### Scoped Loggers

```javascript
const logger = createLogger('Renderer');
const glLogger = logger.scope('GL');  // Creates 'Renderer:GL' logger

glLogger.debug('Shader compiled');  // Logs: [Renderer:GL:DEBUG] Shader compiled
```

### Development-Only Logging

```javascript
const logger = createLogger('API');

function print(text, x, y) {
  // This logging is AUTOMATICALLY removed in production
  logger.devOnly(`print() called: "${text}" at (${x}, ${y})`);

  // Actual rendering code
  BitmapFont.draw(fb, text, x, y);
}
```

## Current Implementation

### Files Using Environment-Aware Logging

- **runtime/api.js** - print() calls logged in dev mode only
- **runtime/gpu-babylon.js** - Framebuffer compositing logged in dev mode
- **src/main.js** - Initializes global debug logger

### Legacy Logging (To Be Migrated)

Files still using `console.log()` directly:
- runtime/logger.js (structured logger)
- runtime/console.js (cart loading)
- examples/* (cart debug output)

## Migration Guide

**Before:**
```javascript
console.log('[MyModule] Debug message');
```

**After:**
```javascript
import { createLogger } from '../runtime/debug-logger.js';
const logger = createLogger('MyModule');

logger.debug('Debug message');  // Auto-suppressed in production
```

## Testing with Playwright

Automated tests can check for expected debug output:

```javascript
test('should log print calls in dev mode', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('http://localhost:3001/console.html?debug=1');

  // Debug logs visible with ?debug=1
  expect(logs.some(log => log.includes('[API:DEBUG]'))).toBe(true);
});
```

## Best Practices

1. **Use `logger.devOnly()` for frequent debug logs** - Automatically suppressed in production
2. **Use `logger.error()` for actual errors** - Always visible
3. **Create scoped loggers** for subsystems - Easier to filter
4. **Don't log sensitive data** - Even in dev mode
5. **Keep production builds clean** - Default to ERROR level

## Production Checklist

Before deploying:

✅ Verify `NODE_ENV=production` is set
✅ Check that `import.meta.env.PROD` is true
✅ Test with `?logLevel=ERROR` to verify minimal console output
✅ Remove any `console.log()` that bypasses the logger

## Future Enhancements

- [ ] Log level persistence in localStorage (DONE)
- [ ] Remote logging service integration
- [ ] Performance profiling mode
- [ ] Log filtering by category in UI
- [ ] Export logs to file
