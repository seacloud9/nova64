import type { TVApp } from '../types';

interface AppTileProps {
  app: TVApp;
  onLaunch: (appId: string) => void;
  tabIndex?: number;
}

export function AppTile({ app, onLaunch, tabIndex = 0 }: AppTileProps) {
  return (
    <button
      className="glass-tile rounded-2xl flex flex-col items-center justify-center gap-3 p-6 cursor-pointer w-full aspect-square"
      tabIndex={tabIndex}
      onClick={() => onLaunch(app.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLaunch(app.id);
        }
      }}
      type="button"
      aria-label={`Launch ${app.name}`}
    >
      {/* Icon */}
      <span
        className="select-none leading-none"
        style={{ fontSize: 52, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
      >
        {app.icon}
      </span>

      {/* Name */}
      <span
        className="font-semibold text-sm text-center leading-tight"
        style={{ color: 'var(--glass-text)' }}
      >
        {app.name}
      </span>

      {/* Category badge */}
      {app.category && (
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: 'var(--glass-accent-glow)',
            color: 'var(--glass-accent)',
            border: '1px solid var(--glass-accent-glow)',
          }}
        >
          {app.category}
        </span>
      )}
    </button>
  );
}
