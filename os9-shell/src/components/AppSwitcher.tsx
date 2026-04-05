import { useState, useEffect, useCallback } from 'react';
import { useAppStore, useWindowStore } from '../os/stores';
import { UISounds } from '../os/sounds';

// ============================================================================
// App Switcher — Cmd+Tab overlay to switch between running apps
// ============================================================================

interface AppSwitcherEntry {
  appId: string;
  name: string;
  icon: string;
}

export function AppSwitcher() {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<AppSwitcherEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const buildEntries = useCallback(() => {
    const { apps, runningApps } = useAppStore.getState();
    const result: AppSwitcherEntry[] = [];
    
    // Always include Finder as the desktop
    result.push({ appId: '_finder', name: 'Finder', icon: '📂' });
    
    // Add running apps
    runningApps.forEach((appId) => {
      const app = apps.get(appId);
      if (app) {
        result.push({ appId, name: app.name, icon: app.icon });
      }
    });
    
    return result;
  }, []);

  const switchToApp = useCallback(
    (entry: AppSwitcherEntry) => {
      if (entry.appId === '_finder') {
        // Focus the desktop — deselect all windows
        const { windows } = useWindowStore.getState();
        // Just bring focus away by not focusing any window
        if (windows.length > 0) {
          // Blur effect — no specific action needed
        }
      } else {
        // Find windows belonging to this app and focus the topmost one
        const { windows } = useWindowStore.getState();
        const appWindows = windows
          .filter((w) => w.appId === entry.appId)
          .sort((a, b) => b.zIndex - a.zIndex);
        if (appWindows.length > 0) {
          useWindowStore.getState().focusWindow(appWindows[0].id);
        }
        useAppStore.getState().setForeground(entry.appId);
      }
    },
    []
  );

  useEffect(() => {
    let tabHeld = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Tab (Mac) or Ctrl+Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();

        if (!visible) {
          // Open switcher
          const newEntries = buildEntries();
          if (newEntries.length <= 1) return; // Nothing to switch to
          
          UISounds.appSwitch();
          setEntries(newEntries);
          setSelectedIndex(1); // Start on second item (first non-Finder app, or wrap)
          setVisible(true);
          tabHeld = true;
        } else {
          // Cycle through entries
          setSelectedIndex((prev) => {
            const next = e.shiftKey
              ? (prev - 1 + entries.length) % entries.length
              : (prev + 1) % entries.length;
            UISounds.select();
            return next;
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // When Meta/Ctrl is released, commit the selection
      if (
        visible &&
        tabHeld &&
        (e.key === 'Meta' || e.key === 'Control')
      ) {
        tabHeld = false;
        setVisible(false);
        const entry = entries[selectedIndex];
        if (entry) {
          switchToApp(entry);
        }
      }
      // Escape to cancel
      if (visible && e.key === 'Escape') {
        tabHeld = false;
        setVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [visible, entries, selectedIndex, buildEntries, switchToApp]);

  if (!visible || entries.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25000,
        animation: 'overlayFadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: 20,
          background: 'var(--gnome-panel)',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          border: '1px solid var(--gnome-border)',
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={entry.appId}
            onClick={() => {
              UISounds.click();
              setVisible(false);
              switchToApp(entry);
            }}
            style={{
              width: 96,
              textAlign: 'center',
              padding: 12,
              borderRadius: 12,
              cursor: 'pointer',
              background:
                i === selectedIndex
                  ? 'rgba(53,132,228,0.35)'
                  : 'transparent',
              border:
                i === selectedIndex
                  ? '2px solid var(--gnome-blue)'
                  : '2px solid transparent',
              transition: 'all 0.1s ease',
            }}
          >
            <div
              style={{
                fontSize: 48,
                lineHeight: 1,
                marginBottom: 8,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
              }}
            >
              {entry.icon}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--gnome-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: i === selectedIndex ? 600 : 400,
              }}
            >
              {entry.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
