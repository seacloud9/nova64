import { useState, useEffect, useRef } from 'react';
import type { MenuTemplate, MenuItem } from '../types';

interface MenuBarProps {
  appMenus?: MenuTemplate[];
  onCommand?: (commandId: string) => void;
}

export function MenuBar({ appMenus = [], onCommand }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
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
    setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.type === 'separator' || item.enabled === false) {
      return;
    }
    
    if (item.click) {
      item.click();
    } else if (item.id && onCommand) {
      onCommand(item.id);
    }
    
    setActiveMenu(null);
  };

  return (
    <div className="menubar" ref={menuRef}>
      <div className="menubar-left">
        {allMenus.map((menu, index) => (
          <div key={index}>
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
        <div className="menu-status-icon">📶</div>
        <div className="menu-status-icon">🔋</div>
        <div className="menu-time">{formatTime(time)}</div>
      </div>
    </div>
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
