import { useToastStore } from '../os/stores';

export function Toasts() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center"
      style={{ zIndex: 300, pointerEvents: 'none' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in px-5 py-3 rounded-2xl text-sm font-medium"
          style={{
            background: 'var(--toast-bg)',
            border: '1px solid var(--toast-border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--glass-text)',
            boxShadow: 'var(--glass-shadow)',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
