# 🎮 Nova64 Start Screen System

## Overview

All Nova64 demos now feature **professional start screens** with the new first-class UI system! Start screens provide:

- 🎨 **Attractive graphics** to draw players in
- 📖 **Clear instructions** so players know what to do
- 🎯 **Interactive buttons** for game flow control
- ✨ **Animated elements** for visual appeal
- 🎪 **Polish and professionalism** befitting the best fantasy console

## Features

### Start Screen Pattern

Every demo should follow this pattern:

1. **State Management**: Track game state (`'start'`, `'playing'`, `'gameover'`)
2. **Animated Background**: Keep 3D scene/effects running on start screen
3. **Title Animation**: Pulsing, bouncing, or glowing title text
4. **Mission Briefing**: Short, compelling description
5. **Interactive Buttons**: START, HOW TO PLAY, OPTIONS
6. **Visual Polish**: Gradients, shadows, panels, effects

### Game Over Pattern

When the game ends:

1. **Dramatic Overlay**: Dark background with stats panel
2. **Final Stats**: Score, wave/level, achievements
3. **Retry Flow**: TRY AGAIN and MAIN MENU buttons
4. **Visual Feedback**: Flashing text, color coding

## Implementation Guide

### Step 1: Add State Variables

```javascript
let gameState = 'start'; // 'start', 'playing', 'gameover'
let startScreenTime = 0;
let startButtons = [];
```

### Step 2: Create Start Screen in init()

```javascript
export async function init() {
  // ... existing setup code ...
  
  // Create start screen UI
  initStartScreen();
}

function initStartScreen() {
  // Create START button
  startButtons.push(
    createButton(centerX(200), 200, 200, 50, '▶ START MISSION', () => {
      gameState = 'playing';
      console.log('🚀 Game started!');
    }, {
      normalColor: uiColors.success,
      hoverColor: rgba8(60, 220, 120, 255),
      pressedColor: rgba8(30, 160, 80, 255)
    })
  );
  
  // Create HOW TO PLAY button
  startButtons.push(
    createButton(centerX(200), 270, 200, 40, '? HOW TO PLAY', () => {
      console.log('📖 Controls: WASD/Arrows = Move, Space = Fire');
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}
```

### Step 3: Update Game Logic

```javascript
export function update(dt) {
  // Handle start screen
  if (gameState === 'start') {
    startScreenTime += dt;
    
    // Keep background animations running
    updateBackgroundEffects(dt);
    
    // Update buttons
    updateAllButtons();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    updateAllButtons();
    return;
  }
  
  // Normal gameplay
  gameTime += dt;
  // ... rest of update logic ...
}
```

### Step 4: Draw Start Screen

```javascript
export function draw() {
  // Handle start screen
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // Handle game over
  if (gameState === 'gameover') {
    drawGameOverScreen();
    return;
  }
  
  // Normal gameplay rendering
  // ... rest of draw logic ...
}

function drawStartScreen() {
  // Gradient background overlay
  drawGradientRect(0, 0, 640, 360,
    rgba8(10, 10, 30, 200),
    rgba8(30, 10, 50, 220),
    true
  );
  
  // Animated title
  const bounce = Math.sin(startScreenTime * 2) * 10;
  setFont('huge');
  setTextAlign('center');
  drawTextShadow('YOUR GAME', 320, 50 + bounce, uiColors.primary, rgba8(0, 0, 0, 255), 4, 1);
  
  setFont('large');
  const pulse = Math.sin(startScreenTime * 3) * 0.3 + 0.7;
  const pulseColor = rgba8(
    Math.floor(255 * pulse),
    Math.floor(180 * pulse),
    50,
    255
  );
  drawTextOutline('NOVA 64', 320, 110, pulseColor, rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(400), 330, 400, 180, {
    bgColor: rgba8(0, 0, 0, 180),
    borderColor: uiColors.primary,
    borderWidth: 2,
    shadow: true
  });
  drawPanel(panel);
  
  // Mission briefing
  setFont('normal');
  setTextAlign('center');
  drawText('MISSION BRIEFING', 320, 160, uiColors.warning, 1);
  
  setFont('small');
  drawText('Your mission description here', 320, 185, uiColors.light, 1);
  drawText('Make it compelling and clear', 320, 200, uiColors.light, 1);
  
  setFont('tiny');
  drawText('CONTROLS: WASD = Move  |  Space = Action', 320, 240, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing "press start" indicator
  const alpha = Math.floor((Math.sin(startScreenTime * 4) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('▶ PRESS START TO BEGIN ◀', 320, 280, rgba8(0, 255, 100, alpha), 1);
}
```

### Step 5: Game Over Screen

```javascript
function drawGameOverScreen() {
  // Dark overlay
  rect(0, 0, 640, 360, rgba8(0, 0, 0, 200), true);
  
  // Flashing GAME OVER
  const flash = Math.floor(gameTime * 3) % 2 === 0;
  setFont('huge');
  setTextAlign('center');
  const gameOverColor = flash ? rgba8(255, 50, 50, 255) : rgba8(200, 0, 0, 255);
  drawTextShadow('GAME OVER', 320, 80, gameOverColor, rgba8(0, 0, 0, 255), 4, 1);
  
  // Stats panel
  const statsPanel = createPanel(centerX(400), centerY(200), 400, 200, {
    bgColor: rgba8(20, 0, 0, 200),
    borderColor: uiColors.danger,
    borderWidth: 3,
    shadow: true,
    title: 'MISSION FAILED',
    titleBgColor: uiColors.danger
  });
  drawPanel(statsPanel);
  
  // Stats
  setFont('large');
  setTextAlign('center');
  drawText('Final Score: ' + score, 320, 200, uiColors.warning, 1);
  
  setFont('normal');
  drawText('Level Reached: ' + level, 320, 235, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
}

function initGameOverScreen() {
  clearButtons();
  
  // Restart button
  startButtons.push(
    createButton(centerX(180), 300, 180, 45, '↻ TRY AGAIN', () => {
      restartGame();
    }, {
      normalColor: uiColors.success,
      hoverColor: rgba8(60, 220, 120, 255),
      pressedColor: rgba8(30, 160, 80, 255)
    })
  );
  
  // Main menu button
  startButtons.push(
    createButton(centerX(180), 360, 180, 40, '← MAIN MENU', () => {
      gameState = 'start';
      startScreenTime = 0;
      restartGame();
      initStartScreen();
    }, {
      normalColor: uiColors.primary,
      hoverColor: rgba8(50, 150, 255, 255),
      pressedColor: rgba8(20, 100, 200, 255)
    })
  );
}
```

## Design Principles

### 1. **Attract Mode**
Your start screen should:
- ✅ Be visually interesting (animations, effects)
- ✅ Show the game in action (background 3D)
- ✅ Make it obvious what to do (big START button)
- ✅ Communicate the game's style/theme

### 2. **Clear Communication**
- ✅ Game title prominently displayed
- ✅ Brief mission/objective text
- ✅ Controls shown clearly
- ✅ Visual hierarchy (important info is bigger/brighter)

### 3. **Visual Polish**
- ✅ Use the UI color palette (`uiColors.primary`, etc)
- ✅ Add shadows/outlines to text
- ✅ Use panels to group related info
- ✅ Animate important elements
- ✅ Consistent with game's aesthetic

### 4. **Smooth Transitions**
- ✅ Fade in/out when changing states
- ✅ Keep background effects running
- ✅ Immediate feedback on button press
- ✅ Clear visual state changes

## Examples

### Star Fox Nova 64
See `/examples/star-fox-nova-3d/code.js` for full implementation:
- ✅ Animated title with bounce effect
- ✅ Pulsing "NOVA 64" subtitle
- ✅ Mission briefing panel
- ✅ Two interactive buttons (START, HOW TO PLAY)
- ✅ Moving starfield background
- ✅ Professional game over screen with stats

### UI Demo
See `/examples/ui-demo/code.js` for UI system showcase:
- ✅ Multiple panels with different styles
- ✅ Button interactions with visual feedback
- ✅ Progress bars with color coding
- ✅ All 5 font sizes demonstrated
- ✅ Keyboard cursor control

## Testing

```bash
# Start dev server
npm run dev

# Test Star Fox with start screen
open http://localhost:5173/?demo=star-fox-nova-3d

# Test UI system demo
open http://localhost:5173/?demo=ui-demo
```

## Best Practices

### DO ✅
- Keep background effects running on start screen
- Use semantic colors (success, danger, warning)
- Make buttons large and obvious
- Add hover states to buttons
- Show controls clearly
- Make titles animated and eye-catching
- Group related info in panels
- Use shadows for text readability

### DON'T ❌
- Don't make players guess what to do
- Don't use tiny text for important info
- Don't have static, boring start screens
- Don't skip the game over screen
- Don't forget to update buttons every frame
- Don't use raw RGB values (use uiColors)

## Mouse/Keyboard Input

The UI system supports both mouse and keyboard:

```javascript
// Mouse (if available)
setMousePosition(mouseEvent.clientX, mouseEvent.clientY);
setMouseButton(mouseEvent.buttons > 0);

// Keyboard simulation (for demos without mouse)
// Arrow keys move cursor, Space clicks
if (isKeyDown('ArrowUp')) cursorY -= speed * dt;
if (isKeyDown('ArrowDown')) cursorY += speed * dt;
if (isKeyDown('ArrowLeft')) cursorX -= speed * dt;
if (isKeyDown('ArrowRight')) cursorX += speed * dt;

setMousePosition(cursorX, cursorY);
setMouseButton(isKeyDown('Space') || isKeyDown(' '));
```

## Color Palette Reference

```javascript
uiColors.primary      // Blue - Main actions
uiColors.secondary    // Light blue - Secondary info
uiColors.success      // Green - Positive actions
uiColors.warning      // Yellow - Warnings, scores
uiColors.danger       // Red - Errors, game over
uiColors.dark         // Dark gray - Backgrounds
uiColors.light        // Light gray - Text
uiColors.white        // White - Highlights
uiColors.black        // Black - Shadows
```

## Migration Checklist

Upgrading an existing demo:

- [ ] Add `gameState` variable
- [ ] Add `startScreenTime` variable
- [ ] Add `startButtons` array
- [ ] Create `initStartScreen()` function
- [ ] Create `drawStartScreen()` function
- [ ] Create `initGameOverScreen()` function
- [ ] Create `drawGameOverScreen()` function
- [ ] Update `update()` to check game state
- [ ] Update `draw()` to check game state
- [ ] Test start button starts game
- [ ] Test game over shows stats
- [ ] Test restart works correctly

## Troubleshooting

### Buttons don't respond
- ✅ Make sure `updateAllButtons()` is called every frame
- ✅ Check that `setMousePosition()` is being called
- ✅ Verify buttons are in `gameState === 'start'` check

### Text is hard to read
- ✅ Use `drawTextShadow()` or `drawTextOutline()`
- ✅ Put text over dark panels
- ✅ Use high contrast colors (white on dark, etc)

### Animations are choppy
- ✅ Use `dt` (delta time) for smooth animations
- ✅ Multiply animation speeds by `dt`
- ✅ Use sine/cosine for smooth motion

### Start screen shows gameplay
- ✅ Add early `return` in `draw()` when `gameState === 'start'`
- ✅ Only update gameplay when `gameState === 'playing'`

---

**Nova64: The Best Fantasy Console** 🎮✨  
*Now with professional start screens in every demo!*
