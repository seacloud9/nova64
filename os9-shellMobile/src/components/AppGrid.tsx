import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../os/stores';
import { AppTile } from './AppTile';

interface AppGridProps {
  onLaunch: (appId: string) => void;
}

export function AppGrid({ onLaunch }: AppGridProps) {
  const apps = useAppStore((s) => Array.from(s.apps.values()));
  const gridRef = useRef<HTMLDivElement>(null);

  // D-pad navigation: arrow keys move focus between tiles
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gridRef.current) return;
    const focusable = Array.from(
      gridRef.current.querySelectorAll<HTMLElement>('button[tabindex]')
    );
    const idx = focusable.findIndex((el) => el === document.activeElement);
    if (idx === -1) return;

    // Get grid column count from computed style
    const cols = Math.round(
      gridRef.current.clientWidth /
        (focusable[0]?.parentElement
          ? focusable[0].parentElement.clientWidth
          : 200)
    ) || 1;

    let next = -1;
    if (e.key === 'ArrowRight') next = Math.min(idx + 1, focusable.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(idx - 1, 0);
    else if (e.key === 'ArrowDown') next = Math.min(idx + cols, focusable.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(idx - cols, 0);

    if (next !== -1 && next !== idx) {
      e.preventDefault();
      focusable[next].focus();
    }
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.addEventListener('keydown', handleKeyDown);
    return () => grid.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (apps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: 'var(--glass-muted)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-lg font-medium">No apps installed</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div
        ref={gridRef}
        className="grid gap-5"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        }}
      >
        {apps.map((app, i) => (
          <AppTile
            key={app.id}
            app={app}
            onLaunch={onLaunch}
            tabIndex={i === 0 ? 0 : -1}
          />
        ))}
      </div>
    </div>
  );
}
