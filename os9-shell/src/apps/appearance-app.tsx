// Appearance — desktop theme switcher (Glass Dark / Glass Light)
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Nova64App } from '../types';
import {
  BACKGROUND_PRESETS,
  HTML_BACKGROUND_EXAMPLES,
  useDesktopBackgroundStore,
  useDesktopThemeStore,
} from '../os/stores';
import { novaContext } from '../os/context';

// ─── Component ────────────────────────────────────────────────────────────────

function AppearancePanel() {
  const { theme, setTheme } = useDesktopThemeStore();
  const {
    backgroundType,
    presetId,
    solidColor,
    imageUrl,
    iframeUrl,
    setPreset,
    setSolidColor,
    setImageUrl,
    setIframeUrl,
    getBackgroundStyle,
    getIframeUrl,
  } = useDesktopBackgroundStore();
  const [urlDraft, setUrlDraft] = useState(imageUrl);
  const [iframeDraft, setIframeDraft] = useState(iframeUrl);

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
          Choose the desktop theme and background. Your selection is persisted automatically.
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

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--gnome-text)' }}>
            Desktop Background
          </h3>
          <p style={{ fontSize: 12, color: 'var(--gnome-text-secondary)', lineHeight: 1.5 }}>
            Pick a built-in wallpaper, a solid color, an image URL, or a visual-only HTML iframe.
          </p>
        </div>

        <div
          style={{
            height: 118,
            borderRadius: 12,
            border: '1px solid var(--gnome-border)',
            background: backgroundType === 'iframe' ? '#07192f' : getBackgroundStyle(),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 12px 30px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {backgroundType === 'iframe' && (
            <iframe
              title="HTML background preview"
              src={getIframeUrl()}
              sandbox="allow-same-origin allow-scripts"
              referrerPolicy="no-referrer"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                pointerEvents: 'none',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.16), transparent 38%, rgba(0,0,0,0.18))',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
            gap: 10,
          }}
        >
          {BACKGROUND_PRESETS.map((preset) => {
            const active = backgroundType === 'preset' && presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreset(preset.id)}
                style={{
                  minHeight: 78,
                  borderRadius: 10,
                  border: active ? '2px solid var(--gnome-blue-light)' : '1px solid var(--gnome-border)',
                  background: preset.thumbnail || preset.value,
                  cursor: 'pointer',
                  color: '#fff',
                  padding: 10,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  boxShadow: active
                    ? '0 0 0 3px rgba(120,174,237,0.25), 0 8px 18px rgba(0,0,0,0.26)'
                    : '0 5px 14px rgba(0,0,0,0.18)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                  transition: 'transform 0.16s ease, border 0.16s ease, box-shadow 0.16s ease',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>{preset.name}</span>
                {active && <span style={{ fontSize: 14, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
            gap: 10,
          }}
        >
          {HTML_BACKGROUND_EXAMPLES.map((example) => {
            const active = backgroundType === 'iframe' && iframeUrl === example.url;
            return (
              <button
                key={example.id}
                type="button"
                onClick={() => {
                  setIframeDraft(example.url);
                  setIframeUrl(example.url);
                }}
                style={{
                  minHeight: 70,
                  borderRadius: 10,
                  border: active ? '2px solid var(--gnome-blue-light)' : '1px solid var(--gnome-border)',
                  background: example.thumbnail,
                  cursor: 'pointer',
                  color: '#fff',
                  padding: 10,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  boxShadow: active
                    ? '0 0 0 3px rgba(120,174,237,0.25), 0 8px 18px rgba(0,0,0,0.26)'
                    : '0 5px 14px rgba(0,0,0,0.18)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>{example.name}</span>
                {active && <span style={{ fontSize: 14, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--gnome-text-secondary)' }} htmlFor="desktop-color">
            Solid color
          </label>
          <input
            id="desktop-color"
            type="color"
            value={solidColor}
            onChange={(event) => setSolidColor(event.currentTarget.value)}
            style={{
              width: '100%',
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: 'var(--gnome-card)',
              padding: 3,
            }}
          />
          <button
            type="button"
            onClick={() => setSolidColor(solidColor)}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: backgroundType === 'color' ? 'var(--gnome-blue)' : 'var(--gnome-card)',
              color: 'var(--gnome-text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Apply
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--gnome-text-secondary)' }} htmlFor="desktop-url">
            Image URL
          </label>
          <input
            id="desktop-url"
            type="url"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.currentTarget.value)}
            placeholder="https://example.com/wallpaper.jpg"
            style={{
              minWidth: 0,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: 'var(--gnome-card)',
              color: 'var(--gnome-text)',
              padding: '0 10px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = urlDraft.trim();
              if (trimmed) setImageUrl(trimmed);
            }}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: backgroundType === 'url' ? 'var(--gnome-blue)' : 'var(--gnome-card)',
              color: 'var(--gnome-text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Use URL
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--gnome-text-secondary)' }} htmlFor="desktop-iframe">
            Visual HTML URL
          </label>
          <input
            id="desktop-iframe"
            type="url"
            value={iframeDraft}
            onChange={(event) => setIframeDraft(event.currentTarget.value)}
            placeholder="https://example.com/ambient-background.html"
            style={{
              minWidth: 0,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: 'var(--gnome-card)',
              color: 'var(--gnome-text)',
              padding: '0 10px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = iframeDraft.trim();
              if (trimmed) setIframeUrl(trimmed);
            }}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--gnome-border)',
              background: backgroundType === 'iframe' ? 'var(--gnome-blue)' : 'var(--gnome-card)',
              color: 'var(--gnome-text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Use Visual
          </button>
        </div>
      </section>

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
        HTML backgrounds are visual only. They render behind desktop icons, cannot receive clicks,
        and may react only to passive desktop signals such as mouse location.
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
