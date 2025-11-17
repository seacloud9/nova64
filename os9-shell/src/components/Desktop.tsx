import { useState } from 'react';
import type { DesktopItem } from '../types';
import { novaContext } from '../os/context';

export function Desktop() {
  const [items] = useState<DesktopItem[]>([
    {
      id: 'hd',
      name: 'Nova HD',
      path: '/',
      type: 'disk',
      icon: '💾',
      x: window.innerWidth - 100,
      y: 40,
    },
    {
      id: 'game-launcher',
      name: 'Game Launcher',
      path: '/Applications/GameLauncher.app',
      type: 'app',
      icon: '🎮',
      x: window.innerWidth - 100,
      y: 140,
    },
    {
      id: 'sprite-editor',
      name: 'Sprite Editor',
      path: '/Applications/SpriteEditor.app',
      type: 'app',
      icon: '🎨',
      x: window.innerWidth - 100,
      y: 240,
    },
    {
      id: 'studio',
      name: 'Game Studio',
      path: '/Applications/GameStudio.app',
      type: 'app',
      icon: '💻',
      x: window.innerWidth - 100,
      y: 340,
    },
    {
      id: 'docs',
      name: 'Documentation',
      path: '/Applications/Documentation.app',
      type: 'app',
      icon: '📚',
      x: window.innerWidth - 100,
      y: 440,
    },
    {
      id: 'trash',
      name: 'Trash',
      path: '/Trash',
      type: 'directory',
      icon: '🗑️',
      x: window.innerWidth - 100,
      y: window.innerHeight - 140,
    },
  ]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleItemClick = (id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      const newSelected = new Set(selectedItems);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedItems(newSelected);
    } else {
      // Single selection
      setSelectedItems(new Set([id]));
    }
  };

  const handleItemDoubleClick = (item: DesktopItem) => {
    console.log('Open:', item.name, item.path);
    
    // Launch application if it's an app
    if (item.type === 'app') {
      novaContext.launchApp(item.id);
    }
    // TODO: Open Finder window for directories
  };

  const handleDesktopClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedItems(new Set());
    }
  };

  return (
    <div className="desktop" onClick={handleDesktopClick}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`desktop-icon ${selectedItems.has(item.id) ? 'selected' : ''}`}
          style={{
            left: item.x,
            top: item.y,
          }}
          onClick={(e) => handleItemClick(item.id, e)}
          onDoubleClick={() => handleItemDoubleClick(item)}
        >
          <div className="desktop-icon-image">{item.icon}</div>
          <div className="desktop-icon-label">{item.name}</div>
        </div>
      ))}
    </div>
  );
}
