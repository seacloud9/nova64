# Quick Start Guide - nova64 OS 9 Shell

## ⚡ 30-Second Start

```bash
cd os9-shell
pnpm install
pnpm dev
```

Open browser to http://localhost:3000

## 🎯 First Steps

### 1. Watch the Boot Sequence
- Gray splash screen with nova64 logo
- Extensions load with icon animation
- Desktop appears with icons

### 2. Open Browser Console
Press F12 or Cmd+Option+I

### 3. Launch Your First App

```javascript
await novaContext.launchApp('com.nova64.notes');
```

A window should appear with the Notes app!

### 4. Try More Apps

```javascript
await novaContext.launchApp('com.nova64.paint');
await novaContext.launchApp('com.nova64.profiler');
```

### 5. Interact with Windows
- **Drag** the title bar to move
- **Double-click** title bar to windowshade (roll up/down)
- **Click close box** (left button) to close
- **Click zoom box** (right button) to maximize
- **Drag corner** to resize

### 6. Explore the Control Strip
At the bottom of the screen:
- Toggle collapse/expand
- Adjust volume (mock)
- Adjust brightness (works!)
- Toggle scanlines (retro CRT effect)
- Toggle FPS counter

### 7. Try the Filesystem

```javascript
// Write a file
await novaContext.write('/Users/Player/Documents/test.txt', 'Hello!');

// Read it back
const content = await novaContext.read('/Users/Player/Documents/test.txt');
console.log(content); // "Hello!"

// List files
const files = await novaContext.readdir('/Users/Player/Documents');
console.log(files);
```

### 8. Show an Alert

```javascript
await novaContext.alert({
  title: 'My Alert',
  message: 'This is a classic OS 9 alert!',
  buttons: ['OK']
});
```

### 9. Display a Toast

```javascript
novaContext.toast('Hello from nova64!');
```

## 🎨 Explore Features

### Desktop Icons
- Click to select
- Double-click to open (stub)
- Trash in bottom-right
- Disk icons in top-right

### Menu Bar
- Clock updates in real-time
- Nova menu (left) has system options
- App menus change based on foreground app

### Classic Features
- ✅ Windowshade (double-click title)
- ✅ Draggable windows
- ✅ Resizable windows
- ✅ Z-order management
- ✅ Modal alerts
- ✅ Toast notifications
- ✅ Control strip
- ✅ FPS counter
- ✅ Scanlines effect
- ✅ Persistent storage

## 📚 Learn More

- **README.md** - Full documentation
- **API.md** - Quick API reference
- **USAGE_EXAMPLES.md** - Code examples
- **PROJECT_SUMMARY.md** - Technical overview

## 🚀 Build for Production

```bash
pnpm build
```

Output in `dist/` folder - ready to deploy!

## 💡 Pro Tips

1. Keep browser console open to use `novaContext` API
2. All data persists in IndexedDB (survives page refresh)
3. Try the scanlines effect for authentic retro feel
4. System Profiler shows your actual hardware info
5. Paint app supports different colors and brush sizes

## ❓ Troubleshooting

**Q: Nothing appears?**  
A: Wait for boot sequence to complete (3-4 seconds)

**Q: Can't see console?**  
A: Press F12 (Windows/Linux) or Cmd+Option+I (Mac)

**Q: How do I quit an app?**  
A: Click the close box (left button in window title)

**Q: Where are files stored?**  
A: In browser IndexedDB - persists between sessions

**Q: Can I create my own apps?**  
A: Yes! See USAGE_EXAMPLES.md for full tutorial

---

**Enjoy exploring nova64 OS!** 🌟

*Classic Mac OS 9 experience in your browser*
