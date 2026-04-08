import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface StatusBarProps {
  onToggleGames: () => void;
  isGamesOpen: boolean;
}

export function StatusBar({ onToggleGames, isGamesOpen }: StatusBarProps) {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{
        background: 'var(--statusbar-bg)',
        borderBottom: '1px solid var(--statusbar-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'var(--glass-text)',
      }}
    >
      {/* Left — branding */}
      <div className="flex items-center gap-2">
        <span className="text-xl select-none">📺</span>
        <span
          className="font-bold text-sm tracking-widest uppercase"
          style={{ color: 'var(--glass-accent)' }}
        >
          Nova64
        </span>
      </div>

      {/* Right — games, clock, theme */}
      <div className="flex items-center gap-3">
        <span
          className="font-medium tabular-nums text-xs"
          style={{ color: 'var(--glass-muted)' }}
        >
          {time}
        </span>

        {/* Games hamburger */}
        <button
          onClick={onToggleGames}
          title="All Games"
          className="rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
          style={{
            width: 36,
            height: 36,
            background: isGamesOpen ? 'var(--glass-accent)' : 'var(--glass-tile)',
            border: `1px solid ${isGamesOpen ? 'var(--glass-accent)' : 'var(--glass-border)'}`,
            color: isGamesOpen ? '#fff' : 'var(--glass-text)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="All Games"
        >
          🎮
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
