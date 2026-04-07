import { useState, useEffect, useRef } from 'react';
import type { MenuTemplate, MenuItem } from '../types';
import { ApplicationLauncher } from './ApplicationLauncher';
import { novaContext } from '../os/context';
import { UISounds } from '../os/sounds';

interface MenuBarProps {
  appMenus?: MenuTemplate[];
  onCommand?: (commandId: string) => void;
}

export function MenuBar({ appMenus = [], onCommand }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [time, setTime] = useState(new Date());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [activeMenu]);

  const novaMenu: MenuTemplate = {
    label: '🌟',
    submenu: [
      { label: 'About nova64 OS', role: 'about' },
      { type: 'separator', label: '' },
      { label: 'System Profiler...' },
      { label: 'Control Panels', type: 'submenu', submenu: [
        { label: 'Appearance' },
        { label: 'Sound' },
        { label: 'Displays' },
      ]},
      { type: 'separator', label: '' },
      { label: 'Recent Items', type: 'submenu', submenu: [
        { label: 'Applications', type: 'separator' },
        { label: 'Clear Menu', enabled: false },
      ]},
      { type: 'separator', label: '' },
      { label: 'Restart...' },
      { label: 'Shut Down...' },
    ],
  };

  const finderMenus: MenuTemplate[] = [
    {
      label: 'Applications',
      submenu: [
        { label: '🃏 hyperNova', id: 'hypernova', click: () => novaContext.launchApp('hypernova') },
        { type: 'separator', label: '' },
        { label: 'Sprite Editor', id: 'sprite-editor', click: () => novaContext.launchApp('sprite-editor') },
        { label: 'Game Studio', id: 'studio', click: () => novaContext.launchApp('studio') },
        { label: 'Game Launcher', id: 'game-launcher', click: () => novaContext.launchApp('game-launcher') },
        { type: 'separator', label: '' },
        { label: 'Games ▸', type: 'submenu', submenu: [
          { label: '👋 Hello 3D World', click: () => novaContext.launchApp('nova64-console', { path: '/examples/hello-3d/code.js', width: 900, height: 700 }) },
          { label: '🛸 Space Harrier', click: () => novaContext.launchApp('nova64-console', { path: '/examples/space-harrier-3d/code.js', width: 900, height: 700 }) },
          { label: '🏎️ F-ZERO Racing', click: () => novaContext.launchApp('nova64-console', { path: '/examples/f-zero-nova-3d/code.js', width: 900, height: 700 }) },
          { label: '🚀 Star Fox Nova', click: () => novaContext.launchApp('nova64-console', { path: '/examples/star-fox-nova-3d/code.js', width: 900, height: 700 }) },
          { label: '🌆 Cyberpunk City', click: () => novaContext.launchApp('nova64-console', { path: '/examples/cyberpunk-city-3d/code.js', width: 900, height: 700 }) },
          { label: '🏛️ Crystal Cathedral', click: () => novaContext.launchApp('nova64-console', { path: '/examples/crystal-cathedral-3d/code.js', width: 900, height: 700 }) },
          { label: '🧙 Mystical Realm', click: () => novaContext.launchApp('nova64-console', { path: '/examples/mystical-realm-3d/code.js', width: 900, height: 700 }) },
          { label: '⚔️ Knight Platformer', click: () => novaContext.launchApp('nova64-console', { path: '/examples/strider-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '🔫 FPS Demo', click: () => novaContext.launchApp('nova64-console', { path: '/examples/fps-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '⚛️ Physics Demo', click: () => novaContext.launchApp('nova64-console', { path: '/examples/physics-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '⛏️ Voxel Realm', click: () => novaContext.launchApp('nova64-console', { path: '/examples/minecraft-demo/code.js', width: 900, height: 700 }) },
          { label: '🗻 Voxel Terrain', click: () => novaContext.launchApp('nova64-console', { path: '/examples/voxel-terrain/code.js', width: 900, height: 700 }) },
          { label: '🏗️ Voxel Creative', click: () => novaContext.launchApp('nova64-console', { path: '/examples/voxel-creative/code.js', width: 900, height: 700 }) },
          { label: '🏰 Dungeon Crawler', click: () => novaContext.launchApp('nova64-console', { path: '/examples/dungeon-crawler-3d/code.js', width: 900, height: 700 }) },
          { label: '🧙 Wizardry', click: () => novaContext.launchApp('nova64-console', { path: '/examples/wizardry-3d/code.js', width: 900, height: 700 }) },
          { label: '🌿 Nature Explorer', click: () => novaContext.launchApp('nova64-console', { path: '/examples/nature-explorer-3d/code.js', width: 900, height: 700 }) },
          { label: '🍄 Super Plumber 64', click: () => novaContext.launchApp('nova64-console', { path: '/examples/super-plumber-64/code.js', width: 900, height: 700 }) },
          { label: '✨ Demoscene', click: () => novaContext.launchApp('nova64-console', { path: '/examples/demoscene/code.js', width: 900, height: 700 }) },
          { label: '🎯 Space Shooter', click: () => novaContext.launchApp('nova64-console', { path: '/examples/shooter-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '🎵 Audio Lab', click: () => novaContext.launchApp('nova64-console', { path: '/examples/audio-lab/code.js', width: 900, height: 700 }) },
          { label: '🚀 Wing Commander', click: () => novaContext.launchApp('nova64-console', { path: '/examples/wing-commander-space/code.js', width: 900, height: 700 }) },
        ]},
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Folder', accelerator: '⌘N' },
        { label: 'Open', accelerator: '⌘O' },
        { type: 'separator', label: '' },
        { label: 'Close Window', accelerator: '⌘W' },
        { label: 'Get Info', accelerator: '⌘I' },
        { label: 'Duplicate', accelerator: '⌘D' },
        { label: 'Make Alias', accelerator: '⌘L' },
        { type: 'separator', label: '' },
        { label: 'Put Away', accelerator: '⌘Y' },
        { type: 'separator', label: '' },
        { label: 'Find...', accelerator: '⌘F' },
        { type: 'separator', label: '' },
        { label: 'Empty Trash...' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: '⌘Z' },
        { type: 'separator', label: '' },
        { label: 'Cut', accelerator: '⌘X', role: 'cut' },
        { label: 'Copy', accelerator: '⌘C', role: 'copy' },
        { label: 'Paste', accelerator: '⌘V', role: 'paste' },
        { label: 'Clear' },
        { label: 'Select All', accelerator: '⌘A' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'as Icons', checked: true },
        { label: 'as List' },
        { label: 'as Columns' },
        { type: 'separator', label: '' },
        { label: 'Clean Up' },
        { label: 'Arrange', type: 'submenu', submenu: [
          { label: 'by Name' },
          { label: 'by Date Modified' },
          { label: 'by Size' },
          { label: 'by Kind' },
        ]},
      ],
    },
    {
      label: 'Special',
      submenu: [
        { label: 'Empty Trash...' },
        { label: 'Eject', accelerator: '⌘E', enabled: false },
        { type: 'separator', label: '' },
        { label: 'Sleep' },
        { label: 'Restart...' },
        { label: 'Shut Down...' },
      ],
    },
  ];

  const allMenus = [novaMenu, ...(appMenus.length > 0 ? appMenus : finderMenus)];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleMenuClick = (menuLabel: string) => {
    if (activeMenu === menuLabel) {
      setActiveMenu(null);
    } else {
      UISounds.menuOpen();
      setActiveMenu(menuLabel);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.type === 'separator' || item.enabled === false) {
      return;
    }
    
    UISounds.click();
    
    if (item.click) {
      item.click();
    } else if (item.id && onCommand) {
      onCommand(item.id);
    }
    
    setActiveMenu(null);
  };

  return (
    <>
      <div className="menubar" ref={menuRef}>
        <div className="menubar-left">
          <button 
            className="activities-button"
            onClick={() => setShowAppLauncher(true)}
          >
            ⚡ Activities
          </button>
          {allMenus.map((menu, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <div
                className={`menu-item ${activeMenu === menu.label ? 'active' : ''}`}
                onClick={() => handleMenuClick(menu.label)}
              >
                {menu.label}
              </div>
              {activeMenu === menu.label && (
                <div className="menu-dropdown">
                  {menu.submenu.map((item, itemIndex) => (
                    <MenuDropdownItem
                      key={itemIndex}
                      item={item}
                      onClick={() => handleMenuItemClick(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="menubar-right">
          <div className="menu-status-icon" title="Network">📶</div>
          <div className="menu-status-icon" title="Volume">�</div>
          <div className="menu-status-icon" title="Battery">�🔋</div>
          <div className="menu-time">{formatTime(time)}</div>
        </div>
      </div>
      
      {showAppLauncher && (
        <ApplicationLauncher onClose={() => setShowAppLauncher(false)} />
      )}
    </>
  );
}

interface MenuDropdownItemProps {
  item: MenuItem;
  onClick: () => void;
}

function MenuDropdownItem({ item, onClick }: MenuDropdownItemProps) {
  const [showSubmenu, setShowSubmenu] = useState(false);

  if (item.type === 'separator') {
    return <div className="menu-dropdown-item separator" />;
  }

  return (
    <div
      className={`menu-dropdown-item ${item.enabled === false ? 'disabled' : ''}`}
      onClick={item.enabled !== false ? onClick : undefined}
      onMouseEnter={() => item.submenu && setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      {item.checked && <span className="menu-checkmark">✓</span>}
      <span>{item.label}</span>
      {item.accelerator && <span className="menu-accelerator">{item.accelerator}</span>}
      {item.submenu && <span className="menu-arrow">▸</span>}
      
      {item.submenu && showSubmenu && (
        <div className="menu-dropdown" style={{ left: '100%', top: -4 }}>
          {item.submenu.map((subItem, subIndex) => (
            <MenuDropdownItem
              key={subIndex}
              item={subItem}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
