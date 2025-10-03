# 🎮 How to Play Star Fox Nova 64

## Quick Start

1. **Open the game**: Navigate to http://localhost:5173 in your browser
2. **Select the game**: In the dropdown menu at the top, select `star-fox-nova-3d`
3. **Start playing**: Press `SPACE` or `ENTER` to begin

## Controls

### Start Screen
- `SPACE` or `ENTER` - Start Game

### In-Game
- `W` or `↑` - Move Up
- `S` or `↓` - Move Down  
- `A` or `←` - Move Left
- `D` or `→` - Move Right
- `SPACE` - Fire Lasers
- `ESC` - Pause Game

### Pause Screen
- `ESC` or `SPACE` - Resume Game
- `Q` - Quit to Main Menu

### Game Over
- `SPACE` or `ENTER` - Try Again
- `ESC` - Return to Start Screen

## Gameplay

### Objective
- Destroy enemy ships before they reach you
- Survive as long as possible
- Achieve the highest score

### Scoring
- Each enemy destroyed: **100 points**
- Advance to next wave every **10 enemies destroyed**
- Enemies get faster with each wave

### Health System
- Start with **100 health**
- Enemy breakthroughs cost **10 health**
- Game over when health reaches **0**

## HUD Elements

### Top Left Panel
- **SHIELD** - Health bar (green = healthy, yellow = damaged, red = critical)
- **SCORE** - Current score with leading zeros
- **WAVE** - Current wave number
- **TARGETS** - Number of active enemies

### Center
- **Crosshair** - Green targeting reticle

### Top Right
- **RADAR** - Mini-map showing:
  - Cyan dot = Your ship (center)
  - Red dots = Enemy positions
- **LASERS** - Weapon status

## Tips

1. **Stay mobile** - Keep moving to avoid enemy collisions
2. **Lead your shots** - Enemies are moving, aim ahead
3. **Watch the radar** - See enemies coming from all directions
4. **Manage spacing** - Don't let too many enemies get close
5. **Use the full screen** - Move to edges when overwhelmed

## Troubleshooting

### Can't see anything
- Make sure you selected `star-fox-nova-3d` from the dropdown
- Check browser console (F12) for errors
- Try refreshing the page

### Controls not working
- Click on the game canvas to focus it
- Make sure CAPS LOCK is off
- Try both WASD and Arrow keys

### Game is too hard
- The difficulty increases with each wave
- Focus on accuracy over speed
- Use the radar to anticipate enemies

### Game is too easy
- Try to survive to Wave 10+
- Challenge: No taking damage
- Challenge: Highest score in 5 minutes

## Known Issues

If you experience any of these, please report:
- HUD not appearing
- Input not responding
- Enemies not spawning
- Projectiles not firing
- Screen not switching

## Development Notes

This game showcases Nova64's capabilities:
- ✅ Full 3D rendering (Three.js)
- ✅ 2D HUD overlay
- ✅ Screen management system
- ✅ Particle effects
- ✅ Collision detection
- ✅ Smooth 60 FPS gameplay
- ✅ Retro N64-style graphics

Inspired by classic arcade shooters like **Deserted Space** and **Star Fox 64**.
