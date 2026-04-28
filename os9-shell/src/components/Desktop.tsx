import { useRef, useState } from 'react';
import type { DesktopItem } from '../types';
import { novaContext } from '../os/context';
import { openFinderAt } from '../apps/Finder';
import { showContextMenu, ContextMenuItem } from './ContextMenu';
import { UISounds } from '../os/sounds';
import {
  BACKGROUND_PRESETS,
  HTML_BACKGROUND_EXAMPLES,
  useDesktopBackgroundStore,
} from '../os/stores';

export function Desktop() {
  const backgroundFrameRef = useRef<HTMLIFrameElement | null>(null);
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
      id: 'model-viewer',
      name: 'Model Viewer',
      path: '/Applications/ModelViewer.app',
      type: 'app',
      icon: '📦',
      x: window.innerWidth - 100,
      y: 640,
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
  const {
    backgroundType,
    presetId,
    imageUrl,
    iframeUrl,
    setPreset,
    setImageUrl,
    setIframeUrl,
    getBackgroundStyle,
    getIframeUrl,
  } = useDesktopBackgroundStore();

  const promptForBackgroundUrl = () => {
    const nextUrl = window.prompt('Background image URL', imageUrl);
    if (nextUrl === null) return;
    const trimmed = nextUrl.trim();
    if (trimmed) {
      setImageUrl(trimmed);
    }
  };

  const promptForIframeUrl = () => {
    const nextUrl = window.prompt('Visual-only HTML background iframe URL', iframeUrl);
    if (nextUrl === null) return;
    const trimmed = nextUrl.trim();
    if (trimmed) {
      setIframeUrl(trimmed);
    }
  };

  const postBackgroundPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (backgroundType !== 'iframe') return;
    const frame = backgroundFrameRef.current;
    if (!frame?.contentWindow) return;
    const rect = e.currentTarget.getBoundingClientRect();
    frame.contentWindow.postMessage(
      {
        type: 'nova64-desktop-pointer',
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
      },
      '*'
    );
  };

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
      {
        label: 'Desktop Background',
        icon: '🎨',
        submenu: [
          ...BACKGROUND_PRESETS.map((preset) => ({
            label: preset.name,
            icon: backgroundType === 'preset' && presetId === preset.id ? '✓' : '',
            onClick: () => setPreset(preset.id),
          })),
          { type: 'separator' as const, label: '' },
          {
            label: 'Use Image URL...',
            icon: backgroundType === 'url' ? '✓' : '🌐',
            onClick: promptForBackgroundUrl,
          },
          { type: 'separator' as const, label: '' },
          {
            label: 'HTML backgrounds are visual only',
            disabled: true,
          },
          ...HTML_BACKGROUND_EXAMPLES.map((example) => ({
            label: example.name,
            icon: backgroundType === 'iframe' && iframeUrl === example.url ? '✓' : '🪟',
            onClick: () => setIframeUrl(example.url),
          })),
          {
            label: 'Use Visual HTML URL...',
            icon: backgroundType === 'iframe' ? '✓' : '🌐',
            onClick: promptForIframeUrl,
          },
        ],
      },
      { label: 'Change Desktop Background...', icon: '⚙️', onClick: () => novaContext.launchApp('appearance') },
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
    <div
      className="desktop"
      data-background-type={backgroundType}
      style={{ background: backgroundType === 'iframe' ? '#07192f' : getBackgroundStyle() }}
      onClick={handleDesktopClick}
      onMouseMove={postBackgroundPointer}
      onContextMenu={handleDesktopContextMenu}
    >
      {backgroundType === 'iframe' && (
        <iframe
          ref={backgroundFrameRef}
          className="desktop-background-frame"
          src={getIframeUrl()}
          title="Visual-only desktop HTML background"
          sandbox="allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
        />
      )}
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
