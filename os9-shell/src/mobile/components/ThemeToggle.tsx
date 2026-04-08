import { useThemeStore } from '../os/stores';

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-full p-2 transition-all duration-200 active:scale-90"
      style={{
        background: 'var(--glass-tile)',
        border: '1px solid var(--glass-border)',
        color: 'var(--glass-text)',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontSize: 16,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌑'}
    </button>
  );
}
