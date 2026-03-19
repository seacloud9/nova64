# NOVA64 Homepage

## Overview

An engaging, animated landing page for the NOVA64 fantasy console that captures the retro gaming aesthetic while showcasing all the amazing features and demos.

## Files

- **`index.html`** - Main landing page with animations, features, and links
- **`console.html`** - The actual playable console interface (moved from old index.html)

## Features

### 🎨 Visual Design

- **Animated Grid Background**: Retro-style scrolling grid effect
- **Neon Glow Effects**: Cyan and pink neon colors throughout
- **Floating Particles**: Dynamic particle animations
- **CRT Terminal**: Simulated terminal with scanline effect and blinking cursor
- **Hover Animations**: Cards and buttons with smooth transitions

### 📋 Sections

1. **Hero Section**
   - Large NOVA64 logo with glow animation
   - Tagline: "Because JavaScript Deserves a GPU That Doesn't Suck"
   - Animated terminal showing initialization sequence
   - Three main action cards: Console, OS 9 Shell, Documentation

2. **Why Nova64?**
   - Three key value propositions
   - Explains benefits clearly and humorously

3. **Features Grid**
   - 6 detailed feature cards covering:
     - 3D Graphics Engine
     - Voxel Engine
     - Physics System
     - Mac OS 9 Shell
     - Creative Tools
     - Developer Experience

4. **Demo Showcase**
   - 8 clickable demo cards
   - Each links to console with specific demo loaded
   - Visual emoji icons for quick identification

5. **Footer**
   - Social links
   - License information
   - Navigation links

### 🎮 Interactive Elements

- All demo cards are clickable and load specific games
- Main action cards navigate to console, OS shell, or docs
- Smooth hover effects on all interactive elements
- URL parameter support for direct demo loading

### 🔗 Navigation Flow

```
index.html (Homepage)
├── /console.html → Main playable console
├── /console.html?demo=NAME → Direct demo loading
├── /os9-shell/index.html → Mac OS 9 interface
└── /docs/index.html → API documentation
```

## URL Parameters

The console supports direct demo loading via URL parameters:

```
/console.html?demo=crystal-cathedral-3d
/console.html?demo=f-zero-nova-3d
/console.html?demo=star-fox-nova-3d
/console.html?demo=minecraft-demo
/console.html?demo=super-plumber-64
/console.html?demo=cyberpunk-city-3d
/console.html?demo=strider-demo-3d
/console.html?demo=demoscene
```

## Design Philosophy

### Humor & Personality

The copy is intentionally funny and relatable:
- "Because JavaScript Deserves a GPU That Doesn't Suck"
- "It's like if the Nintendo 64 had a baby with modern web tech"
- "We promise it's easier than reading Three.js docs at 3 AM"
- "No Nintendo 64s were harmed in the making of this project"

### Visual Aesthetic

- **Retro-futuristic**: Combines 80s/90s gaming nostalgia with modern design
- **High contrast**: Dark backgrounds with bright neon accents
- **Animated**: Movement and transitions keep the page feeling alive
- **Performant**: CSS animations only, no heavy JavaScript

### User Journey

1. **Immediate impact**: Bold hero section grabs attention
2. **Quick understanding**: Terminal animation shows what it does
3. **Easy access**: Three big buttons for main actions
4. **Exploration**: Feature cards and demo showcase
5. **Conversion**: Multiple CTAs throughout

## Customization

### Colors

The color scheme uses CSS custom properties:

```css
--neon-cyan: #00ffff;
--neon-pink: #ff0080;
--neon-purple: #8338ec;
--dark-bg: #0a0e14;
--panel-bg: #151822;
```

### Content

All text content is in the HTML and can be easily modified. Key sections:

- Hero tagline and subtitle
- Why cards (3 value props)
- Feature cards (6 features)
- Demo cards (8 demos)

### Animations

Main animations:
- `glow` - Logo pulsing effect
- `gridScroll` - Background grid movement
- `slideInLeft/Right` - Hero text entrance
- `scanlines` - Terminal CRT effect
- `blink` - Cursor blinking
- `float` - Particle movement

## Responsive Design

The page is fully responsive with breakpoints for mobile devices:

```css
@media (max-width: 768px) {
  .logo { font-size: 3rem; }
  .tagline { font-size: 1.3rem; }
  /* ... more responsive adjustments */
}
```

## Performance

- Pure CSS animations (no JavaScript animation loops)
- Optimized grid rendering
- Minimal DOM manipulation
- Lazy particle generation

## Future Enhancements

Potential additions:
- Video demo previews on hover
- Live FPS counter from actual demos
- User testimonials section
- Screenshot gallery
- Blog integration
- Newsletter signup
- Social proof (GitHub stars, etc.)
- Dark/light mode toggle (currently dark only)

## Testing

To test the homepage:

1. Start the development server:
   ```bash
   pnpm dev
   # or
   pnpm dev
   ```

2. Open http://localhost:5174 (or your configured port)

3. Test all navigation:
   - Click "Launch Console" → should go to /console.html
   - Click "OS 9 Shell" → should open /os9-shell/index.html in new tab
   - Click "Documentation" → should open /docs/index.html in new tab
   - Click any demo card → should go to /console.html with demo loaded

4. Test responsive design:
   - Resize browser window
   - Test on mobile device
   - Check all breakpoints

## Integration

The homepage integrates with:
- **Console** (`console.html`) - Main game player
- **OS 9 Shell** (`/os9-shell/`) - Mac OS interface
- **Documentation** (`/docs/`) - API reference
- **Examples** (`/examples/`) - Demo source code

All paths are relative and work with any base URL.

## Credits

Built with vanilla HTML, CSS, and minimal JavaScript. No framework dependencies on the homepage itself (though the console and OS shell use React/Three.js).

Design inspired by:
- 80s/90s video game aesthetics
- Synthwave/retrowave art style
- Classic computer terminals
- Modern web design principles
