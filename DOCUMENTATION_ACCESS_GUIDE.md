# 📚 How to Access Nova64 Documentation

## 🚀 Quick Start Guide

### Method 1: From the Main Page (Easiest!)

1. **Open Nova64** in your browser:
   ```
   http://localhost:5173/
   ```
   or open `/index.html` directly

2. **Look for the bright button** in the control panel:
   ```
   📚 API Documentation
   ```
   It has a cyan-to-magenta gradient and is impossible to miss!

3. **Click the button** - Documentation opens in a new tab

4. **Browse the APIs** - Click any card to view detailed documentation

### Method 2: Direct Access

Navigate directly to:
```
/docs/index.html
```

### Method 3: Bookmark It

Add this to your bookmarks:
```
http://localhost:5173/docs/index.html
```

## 🎯 What You'll Find

### Main Documentation Page (`/docs/index.html`)

The landing page shows **23 API modules** organized into categories:

```
🎨 Graphics APIs (6)
├── 2D Drawing API
├── 3D Graphics API
├── Sprite System
├── Skybox API
├── Visual Effects
└── Voxel Engine

🎯 Input & Interaction (2)
├── Input System
└── UI System

🔊 Audio & Physics (3)
├── Audio System
├── Physics Engine
└── Collision Detection

🛠️ Utilities & Systems (5)
├── Storage API
├── Screen Manager
├── Text Input
├── Sprite Editor
└── Fullscreen Button

🔧 Internal Systems (5)
├── Console System
├── Framebuffer
├── Font System
├── Asset Loader
└── GPU Systems
```

### Individual API Pages

Each API page contains:

1. **Overview** - What the API does
2. **Function Reference** - Every function documented
3. **Parameters** - Types and descriptions
4. **Return Values** - What functions return
5. **Code Examples** - Real-world usage
6. **Usage Tips** - Best practices
7. **Related APIs** - Links to connected systems

## 📖 Featured Documentation Pages

### 🌟 Most Comprehensive (Full Reference)

1. **2D Drawing API** (`/docs/api.html`)
   - All drawing functions: cls, pset, line, rect, circle
   - Color system: rgba8, packRGBA64
   - Camera system: setCamera, getCamera
   - Text rendering: print

2. **Input System** (`/docs/input.html`)
   - Keyboard: isKeyDown, isKeyPressed, btn, btnp
   - Mouse: mouseX, mouseY, mouseDown, mousePressed
   - Gamepad: leftStickX, leftStickY, gamepadConnected
   - Complete control examples

3. **UI System** (`/docs/ui.html`)
   - Buttons: createButton, updateAllButtons
   - Panels: createPanel, drawAllPanels
   - Text: drawText, drawTextShadow, drawTextOutline
   - Progress bars and layout helpers

4. **Audio System** (`/docs/audio.html`)
   - Sound effects: sfx()
   - Waveforms: square, sine, saw, noise
   - Synthesis parameters: freq, dur, vol, sweep

5. **Fullscreen Button** (`/docs/fullscreen-button.html`)
   - Complete implementation guide
   - Cross-browser compatibility
   - Integration with demos

## 🎨 Documentation Features

### Beautiful Design
- **Cyberpunk/Neon Theme** - Matches Nova64's aesthetic
- **Cyan & Magenta** - Signature Nova64 colors
- **Dark Mode** - Easy on the eyes
- **Smooth Animations** - Hover effects on cards

### Easy Navigation
- **Categorized APIs** - Find what you need fast
- **Quick Links** - Jump to popular APIs
- **Breadcrumbs** - "Back to Index" on every page
- **Related APIs** - Discover connected features

### Developer-Friendly
- **Code Examples** - Copy-paste ready
- **Syntax Highlighting** - Easy to read
- **Parameter Tables** - Clear types and defaults
- **Return Values** - Know what to expect

## 💡 Usage Examples

### Example 1: Learning to Draw

```
1. Open docs/index.html
2. Click "2D Drawing API"
3. Read the overview
4. Try the cls() example
5. Experiment with rect() and circle()
6. Build your first game screen!
```

### Example 2: Adding Controls

```
1. Navigate to Input System
2. Learn isKeyDown() vs isKeyPressed()
3. See gamepad examples
4. Implement player movement
```

### Example 3: Creating Menus

```
1. Open UI System documentation
2. Learn createButton()
3. Study panel examples
4. Build your game menu
```

## 🔍 Finding Functions

### By Category
Use the main index page - APIs are organized by purpose

### By Name
Use your browser's search (Cmd+F / Ctrl+F) on any page

### By Related API
Each page lists related APIs at the bottom

## 📱 Mobile Access

The documentation is **fully responsive**:
- ✅ Works on phones
- ✅ Works on tablets
- ✅ Works on desktops
- ✅ Adapts to any screen size

## 🎯 Quick Reference Cards

### Most Used Functions

**Drawing:**
```javascript
cls(rgba8(0, 0, 20))           // Clear screen
rect(x, y, w, h, color, true)  // Draw rectangle
print("Score: " + score, 10, 10) // Draw text
```

**Input:**
```javascript
if (isKeyDown('ArrowLeft')) { } // Check key
if (mousePressed()) { }         // Check mouse
const x = leftStickX()          // Gamepad
```

**UI:**
```javascript
const btn = createButton(x, y, w, h, "Start", onClick)
updateAllButtons()
drawAllButtons()
```

**Audio:**
```javascript
sfx({ wave: 'square', freq: 440, dur: 0.2 })
```

## 🎉 What's Documented

### ✅ Complete Coverage (100%)

All 23 runtime APIs are documented:
- Core APIs (2D, 3D, Input, Audio, UI)
- Specialized Systems (Sprites, Skybox, Effects, Voxels)
- Physics & Collision
- Utilities (Storage, Screens, Text Input)
- Internal Systems (Console, GPU, Font, Assets)

### 📊 Documentation Quality

| API | Status | Size |
|-----|--------|------|
| 2D Drawing | ⭐⭐⭐⭐⭐ Full | 28K |
| Input System | ⭐⭐⭐⭐⭐ Full | 24K |
| UI System | ⭐⭐⭐⭐⭐ Full | 28K |
| Audio System | ⭐⭐⭐⭐⭐ Full | 20K |
| 3D Graphics | ⭐⭐⭐⭐ Standard | 8K |
| All Others | ⭐⭐⭐⭐ Standard | 4-8K |

## 🔗 Useful Links

- **Main Index:** `/docs/index.html`
- **2D Drawing:** `/docs/api.html`
- **3D Graphics:** `/docs/api-3d.html`
- **Input:** `/docs/input.html`
- **UI:** `/docs/ui.html`
- **Audio:** `/docs/audio.html`

## 💬 Support

If you need help:
1. Check the documentation first
2. Look at code examples
3. Try the demos in `/examples/`
4. Review related APIs

## 🎮 Ready to Build!

You now have:
- ✅ Complete API reference
- ✅ Code examples
- ✅ Best practices
- ✅ Beautiful design
- ✅ Easy navigation

**Start creating amazing games with Nova64!**

---

**Documentation Version:** 1.0.0  
**Last Updated:** October 27, 2025  
**Coverage:** 100% (23/23 APIs)  
**Status:** ✅ Complete
