# nova64 OS 9 Shell - API Quick Reference

## NovaContext Methods

### Filesystem
```typescript
ctx.read(path: string): Promise<ArrayBuffer | string>
ctx.write(path: string, data: ArrayBuffer | string): Promise<void>
ctx.mkdir(path: string): Promise<void>
ctx.rm(path: string, opts?: { recursive?: boolean }): Promise<void>
ctx.stat(path: string): Promise<FileStat>
ctx.readdir(path: string): Promise<string[]>
ctx.exists(path: string): Promise<boolean>
ctx.createAlias(targetPath: string, aliasPath: string): Promise<void>
ctx.resolveAlias(path: string): Promise<string>
```

### Applications
```typescript
ctx.registerApp(app: Nova64App): void
ctx.launchApp(appId: string, args?: any): Promise<void>
ctx.quitApp(appId: string): void
ctx.getRunningApps(): string[]
```

### UI
```typescript
ctx.alert(opts: AlertOptions): Promise<string>
ctx.toast(msg: string): void
ctx.registerControlStrip(item: ControlStripItem): void
```

### Events
```typescript
ctx.on(type: string, handler: EventHandler): () => void
ctx.emit(evt: NovaEvent): void
```

### Windows
```typescript
ctx.createWindow(opts: Partial<WindowState>): string
ctx.closeWindow(windowId: string): void
ctx.focusWindow(windowId: string): void
```

### Preferences
```typescript
ctx.getPref(key: string): Promise<any>
ctx.setPref(key: string, value: any): Promise<void>
```

## Events

- `app:registered` - App registered
- `app:launched` - App launched
- `app:quit` - App quit
- `fs:changed` - Filesystem changed
- `window:created` - Window created
- `window:closed` - Window closed

## Example: Create an App

```typescript
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';

const myApp: Nova64App = {
  id: 'com.example.myapp',
  name: 'My App',
  icon: '🚀',
  
  mount(el, ctx) {
    el.innerHTML = '<h1>Hello, nova64!</h1>';
  },
  
  unmount() {
    // Cleanup
  }
};

novaContext.registerApp(myApp);
```

## Keyboard Shortcuts

- **F10** - Focus menu bar
- **⌘Tab** - App switcher
- **⌘W** - Close window
- **Esc** - Close menu/dialog
- **Double-click title** - Windowshade
