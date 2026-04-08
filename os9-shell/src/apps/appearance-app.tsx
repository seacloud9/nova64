// Appearance — desktop theme switcher (Glass Dark / Glass Light)
import { createRoot } from 'react-dom/client';
import type { Nova64App } from '../types';
import { useDesktopThemeStore } from '../os/stores';
import { novaContext } from '../os/context';

// ─── Component ────────────────────────────────────────────────────────────────

function AppearancePanel() {
  const { theme, setTheme } = useDesktopThemeStore();

  const themes = [
    {
      id: 'dark' as const,
      label: 'Dark',
      icon: '🌙',
      desc: 'Smoky glass · deep space',
      wallpaper: 'linear-gradient(135deg, #050714 0%, #0d0d2b 50%, #130d2e 100%)',
      accent: '#7c8cff',
      winBg: 'rgba(14,14,28,0.88)',
      winBorder: 'rgba(255,255,255,0.12)',
      winBarBg: 'rgba(10,10,22,0.92)',
      winBarBorder: 'rgba(255,255,255,0.07)',
      lineHi: 'rgba(255,255,255,0.16)',
      lineLo: 'rgba(255,255,255,0.08)',
      textColor: 'rgba(255,255,255,0.92)',
    },
    {
      id: 'light' as const,
      label: 'Light',
      icon: '☀️',
      desc: 'Clear glass · daylight',
      wallpaper: 'linear-gradient(145deg, #e8f4fd 0%, #ddeeff 50%, #f0e8ff 100%)',
      accent: '#4c5ee8',
      winBg: 'rgba(255,255,255,0.55)',
      winBorder: 'rgba(100,120,200,0.22)',
      winBarBg: 'rgba(240,244,255,0.88)',
      winBarBorder: 'rgba(180,200,255,0.38)',
      lineHi: 'rgba(20,20,44,0.14)',
      lineLo: 'rgba(20,20,44,0.08)',
      textColor: 'rgba(16,16,44,0.92)',
    },
  ];

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--window-content-bg)',
        color: 'var(--gnome-text)',
        padding: 24,
        gap: 20,
        fontFamily: 'var(--font-system)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, letterSpacing: '0.02em', color: 'var(--gnome-text)' }}>
          Appearance
        </h2>
        <p style={{ fontSize: 12, color: 'var(--gnome-text-secondary)', lineHeight: 1.5 }}>
          Choose a Glass UI theme for nova64 OS. Your selection is persisted automatically.
        </p>
      </div>

      {/* Theme tiles */}
      <div style={{ display: 'flex', gap: 16 }}>
        {themes.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                flex: 1,
                padding: 0,
                borderRadius: 16,
                border: active ? `2px solid ${t.accent}` : '2px solid var(--gnome-border)',
                background: 'none',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: active
                  ? `0 0 0 4px ${t.accent}30, 0 8px 32px ${t.accent}22`
                  : '0 4px 16px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              {/* Wallpaper swatch */}
              <div
                style={{
                  height: 100,
                  background: t.wallpaper,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Mini glass window mock-up */}
                <div
                  style={{
                    width: 88,
                    height: 56,
                    borderRadius: 9,
                    background: t.winBg,
                    border: `1px solid ${t.winBorder}`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.35)`,
                    backdropFilter: 'blur(8px)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Title bar */}
                  <div
                    style={{
                      height: 17,
                      background: t.winBarBg,
                      borderBottom: `1px solid ${t.winBarBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 7px',
                    }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28ca42' }} />
                  </div>
                  {/* Content lines */}
                  <div style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 4, borderRadius: 2, background: t.lineHi, width: '75%' }} />
                    <div style={{ height: 4, borderRadius: 2, background: t.lineLo, width: '55%' }} />
                    <div style={{ height: 4, borderRadius: 2, background: t.lineLo, width: '65%' }} />
                  </div>
                </div>

                {/* Active check badge */}
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 9,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: t.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 700,
                      boxShadow: `0 0 10px ${t.accent}99`,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Label strip */}
              <div
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  background: t.winBarBg,
                  borderTop: `1px solid ${t.winBarBorder}`,
                  color: t.textColor,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{t.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info note */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--gnome-card)',
          border: '1px solid var(--gnome-border)',
          fontSize: 12,
          color: 'var(--gnome-text-secondary)',
          lineHeight: 1.6,
        }}
      >
        Both themes use the{' '}
        <strong style={{ color: 'var(--gnome-text)' }}>Glass UI</strong> design language —
        frosted‑glass window chrome, translucent surfaces, and matching accent colours across
        the desktop and mobile shell.
      </div>
    </div>
  );
}

// ─── Nova64App export ─────────────────────────────────────────────────────────

export const appearanceApp: Nova64App = {
  id: 'appearance',
  name: 'Appearance',
  icon: '🎨',

  mount(container) {
    const root = createRoot(container);
    root.render(<AppearancePanel />);
    (container as HTMLElement & { _novaRoot?: ReturnType<typeof createRoot> })._novaRoot = root;
  },

  unmount() {},

  getInfo() {
    return {
      name: 'Appearance',
      version: '1.0',
      description: 'Desktop theme switcher — Glass Dark / Glass Light',
      author: 'Nova64 OS',
      icon: '🎨',
    };
  },
};

novaContext.registerApp(appearanceApp);
