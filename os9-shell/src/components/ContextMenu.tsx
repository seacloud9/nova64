import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Context Menu System
// ============================================================================

export interface ContextMenuItem {
  label: string;
  icon?: string;
  type?: 'normal' | 'separator';
  disabled?: boolean;
  onClick?: () => void;
  submenu?: ContextMenuItem[];
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

let globalSetMenu: ((state: ContextMenuState) => void) | null = null;

/**
 * Show a context menu at the given screen coordinates.
 */
export function showContextMenu(
  x: number,
  y: number,
  items: ContextMenuItem[]
) {
  if (globalSetMenu) {
    globalSetMenu({ visible: true, x, y, items });
  }
}

export function hideContextMenu() {
  if (globalSetMenu) {
    globalSetMenu({ visible: false, x: 0, y: 0, items: [] });
  }
}

/**
 * React component that renders the context menu overlay.
 * Mount this once in App.tsx.
 */
export function ContextMenuOverlay() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  useEffect(() => {
    globalSetMenu = setMenu;
    return () => {
      globalSetMenu = null;
    };
  }, []);

  const handleClickOutside = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  useEffect(() => {
    if (menu.visible) {
      const handler = (e: MouseEvent) => {
        // Close if click is outside menu
        const target = e.target as HTMLElement;
        if (!target.closest('.context-menu')) {
          handleClickOutside();
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [menu.visible, handleClickOutside]);

  // Escape key
  useEffect(() => {
    if (!menu.visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClickOutside();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menu.visible, handleClickOutside]);

  if (!menu.visible) return null;

  // Adjust position to stay on screen
  const menuWidth = 220;
  const menuHeight = menu.items.length * 32;
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(menu.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20000,
      }}
      onMouseDown={handleClickOutside}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ContextMenuPanel x={x} y={y} items={menu.items} onClose={handleClickOutside} />
    </div>
  );
}

function ContextMenuPanel({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="context-menu"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        minWidth: 200,
        background: 'var(--gnome-panel)',
        border: '1px solid var(--gnome-border)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        animation: 'menuSlideIn 0.12s ease-out',
        zIndex: 20001,
        padding: '4px 0',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <ContextMenuItemView key={i} item={item} onClose={onClose} />
      ))}
    </div>
  );
}

function ContextMenuItemView({
  item,
  onClose,
}: {
  item: ContextMenuItem;
  onClose: () => void;
}) {
  const [showSub, setShowSub] = useState(false);

  if (item.type === 'separator') {
    return (
      <div
        style={{
          height: 1,
          background: 'var(--gnome-border)',
          margin: '4px 12px',
        }}
      />
    );
  }

  const handleClick = () => {
    if (item.disabled || item.submenu) return;
    item.onClick?.();
    onClose();
  };

  return (
    <div
      style={{
        padding: '8px 16px',
        cursor: item.disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: item.disabled
          ? 'var(--gnome-text-disabled)'
          : 'var(--gnome-text)',
        background: 'transparent',
        transition: 'background 0.1s',
        position: 'relative',
        fontSize: 13,
      }}
      className="context-menu-item"
      onClick={handleClick}
      onMouseEnter={() => item.submenu && setShowSub(true)}
      onMouseLeave={() => item.submenu && setShowSub(false)}
    >
      {item.icon && (
        <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.submenu && (
        <span style={{ fontSize: 10, color: 'var(--gnome-text-disabled)' }}>
          ▸
        </span>
      )}
      {item.submenu && showSub && (
        <ContextMenuPanel
          x={200}
          y={-4}
          items={item.submenu}
          onClose={onClose}
        />
      )}
    </div>
  );
}
