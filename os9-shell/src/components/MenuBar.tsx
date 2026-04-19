import { useState, useEffect, useRef } from 'react';
import type { MenuTemplate, MenuItem } from '../types';
import { ApplicationLauncher } from './ApplicationLauncher';
import { novaContext } from '../os/context';
import { UISounds } from '../os/sounds';
import { useDesktopThemeStore } from '../os/stores';
import { useScreensaverStore } from '../os/screensaverStore';
import { screensaverHacks } from '../screensavers';
import { useI18n, type Lang } from '../i18n';

interface MenuBarProps {
  appMenus?: MenuTemplate[];
  onCommand?: (commandId: string) => void;
}

export function MenuBar({ appMenus = [], onCommand }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [time, setTime] = useState(new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme: desktopTheme, toggle: toggleTheme } = useDesktopThemeStore();
  const { lang, setLang, t } = useI18n();

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
      { label: t('menu.about'), click: () => setShowAbout(true) },
      { type: 'separator', label: '' },
      { label: t('menu.appearance'), click: () => novaContext.launchApp('appearance', { width: 480, height: 340 }) },
      { type: 'separator', label: '' },
      { label: t('menu.profiler'), click: () => novaContext.launchApp('com.nova64.profiler') },
      { type: 'separator', label: '' },
      { label: t('menu.restart') },
      { label: t('menu.shutdown') },
    ],
  };

  const finderMenus: MenuTemplate[] = [
    {
      label: t('menu.apps'),
      submenu: [
        { label: '🃏 hyperNova', id: 'hypernova', click: () => novaContext.launchApp('hypernova') },
        { type: 'separator', label: '' },
        { label: 'Sprite Editor', id: 'sprite-editor', click: () => novaContext.launchApp('sprite-editor') },
        { label: 'Game Studio', id: 'studio', click: () => novaContext.launchApp('studio') },
        { label: 'Game Launcher', id: 'game-launcher', click: () => novaContext.launchApp('game-launcher') },
        { label: '🕹️ eMU', id: 'emu', click: () => novaContext.launchApp('emu') },
        { type: 'separator', label: '' },
        { label: t('menu.games'), type: 'submenu', submenu: [
          { label: '⭐ Hello World', click: () => novaContext.launchApp('cart-runner', { path: '/examples/hello-world/code.js', width: 900, height: 700 }) },
          { label: '👋 Hello 3D World', click: () => novaContext.launchApp('cart-runner', { path: '/examples/hello-3d/code.js', width: 900, height: 700 }) },
          { label: '🛸 Space Harrier', click: () => novaContext.launchApp('cart-runner', { path: '/examples/space-harrier-3d/code.js', width: 900, height: 700 }) },
          { label: '🏎️ F-ZERO Racing', click: () => novaContext.launchApp('cart-runner', { path: '/examples/f-zero-nova-3d/code.js', width: 900, height: 700 }) },
          { label: '🚀 Star Fox Nova', click: () => novaContext.launchApp('cart-runner', { path: '/examples/star-fox-nova-3d/code.js', width: 900, height: 700 }) },
          { label: '🌆 Cyberpunk City', click: () => novaContext.launchApp('cart-runner', { path: '/examples/cyberpunk-city-3d/code.js', width: 900, height: 700 }) },
          { label: '🏛️ Crystal Cathedral', click: () => novaContext.launchApp('cart-runner', { path: '/examples/crystal-cathedral-3d/code.js', width: 900, height: 700 }) },
          { label: '🏰 Mystical Realm', click: () => novaContext.launchApp('cart-runner', { path: '/examples/mystical-realm-3d/code.js', width: 900, height: 700 }) },
          { label: '🔫 FPS Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/fps-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '💀 FreeDoom WAD', click: () => novaContext.launchApp('cart-runner', { path: '/examples/wad-demo/code.js', width: 900, height: 700 }) },
          { label: '🕵️ The Verdict', click: () => novaContext.launchApp('cart-runner', { path: '/examples/adventure-comic-3d/code.js', width: 900, height: 700 }) },
          { label: '⚛️ Physics Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/physics-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '🎯 Space Shooter', click: () => novaContext.launchApp('cart-runner', { path: '/examples/shooter-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '⚔️ Gauntlet 64', click: () => novaContext.launchApp('cart-runner', { path: '/examples/strider-demo-3d/code.js', width: 900, height: 700 }) },
          { label: '🍄 Super Plumber 64', click: () => novaContext.launchApp('cart-runner', { path: '/examples/super-plumber-64/code.js', width: 900, height: 700 }) },
          { label: '⛏️ Voxel Realm', click: () => novaContext.launchApp('cart-runner', { path: '/examples/minecraft-demo/code.js', width: 900, height: 700 }) },
          { label: '🌍 Voxel Terrain', click: () => novaContext.launchApp('cart-runner', { path: '/examples/voxel-terrain/code.js', width: 900, height: 700 }) },
          { label: '🏗️ Voxel Creative', click: () => novaContext.launchApp('cart-runner', { path: '/examples/voxel-creative/code.js', width: 900, height: 700 }) },
          { label: '🐄 Voxel Creatures', click: () => novaContext.launchApp('cart-runner', { path: '/examples/voxel-creatures/code.js', width: 900, height: 700 }) },
          { label: '🏰 Dungeon Crawler', click: () => novaContext.launchApp('cart-runner', { path: '/examples/dungeon-crawler-3d/code.js', width: 900, height: 700 }) },
          { label: '🧙 Wizardry', click: () => novaContext.launchApp('cart-runner', { path: '/examples/wizardry-3d/code.js', width: 900, height: 700 }) },
          { label: '🐦 Boids Flocking', click: () => novaContext.launchApp('cart-runner', { path: '/examples/boids-flocking/code.js', width: 900, height: 700 }) },
          { label: '🧬 Game of Life 3D', click: () => novaContext.launchApp('cart-runner', { path: '/examples/game-of-life-3d/code.js', width: 900, height: 700 }) },
          { label: '🌿 Nature Explorer', click: () => novaContext.launchApp('cart-runner', { path: '/examples/nature-explorer-3d/code.js', width: 900, height: 700 }) },
          { label: '🎨 Generative Art', click: () => novaContext.launchApp('cart-runner', { path: '/examples/generative-art/code.js', width: 900, height: 700 }) },
          { label: '✨ TSL Showcase', click: () => novaContext.launchApp('cart-runner', { path: '/examples/tsl-showcase/code.js', width: 900, height: 700 }) },
          { label: '🎯 Advanced 3D', click: () => novaContext.launchApp('cart-runner', { path: '/examples/3d-advanced/code.js', width: 900, height: 700 }) },
          { label: '🦊 Animated Models', click: () => novaContext.launchApp('cart-runner', { path: '/examples/model-viewer-3d/code.js', width: 900, height: 700 }) },
          { label: '🎬 Demoscene Tron', click: () => novaContext.launchApp('cart-runner', { path: '/examples/demoscene/code.js', width: 900, height: 700 }) },
          { label: '🌌 Nova Drift', click: () => novaContext.launchApp('cart-runner', { path: '/examples/hello-skybox/code.js', width: 900, height: 700 }) },
          { label: '🛸 Space Combat', click: () => novaContext.launchApp('cart-runner', { path: '/examples/space-combat-3d/code.js', width: 900, height: 700 }) },
          { label: '🎮 Input Showcase', click: () => novaContext.launchApp('cart-runner', { path: '/examples/input-showcase/code.js', width: 900, height: 700 }) },
          { label: '🎵 Audio Lab', click: () => novaContext.launchApp('cart-runner', { path: '/examples/audio-lab/code.js', width: 900, height: 700 }) },
          { label: '💾 Storage Quest', click: () => novaContext.launchApp('cart-runner', { path: '/examples/storage-quest/code.js', width: 900, height: 700 }) },
          { label: '⚡ Instancing Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/instancing-demo/code.js', width: 900, height: 700 }) },
          { label: '✨ Particles Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/particles-demo/code.js', width: 900, height: 700 }) },
          { label: '🖥️ Screen Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/screen-demo/code.js', width: 900, height: 700 }) },
          { label: '🎨 UI Demo', click: () => novaContext.launchApp('cart-runner', { path: '/examples/ui-demo/code.js', width: 900, height: 700 }) },
          { label: '🚀 Wing Commander', click: () => novaContext.launchApp('cart-runner', { path: '/examples/wing-commander-space/code.js', width: 900, height: 700 }) },
          { label: '🔮 PBR Showcase', click: () => novaContext.launchApp('cart-runner', { path: '/examples/pbr-showcase/code.js', width: 900, height: 700 }) },
          { label: '🌌 Skybox Showcase', click: () => novaContext.launchApp('cart-runner', { path: '/examples/skybox-showcase/code.js', width: 900, height: 700 }) },
          { label: '🌐 NFT Worlds', click: () => novaContext.launchApp('cart-runner', { path: '/examples/nft-worlds/code.js', width: 900, height: 700 }) },
          { label: '🎲 NFT Art Generator', click: () => novaContext.launchApp('cart-runner', { path: '/examples/nft-art-generator/code.js', width: 900, height: 700 }) },
          { label: '🎭 Creative Coding', click: () => novaContext.launchApp('cart-runner', { path: '/examples/creative-coding/code.js', width: 900, height: 700 }) },
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
        { label: 'Start Screensaver', click: () => useScreensaverStore.getState().activate() },
        { label: 'Screensaver', submenu: screensaverHacks.map(h => ({
          label: h.name,
          click: () => {
            const store = useScreensaverStore.getState();
            store.setHack(h.id);
            store.activate();
          },
        }))},
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
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={t('lang.label')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: 3,
              color: 'inherit',
              fontSize: 11,
              fontFamily: 'inherit',
              padding: '2px 4px',
              cursor: 'pointer',
            }}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="ja">JA</option>
          </select>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={desktopTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle theme"
          >
            {desktopTheme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="menu-time">{formatTime(time)}</div>
        </div>
      </div>
      
      {showAppLauncher && (
        <ApplicationLauncher onClose={() => setShowAppLauncher(false)} />
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
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
      onClick={item.enabled !== false && !item.submenu ? onClick : undefined}
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
              onClick={() => {
                if (subItem.click) subItem.click();
                onClick();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── About Modal ─────────────────────────────────────────────────────────────

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 20000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'menuSlideIn 0.18s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.10)',
          background: 'var(--window-content-bg)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid var(--window-border)',
          fontFamily: 'var(--font-system)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Splash gradient header */}
        <div
          style={{
            height: 160,
            background: 'var(--desktop-bg)',
            backgroundImage: 'var(--desktop-pattern)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated glow orb */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 60%, rgba(124,140,255,0.35) 0%, transparent 65%)',
            animation: 'particleFloat 6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 52, filter: 'drop-shadow(0 0 18px rgba(124,140,255,0.7))', lineHeight: 1 }}>🌟</div>
          <div style={{
            fontSize: 22, fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.06em',
            textShadow: '0 2px 20px rgba(124,140,255,0.8)',
          }}>
            nova64 OS
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
            Ultimate 3D Fantasy Console OS
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 24px', color: 'var(--gnome-text)' }}>
          {/* Version row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: 14, borderBottom: '1px solid var(--gnome-border)', marginBottom: 14,
          }}>
            <span style={{ fontSize: 12, color: 'var(--gnome-text-secondary)' }}>Version</span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: 'var(--gnome-card)',
              border: '1px solid var(--gnome-border)',
              color: 'var(--glass-accent)',
            }}>1.0.0 — Glass Edition</span>
          </div>

          {/* Credits */}
          <div style={{ fontSize: 11, color: 'var(--gnome-text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gnome-text)', marginBottom: 6, letterSpacing: '0.05em' }}>
              DEVELOPED BY
            </div>
            {[
              { name: 'Brendon Smith', role: 'Creator & Lead Developer' },
              { name: 'GitHub Copilot', role: 'AI Pair Programmer' },
            ].map((p) => (
              <div key={p.name} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '5px 10px', borderRadius: 8,
                background: 'var(--gnome-card)',
                marginBottom: 4,
                border: '1px solid var(--gnome-border)',
              }}>
                <span style={{ color: 'var(--gnome-text)', fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: 'var(--gnome-text-secondary)' }}>{p.role}</span>
              </div>
            ))}
          </div>

          {/* Tech badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {['Three.js', 'React 18', 'Vite', 'TypeScript', 'EmulatorJS'].map((t) => (
              <span key={t} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: 'var(--gnome-card)',
                border: '1px solid var(--gnome-border)',
                color: 'var(--gnome-text-secondary)',
              }}>{t}</span>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 10, border: 'none',
              background: 'var(--glass-accent)',
              color: '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px var(--glass-accent-glow)',
              letterSpacing: '0.04em',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
