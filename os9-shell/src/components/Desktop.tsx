import { useState } from 'react';
import type { DesktopItem } from '../types';
import { novaContext } from '../os/context';
import { openFinderAt } from '../apps/Finder';
import { showContextMenu, ContextMenuItem } from './ContextMenu';
import { UISounds } from '../os/sounds';

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
      id: 'hypernova',
      name: 'hyperNova',
      path: '/Applications/hyperNova.app',
      type: 'app',
      icon: '🃏',
      x: window.innerWidth - 100,
      y: 540,
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
    // Launch demoscene for Nova HD disk
    else if (item.id === 'hd') {
      novaContext.launchApp('demoscene');
    }
    // Open Finder for other disk/directory items
    else if (item.type === 'disk' || item.type === 'directory') {
      openFinderAt(item.path);
    }
  };

  const handleDesktopClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedItems(new Set());
    }
  };

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.target !== e.currentTarget) return;
    UISounds.contextMenu();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', icon: '📁', onClick: () => console.log('New Folder') },
      { type: 'separator', label: '' },
      { label: 'Clean Up', icon: '✨', onClick: () => console.log('Clean Up') },
      { label: 'Arrange by Name', onClick: () => console.log('Arrange') },
      { type: 'separator', label: '' },
      { label: 'Change Desktop Background...', icon: '🎨', onClick: () => console.log('Background') },
      { type: 'separator', label: '' },
      { label: 'Get Info', icon: 'ℹ️', onClick: () => console.log('Get Info') },
    ]);
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: DesktopItem) => {
    e.preventDefault();
    e.stopPropagation();
    UISounds.contextMenu();
    setSelectedItems(new Set([item.id]));
    
    const menuItems: ContextMenuItem[] = [
      { label: 'Open', icon: '📂', onClick: () => handleItemDoubleClick(item) },
    ];
    
    if (item.type === 'app') {
      menuItems.push({ label: 'Show Info', icon: 'ℹ️', onClick: () => console.log('Info:', item.name) });
    }
    
    if (item.type === 'disk' || item.type === 'directory') {
      menuItems.push({ label: 'Open in Finder', icon: '🔍', onClick: () => openFinderAt(item.path) });
    }
    
    menuItems.push({ type: 'separator', label: '' });
    menuItems.push({ label: 'Get Info', icon: 'ℹ️', onClick: () => console.log('Get Info:', item.name) });
    menuItems.push({ label: 'Duplicate', icon: '📋', disabled: item.type === 'disk', onClick: () => console.log('Duplicate') });
    menuItems.push({ label: 'Make Alias', icon: '🔗', onClick: () => console.log('Make Alias') });
    
    if (item.id !== 'trash' && item.type !== 'disk') {
      menuItems.push({ type: 'separator', label: '' });
      menuItems.push({ label: 'Move to Trash', icon: '🗑️', onClick: () => console.log('Trash:', item.name) });
    }
    
    showContextMenu(e.clientX, e.clientY, menuItems);
  };

  return (
    <div className="desktop" onClick={handleDesktopClick} onContextMenu={handleDesktopContextMenu}>
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
          onContextMenu={(e) => handleItemContextMenu(e, item)}
        >
          <div className="desktop-icon-image">{item.icon}</div>
          <div className="desktop-icon-label">{item.name}</div>
        </div>
      ))}
    </div>
  );
}
