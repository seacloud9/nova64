import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

export function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background: 'var(--statusbar-bg)',
        borderBottom: '1px solid var(--statusbar-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'var(--glass-text)',
      }}
    >
      {/* Left — branding */}
      <div className="flex items-center gap-3">
        <span className="text-2xl select-none">📺</span>
        <span className="font-bold text-base tracking-widest uppercase"
          style={{ color: 'var(--glass-accent)', letterSpacing: '0.15em' }}>
          eMobile OS
        </span>
      </div>

      {/* Right — clock + theme */}
      <div className="flex items-center gap-4">
        <span className="font-medium tabular-nums text-sm"
          style={{ color: 'var(--glass-muted)' }}>
          {time}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
