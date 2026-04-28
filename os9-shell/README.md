# nova64 OS 9 Shell

A complete, production-ready Mac OS 9 "Platinum" style GUI shell for the nova64 virtual console. Built with React, TypeScript, and modern web technologies while faithfully recreating the classic Mac OS 9 user experience.

![nova64 OS](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Quick Start

**To use OS shell with main nova64 server:**

```bash
./build-and-copy.sh
```

Then open: http://localhost:5174/os9-shell/index.html

**For standalone development:**

```bash
pnpm dev
```

Opens at: http://localhost:3000

## 🌟 Features

### Core OS Components

- **Platinum Theme**: Authentic Mac OS 9 visual design with beveled windows, crisp icons, and a calm deep-blue crystal desktop
- **Window Management**: Draggable, resizable windows with windowshade (roll-up), close/zoom boxes, and z-order management
- **Menu Bar**: Always-on-top menu bar with dynamic app menus, keyboard navigation (F10, arrows), and status widgets
- **Desktop**: Icon grid with drag-to-select, aliases, classic Finder-style navigation, and right-click background switching
- **Backgrounds**: Appearance and the desktop context menu support built-in wallpapers, solid colors, custom image URLs, and visual-only sandboxed HTML iframe URLs persisted in localStorage
- **Control Strip**: Collapsible bottom panel with volume, brightness, FPS counter, scanlines toggle, and extensible API
- **Alert Dialogs**: Classic OS 9 modal alerts with sound and customizable buttons
- **Boot Sequence**: Modernized translucent crystal boot with extension loading progress and desktop reveal

### Filesystem

- **Virtual FS**: POSIX-like filesystem backed by IndexedDB with persistence
- **Directory Structure**: Pre-seeded with `/System`, `/Applications`, `/Users`, `/Trash`
- **Aliases**: Symbolic link support with circular reference detection
- **Trash Management**: Move to trash, empty trash with confirmation

### Application Framework

- **Nova64App Interface**: Clean API for building compatible applications
- **Demo Apps Included**:
  - **Notes**: Simple text editor with auto-save
  - **Paint**: Canvas-based drawing tool with color picker and brush sizes
  - **System Profiler**: Displays hardware and system information
  - **Model Viewer**: GLB/GLTF and DOOM WAD inspection with Babylon WAD texture parity shared from the Nova64 runtime
  - **eMU**: Retro console emulator powered by EmulatorJS — supports 20+ systems (NES, SNES, N64, PlayStation, Game Boy, Sega Genesis, Arcade, and more)

### Developer Experience

- **TypeScript**: Fully typed with comprehensive interfaces
- **Hot Reload**: Vite-powered development with instant updates
- **Event System**: Pub/sub event bus for OS-level communication
- **State Management**: Zustand stores for windows, apps, UI, and system state
- **Runtime Parity Notes**: WAD scenes launched from NovaOS benefit from the same Babylon mesh-proxy material assignment and vignette guards documented in the main Nova64 backend runtime notes

### Desktop Background Workflow

- Right-click the desktop and choose **Desktop Background** to switch between the built-in presets.
- Choose **Use Image URL...** from the same submenu to set a remote image as the wallpaper.
- Choose **Plasma Drift HTML** or **Use Visual HTML URL...** to render a visual-only HTML page in a sandboxed desktop iframe behind the icons.
- HTML backgrounds are not clickable or interactive desktop widgets. They may only receive passive desktop signals such as mouse location.
- Open **Appearance** for the full background panel with wallpaper previews, solid color selection, image URL entry, and visual HTML iframe URL entry.
- Built-in wallpapers live in `os9-shell/public/wallpapers/` and are copied into `public/os9-shell/wallpapers/` by `pnpm osBuild`.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
cd os9-shell
pnpm install
```

### Development

```bash
pnpm dev
```

Visit `http://localhost:3000` to see the OS in action.

### Build for Production

```bash
pnpm build
```

The production build will be in the `dist/` directory.

## 📚 Usage

### Launching Applications

You can launch built-in apps programmatically:

```javascript
// Access the global context
const ctx = window.novaContext;

// Launch an app
await ctx.launchApp('com.nova64.notes');
await ctx.launchApp('com.nova64.paint');
await ctx.launchApp('com.nova64.profiler');
```

### Filesystem Operations

```javascript
const ctx = window.novaContext;

// Write a file
await ctx.write('/Users/Player/Documents/hello.txt', 'Hello, nova64!');

// Read a file
const content = await ctx.read('/Users/Player/Documents/hello.txt');

// Create directory
await ctx.mkdir('/Users/Player/Projects');

// List directory
const files = await ctx.readdir('/Users/Player/Documents');

// Create alias
await ctx.createAlias('/Applications', '/Users/Player/Desktop/Apps');

// Resolve alias
const target = await ctx.resolveAlias('/Users/Player/Desktop/Apps');
```

### UI Operations

```javascript
const ctx = window.novaContext;

// Show alert dialog
const result = await ctx.alert({
  title: 'Confirm Action',
  message: 'Are you sure you want to continue?',
  buttons: ['Cancel', 'OK'],
  icon: 'question',
});

// Show toast notification
ctx.toast('File saved successfully!');

// Add control strip item
ctx.registerControlStrip({
  id: 'my-widget',
  icon: '🎮',
  label: 'Game',
  onClick: () => console.log('Clicked!'),
});
```

### Event System

```javascript
const ctx = window.novaContext;

// Listen for events
const unsubscribe = ctx.on('app:launched', evt => {
  console.log('App launched:', evt.payload.appId);
});

// Emit custom events
ctx.emit({
  type: 'custom:event',
  payload: { data: 'example' },
  timestamp: Date.now(),
});

// Cleanup
unsubscribe();
```

## 🔧 Creating Custom Applications

### Application Structure

Create a new file in `src/apps/`:

```typescript
// src/apps/calculator.ts
import type { Nova64App, NovaContext } from '../types';
import { novaContext } from '../os/context';

const calculatorApp: Nova64App = {
  id: 'com.example.calculator',
  name: 'Calculator',
  icon: '🔢',

  // Optional: Define app menus
  menus: [
    {
      label: 'Edit',
      submenu: [
        { label: 'Copy', accelerator: '⌘C', role: 'copy' },
        { label: 'Paste', accelerator: '⌘V', role: 'paste' },
      ],
    },
  ],

  // Mount is called when app launches
  mount(el: HTMLElement, ctx: NovaContext) {
    el.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Calculator</h1>
        <input type="text" id="calc-display" readonly style="width: 200px; font-size: 24px; text-align: right;" />
        <!-- Add calculator buttons here -->
      </div>
    `;

    // Add event listeners, initialize state, etc.
  },

  // Unmount is called when app quits
  unmount() {
    // Clean up event listeners, save state, etc.
  },

  // Optional: Event handler for OS events
  onEvent(evt) {
    if (evt.type === 'app:foreground') {
      console.log('Calculator is now in foreground');
    }
  },

  // Optional: App metadata
  getInfo() {
    return {
      name: 'Calculator',
      version: '1.0.0',
      description: 'Simple calculator application',
      author: 'Your Name',
      icon: '🔢',
    };
  },
};

// Register with OS
novaContext.registerApp(calculatorApp);

export default calculatorApp;
```

### Registering Your App

Import your app in `src/main.tsx`:

```typescript
import './apps/calculator';
```

## 🎨 Theming

The Platinum theme is defined in `src/theme/platinum.css` using CSS variables:

```css
:root {
  --platinum-gray: #cccccc;
  --platinum-gray-dark: #707070;
  --platinum-blue: #0000dd;
  --window-title-active: linear-gradient(to bottom, #cccccc, #999999);
  --desktop-bg: #008080;
  /* ... more variables */
}
```

You can create alternate themes by overriding these variables.

## 🏗️ Architecture

### Directory Structure

```
os9-shell/
├── src/
│   ├── apps/              # Demo applications
│   │   ├── emu-app.tsx
│   │   ├── notes.ts
│   │   ├── paint.ts
│   │   └── profiler.ts
│   ├── components/        # React UI components
│   │   ├── App.tsx
│   │   ├── Window.tsx
│   │   ├── MenuBar.tsx
│   │   ├── Desktop.tsx
│   │   ├── ControlStrip.tsx
│   │   ├── AlertModal.tsx
│   │   ├── BootScreen.tsx
│   │   └── FPSCounter.tsx
│   ├── os/                # Core OS functionality
│   │   ├── filesystem.ts  # IndexedDB-based virtual FS
│   │   ├── events.ts      # Event bus
│   │   ├── stores.ts      # Zustand state management
│   │   └── context.ts     # NovaContext API implementation
│   ├── theme/
│   │   └── platinum.css   # Platinum UI theme
│   ├── types/
│   │   └── index.ts       # TypeScript type definitions
│   └── main.tsx           # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### State Management

The OS uses Zustand for state management with separate stores:

- **WindowStore**: Window positions, z-order, active window
- **AppStore**: Registered apps, running apps, foreground app
- **MenuStore**: Active menu, app-specific menus
- **UIStore**: Toasts, alerts, control strip, FPS, scanlines
- **SystemStore**: Boot state, preferences

### Event Flow

1. User interacts with UI component
2. Component updates relevant store(s)
3. Store change triggers re-render
4. Events emitted via event bus
5. Apps can listen to events and react

## 🔌 Embedding in nova64

To integrate this shell into your nova64 project:

### Option 1: Build and Import

```bash
pnpm build
```

Copy `dist/` contents to your nova64 project and mount:

```html
<div id="nova-shell"></div>
<script type="module" src="/dist/assets/index.js"></script>
```

### Option 2: Direct Integration

Import the shell as a library:

```typescript
import { novaContext } from './os9-shell/src/main';

// Use the context
await novaContext.launchApp('com.nova64.paint');
```

## 📖 API Reference

### NovaContext Interface

```typescript
interface NovaContext {
  version: string;

  // Filesystem
  read(path: string): Promise<ArrayBuffer | string>;
  write(path: string, data: ArrayBuffer | string, opts?: { append?: boolean }): Promise<void>;
  mkdir(path: string): Promise<void>;
  rm(path: string, opts?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<FileStat>;
  readdir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  createAlias(targetPath: string, aliasPath: string): Promise<void>;
  resolveAlias(path: string): Promise<string>;

  // Applications
  registerApp(app: Nova64App): void;
  launchApp(appId: string, args?: any): Promise<void>;
  quitApp(appId: string): void;
  getRunningApps(): string[];

  // UI
  alert(opts: AlertOptions): Promise<string>;
  toast(msg: string): void;
  registerControlStrip(item: ControlStripItem): void;

  // Menus
  setAppMenus(appId: string, menus: MenuTemplate[]): void;
  clearAppMenus(appId: string): void;

  // Events
  on(type: string, handler: EventHandler): () => void;
  emit(evt: NovaEvent): void;

  // Windows
  createWindow(opts: Partial<WindowState>): string;
  closeWindow(windowId: string): void;
  focusWindow(windowId: string): void;

  // Preferences
  getPref(key: string): Promise<any>;
  setPref(key: string, value: any): Promise<void>;
}
```

### Key Events

- `app:registered` - New app registered
- `app:launched` - App launched with args
- `app:quit` - App closed
- `app:foreground` - App brought to front
- `fs:changed` - Filesystem modified
- `menu:updated` - App menus changed
- `prefs:changed` - Preference updated
- `window:created` - New window opened
- `window:closed` - Window closed
- `window:focused` - Window received focus

## 🎮 Keyboard Shortcuts

- **F10**: Focus menu bar
- **⌘Tab**: Cycle between running apps
- **⌘W**: Close active window
- **⌘Q**: Quit active app
- **Esc**: Close active menu/dialog
- **Double-click title bar**: Windowshade toggle

## 🐛 Troubleshooting

### Windows not appearing

Check browser console for errors. Ensure `createWindow` is returning a valid ID.

### Filesystem operations failing

IndexedDB may be disabled in private browsing mode. Check browser settings.

### Styles not loading

Ensure `platinum.css` is imported in your entry point:

```typescript
import './theme/platinum.css';
```

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional demo apps (Terminal, File Manager, Settings)
- Finder with multiple view modes (Icon, List, Column)
- Spring-loaded folders during drag operations
- Sherlock-style search
- Multiple user support with login screen
- AppleScript-like automation

## 📄 License

MIT License - feel free to use in your projects!

## 🙏 Credits

- Inspired by classic Mac OS 9 "Platinum" interface
- Built with React, TypeScript, Vite, and Zustand
- All assets are original or open-source; no Apple trademarks used

## 🔗 Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**Built with ❤️ for retro computing enthusiasts**

_nova64 OS - Bringing the classic Mac experience to modern web browsers_
