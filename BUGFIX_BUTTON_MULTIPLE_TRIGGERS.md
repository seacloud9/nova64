# Bug Fix: Button Firing Multiple Times Per Click

## Problem

The start button in the Strider demo (Knight Platformer) was firing its callback **9 times during a single mouse click**, causing the game to become unplayable.

### Symptoms
- Button callback logs appeared 9 times in console for one click
- `gameState` was being set to `'playing'` repeatedly
- Game appeared to start but was unresponsive/showed black screen
- User couldn't play the game despite button appearing to work

### Console Evidence
```
input.js:49 🖱️ Input mousedown
ui.js:494 🔘 UI setMouseButton: true pressed: true down: true
code.js:52 🎯 START BUTTON CLICKED! Changing gameState to playing...
code.js:54 ✅ gameState is now: playing
code.js:52 🎯 START BUTTON CLICKED! Changing gameState to playing...
code.js:54 ✅ gameState is now: playing
[... repeated 7 more times ...]
input.js:59 🖱️ Input mouseup
ui.js:494 🔘 UI setMouseButton: false pressed: false down: false
```

## Root Cause

In `runtime/ui.js`, the `mousePressed` state variable was set to `true` when the mouse button went down:

```javascript
function setMouseButton(down) {
  mousePressed = down && !mouseDown;  // true on initial press
  mouseDown = down;
}
```

However, **`mousePressed` was never reset back to `false`** after being checked. This caused the button update logic to trigger the callback on **every frame** while the mouse was held down (at 60 FPS, a brief click could last 5-10 frames).

```javascript
function updateButton(button) {
  // This condition was true for MULTIPLE frames
  if (over && mousePressed) {
    if (button.callback) {
      button.callback();  // 🔥 FIRED MULTIPLE TIMES!
    }
    return true;
  }
  return false;
}
```

## Solution

Reset `mousePressed` to `false` after all buttons have been checked in `updateAllButtons()`:

**File**: `runtime/ui.js`

```javascript
function updateAllButtons() {
  let anyClicked = false;
  buttons.forEach(button => {
    if (updateButton(button)) {
      anyClicked = true;
    }
  });
  // ✅ Reset mousePressed after checking all buttons
  // This prevents multiple triggers per frame
  mousePressed = false;
  return anyClicked;
}
```

## Why This Works

1. **Mouse goes down**: `setMouseButton(true)` sets `mousePressed = true`
2. **First frame**: `updateAllButtons()` runs, detects click, fires callback once
3. **End of frame**: `mousePressed` reset to `false`
4. **Second frame**: Even if mouse still down, `mousePressed` is now `false`, so callback doesn't fire
5. **Mouse released**: `setMouseButton(false)` prepares for next click

This ensures the button callback fires **exactly once per click**, regardless of how many frames the mouse button is held down.

## Impact

- ✅ Button now fires **once per click** instead of 9 times
- ✅ Game state transitions work correctly
- ✅ Game becomes playable after clicking start button
- ✅ No more black screen or unresponsive behavior
- ✅ Consistent with expected button behavior in UI systems

## Testing

1. Load Knight Platformer (Strider demo)
2. Click "▶ START GAME" button
3. Verify console shows callback fired **only once**
4. Verify game transitions to playing state
5. Verify 3D gameplay is visible and responsive

## Technical Notes

### Why Not Reset in setMouseButton()?

We can't reset `mousePressed` in `setMouseButton(false)` because that's called on mouse **up**, not after the press is processed. The press needs to be available for the entire frame so all buttons can check it.

### Multiple Buttons

The fix works correctly even when multiple buttons exist - each button gets to check `mousePressed`, and only after ALL buttons have been checked do we reset it. This allows:
- Multiple buttons to respond to the same click (if overlapping)
- OR the first button to consume the click and prevent others

### Frame Timing

The game runs at 60 FPS:
- 1 frame = ~16.7ms
- Typical mouse click = 100-200ms
- Without fix: 6-12 callback fires per click
- With fix: 1 callback fire per click ✅

## Related Fixes

This completes the three-part fix for the Knight Platformer:

1. **Scene Transition** (`BUGFIX_SCENE_TRANSITION_FINAL.md`) - Fixed mesh errors
2. **Start Button** (`BUGFIX_STRIDER_START_BUTTON.md`) - Added clickable UI
3. **Button Triggers** (this document) - Fixed multiple callback fires

Game is now fully operational! 🥷✨
