import { useEffect, useState } from 'react';

function checkPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  // Prefer the Screen Orientation API (avoids soft-keyboard false-positives)
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('portrait');
  }
  return window.innerHeight > window.innerWidth;
}

export function LandscapePrompt() {
  const [portrait, setPortrait] = useState(() => checkPortrait());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => {
      const isPortrait = checkPortrait();
      setPortrait(isPortrait);
      // Re-show if they rotate back to portrait after dismissing
      if (isPortrait) setDismissed(false);
    };

    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener('change', update);
    // Fallback for browsers that don't fire the MQ event on resize
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!portrait || dismissed) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-10 text-center"
      style={{
        zIndex: 9000,
        background: 'rgba(3, 4, 18, 0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <style>{`
        @keyframes tiltPhone {
          0%,  35% { transform: rotate(0deg)   scale(1);    }
          55%       { transform: rotate(-90deg) scale(1.15); }
          80%, 100% { transform: rotate(-90deg) scale(1.15); }
        }
        @keyframes arrowPulse {
          0%, 100% { opacity: 0.25; transform: translateX(0); }
          50%      { opacity: 1;    transform: translateX(6px); }
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 12px rgba(124,140,255,0.4); }
          50%      { text-shadow: 0 0 28px rgba(124,140,255,0.9), 0 0 60px rgba(124,140,255,0.3); }
        }
      `}</style>

      {/* Animated phone → landscape */}
      <div className="flex items-center gap-4 mb-4">
        <span
          style={{
            fontSize: 64,
            lineHeight: 1,
            display: 'inline-block',
            animation: 'tiltPhone 3s ease-in-out infinite',
          }}
        >
          📱
        </span>
        <div className="flex flex-col gap-1">
          {[0, 0.18, 0.36].map((delay, i) => (
            <span
              key={i}
              style={{
                fontSize: 18,
                color: 'var(--glass-accent)',
                animation: `arrowPulse 1.2s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                display: 'inline-block',
              }}
            >
              →
            </span>
          ))}
        </div>
        <span style={{ fontSize: 40, lineHeight: 1, opacity: 0.6 }}>📺</span>
      </div>

      <h2
        className="text-2xl font-black uppercase tracking-widest mb-3"
        style={{
          color: 'var(--glass-accent)',
          animation: 'glow 2.5s ease-in-out infinite',
        }}
      >
        BETTER IN WIDESCREEN
      </h2>

      <p
        className="text-sm leading-relaxed mb-1"
        style={{ color: 'var(--glass-text)', maxWidth: 300 }}
      >
        Nova64 is a <strong>16:9 console experience</strong>.
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--glass-muted)', maxWidth: 300 }}
      >
        Rotate your device to landscape mode for the full view.
        Your phone is basically a tiny TV — act like it! 🎮
      </p>

      <button
        onClick={() => setDismissed(true)}
        className="mt-8 px-5 py-2 rounded-full text-xs font-medium transition-all duration-150 active:scale-95"
        style={{
          background: 'var(--glass-tile)',
          border: '1px solid var(--glass-border)',
          color: 'var(--glass-muted)',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        Continue in portrait anyway
      </button>
    </div>
  );
}
