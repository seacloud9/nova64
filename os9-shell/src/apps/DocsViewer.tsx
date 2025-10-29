import { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  content: string;
  category: 'api' | 'tutorial' | 'guide' | 'reference';
}

const DOCS: DocSection[] = [
  {
    id: 'intro',
    title: '🎮 Getting Started with nova64',
    category: 'tutorial',
    content: `
# Welcome to nova64!

nova64 is a retro-inspired virtual console for creating games with modern JavaScript.

## Quick Start

1. Open **Game Studio** to create a new game
2. Write your game code using the nova64 API
3. Click **Run** to test your game
4. Save your game and share it!

## Example: Hello World

\`\`\`javascript
// Draw a simple rectangle
novaContext.draw.rect(100, 100, 50, 50, '#FF0000');
novaContext.draw.text('Hello nova64!', 100, 80);
\`\`\`
    `,
  },
  {
    id: '3d-api',
    title: '🎨 3D Graphics API',
    category: 'api',
    content: `
# 3D Graphics API

Create immersive 3D worlds with nova64's WebGL-powered 3D engine.

## Creating a 3D Scene

\`\`\`javascript
// Initialize 3D scene
novaContext.scene3d.create();

// Add a cube
novaContext.scene3d.addCube({
  x: 0,
  y: 0,
  z: -5,
  size: 1,
  color: '#FF0000'
});

// Add lighting
novaContext.scene3d.addLight({
  type: 'directional',
  direction: [1, -1, -1]
});
\`\`\`

## Available Models
- Cubes, Spheres, Cylinders
- GLB model loading
- Custom mesh support
    `,
  },
  {
    id: '2d-api',
    title: '✏️ 2D Drawing API',
    category: 'api',
    content: `
# 2D Drawing API

Classic 2D graphics for retro-style games.

## Basic Shapes

\`\`\`javascript
// Rectangle
novaContext.draw.rect(x, y, width, height, color);

// Circle  
novaContext.draw.circle(x, y, radius, color);

// Line
novaContext.draw.line(x1, y1, x2, y2, color, width);

// Text
novaContext.draw.text(text, x, y, {
  font: '16px Arial',
  color: '#FFFFFF',
  align: 'center'
});
\`\`\`

## Sprites & Images

\`\`\`javascript
// Load a sprite
const sprite = novaContext.sprites.load('player.png');

// Draw sprite
novaContext.sprites.draw(sprite, x, y);
\`\`\`
    `,
  },
  {
    id: 'input',
    title: '🎮 Input Handling',
    category: 'api',
    content: `
# Input Handling

Handle keyboard, mouse, and gamepad input.

## Keyboard

\`\`\`javascript
// Check if key is pressed
if (novaContext.input.isKeyDown('ArrowUp')) {
  playerY -= speed;
}

// Key events
novaContext.input.onKeyPress('Space', () => {
  player.jump();
});
\`\`\`

## Mouse

\`\`\`javascript
// Mouse position
const mouseX = novaContext.input.mouseX;
const mouseY = novaContext.input.mouseY;

// Mouse clicks
novaContext.input.onClick((x, y) => {
  console.log('Clicked at:', x, y);
});
\`\`\`

## Gamepad

\`\`\`javascript
// Check gamepad button
if (novaContext.input.gamepad.isButtonPressed(0)) {
  player.jump();
}

// Analog sticks
const leftStickX = novaContext.input.gamepad.getAxis(0);
\`\`\`
    `,
  },
  {
    id: 'audio',
    title: '🔊 Audio System',
    category: 'api',
    content: `
# Audio System

Play sounds and music in your games.

## Sound Effects

\`\`\`javascript
// Load and play sound
const jumpSound = novaContext.audio.loadSound('jump.wav');
novaContext.audio.playSound(jumpSound);

// Volume control
novaContext.audio.setVolume(jumpSound, 0.7);
\`\`\`

## Background Music

\`\`\`javascript
// Play music (loops by default)
const bgMusic = novaContext.audio.loadMusic('theme.mp3');
novaContext.audio.playMusic(bgMusic, { loop: true });

// Stop music
novaContext.audio.stopMusic();
\`\`\`
    `,
  },
  {
    id: 'examples',
    title: '📚 Example Games',
    category: 'guide',
    content: `
# Example Games

Learn from these complete game examples:

## 🏎️ F-Zero Racing
High-speed 3D racing with Mode 7 effects.
- 3D track rendering
- Collision detection
- Lap timing

## ⚔️ Knight Platformer
Classic 2D platformer with GLB character models.
- Physics and jumping
- Enemy AI
- Level design

## 🌆 Cyberpunk City
Explore a neon-lit 3D world.
- First-person camera
- Dynamic lighting
- Interactive objects

Check out the **Game Launcher** to play these games!
    `,
  },
];

export function DocsViewer() {
  const [selectedDoc, setSelectedDoc] = useState<DocSection>(DOCS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = DOCS.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', background: '#F5F5F5' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 280,
          borderRight: '3px solid #000',
          background: 'linear-gradient(180deg, #E8E8E8 0%, #D8D8D8 100%)',
          overflow: 'auto',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ 
          padding: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderBottom: '3px solid #000',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
        }}>
          <div style={{ 
            fontSize: 20, 
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 12,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}>
            📚 Documentation
          </div>
          <input
            type="text"
            placeholder="🔍 Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #000',
              borderRadius: 6,
              fontSize: 12,
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0066FF';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1), 0 0 0 2px rgba(0,102,255,0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#000';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
            }}
          />
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          {['tutorial', 'api', 'guide', 'reference'].map((category) => {
            const categoryDocs = filteredDocs.filter((d) => d.category === category);
            if (categoryDocs.length === 0) return null;

            const categoryIcons: Record<string, string> = {
              tutorial: '🎓',
              api: '⚙️',
              guide: '📖',
              reference: '📋',
            };

            return (
              <div key={category} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#666',
                    padding: '8px 12px',
                    background: 'linear-gradient(180deg, #F0F0F0 0%, #E0E0E0 100%)',
                    border: '2px solid #CCC',
                    borderRadius: 6,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <span>{categoryIcons[category]}</span>
                  {category}
                </div>
                {categoryDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      background: selectedDoc.id === doc.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                      color: selectedDoc.id === doc.id ? '#FFFFFF' : '#000',
                      border: selectedDoc.id === doc.id ? '2px solid #0000FF' : '2px solid transparent',
                      borderRadius: 6,
                      marginBottom: 6,
                      fontWeight: selectedDoc.id === doc.id ? 'bold' : 'normal',
                      transition: 'all 0.15s ease',
                      boxShadow: selectedDoc.id === doc.id ? '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDoc.id !== doc.id) {
                        e.currentTarget.style.background = 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)';
                        e.currentTarget.style.borderColor = '#999';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDoc.id !== doc.id) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {doc.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: 32,
          overflow: 'auto',
          background: '#FFFFFF',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{ 
            maxWidth: 800, 
            margin: '0 auto',
            animation: 'fadeIn 0.3s ease-out',
          }}
          dangerouslySetInnerHTML={{
            __html: formatMarkdown(selectedDoc.content),
          }}
        />
      </div>
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 28px; margin: 24px 0 16px;">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 22px; margin: 20px 0 12px;">$1</h2>');

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre style="background: #1E1E1E; color: #D4D4D4; padding: 16px; border-radius: 6px; overflow-x: auto; font-family: Monaco, monospace; font-size: 13px; line-height: 1.5;"><code>$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: #F0F0F0; padding: 2px 6px; border-radius: 3px; font-family: Monaco, monospace; font-size: 12px;">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin: 6px 0;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul style="margin: 12px 0; padding-left: 24px;">$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">');
  html = '<p style="margin: 12px 0; line-height: 1.6;">' + html + '</p>';

  return html;
}
