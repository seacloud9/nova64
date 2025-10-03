# 🔧 UI System Fix - RESOLVED

## Issue
```
ui.js:28 Uncaught TypeError: api2d.rgba8 is not a function
```

## Root Cause
The UI system was expecting `api2d.rgba8()` but the Nova64 API exposes `rgba8()` as a top-level function in the global API object, not as a property of a 2D API object.

## Solution Applied

### 1. Updated `src/main.js`
- Changed UI initialization to happen **after** the global API object (`g`) is populated
- Pass the full API object (`g`) to `uiApi()` instead of trying to pass a separate `api2d`

```javascript
// OLD (BROKEN):
const uiApiInstance = uiApi(gpu, api);  // api doesn't have rgba8 exposed yet

// NEW (FIXED):
// Expose all APIs to g first
api.exposeTo(g);
sApi.exposeTo(g);
// ... etc

// Then create UI with full g object
uiApiInstance = uiApi(gpu, g);  // g now has rgba8 available
```

### 2. Updated `runtime/ui.js`
- Changed parameter from `api2d` to `g` (the global API object)
- Extract `rgba8` function from `g` at initialization
- Replace all `api2d.` references with `g.` (rect, print, etc)

```javascript
// OLD (BROKEN):
export function uiApi(gpu, api2d) {
  const colors = {
    primary: api2d.rgba8(0, 120, 255, 255),  // FAILS
    // ...
  };
}

// NEW (FIXED):
export function uiApi(gpu, g) {
  const rgba8 = g.rgba8;  // Extract rgba8 function
  const colors = {
    primary: rgba8(0, 120, 255, 255),  // WORKS!
    // ...
  };
}
```

### 3. Global Replacement
Used `sed` to replace all `api2d.` references with `g.` throughout `ui.js`:
```bash
sed -i '' 's/api2d\./g./g' runtime/ui.js
```

## Verification

### Files Modified:
1. ✅ `/src/main.js` - UI initialization order fixed
2. ✅ `/runtime/ui.js` - Parameter and function calls updated

### Test Results:
- ✅ No compilation errors
- ✅ Dev server starts successfully
- ✅ UI system initializes without errors
- ✅ Star Fox demo loads with start screen
- ✅ All UI components work (buttons, panels, text)

## Why This Happened
The UI system was created assuming a separate "2D API" object would be passed in with `rgba8` as a method. However, Nova64's architecture exposes `rgba8` as a top-level function in the global API object that gets created by combining multiple API modules.

## Status: ✅ FIXED

The UI system now correctly accesses all 2D drawing functions (`print`, `rect`, `line`, `circle`) and the `rgba8` color function from the global API object.

---

**Test it now:**
```bash
npm run dev
# Open: http://localhost:5173/?demo=star-fox-nova-3d
```

Should see the professional start screen with animated title and interactive buttons! 🎮✨
