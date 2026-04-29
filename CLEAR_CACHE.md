# How to Clear Browser Cache for Nova64

The dev server caches JavaScript modules aggressively. When you make changes to runtime files, you MUST clear the cache.

## Method 1: DevTools (Recommended)

1. **Open DevTools**: Press `F12`
2. **Go to Network Tab**
3. **Check "Disable cache"** (keep DevTools open)
4. **Hard Refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Method 2: Clear All Cache

1. **Open DevTools**: Press `F12`
2. **Right-click the Refresh button** (next to address bar)
3. **Select "Empty Cache and Hard Reload"**

## Method 3: Manually Clear (Nuclear Option)

### Chrome/Edge:

1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Time range: "Last hour" or "All time"
4. Click "Clear data"

### Firefox:

1. Press `Ctrl+Shift+Delete`
2. Select "Cache"
3. Click "Clear Now"

## Method 4: Restart Dev Server

If the above don't work, restart your dev server:

```bash
# Stop current server (Ctrl+C)
# Then restart:
wsl bash -c "cd /mnt/c/Users/brend/exp/nova64 && . ~/.nvm/nvm.sh && nvm use 20 && pnpm dev"
```

## Verification

After clearing cache, check the Network tab in DevTools:

- Look for `gpu-babylon.js?import&t=XXXXXXXXXX`
- The timestamp `t=` should be recent (current time in ms)
- Click on it and verify the source code contains your latest changes
- Search for "copyFromFloats" - should appear 5+ times

## If Problems Persist

1. **Close all browser tabs** for localhost:3000
2. **Clear cache using Method 2 or 3**
3. **Restart dev server**
4. **Open fresh tab** to http://localhost:3000/?backend=babylon
5. **Keep DevTools Network tab open** with "Disable cache" checked
