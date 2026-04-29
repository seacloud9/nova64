import { useEffect, useState } from 'react';
import type { ExtensionManifest } from '../types';
import { UISounds } from '../os/sounds';
import { useI18n } from '../i18n';

const EXTENSION_DURATION = 200;

const EXTENSION_KEYS: Array<{ id: string; key: string; version: string; icon: string; enabled: boolean }> = [
  { id: '1', key: 'boot.ext.graphics', version: '1.0', icon: '🎨', enabled: true },
  { id: '2', key: 'boot.ext.sound', version: '1.0', icon: '🔊', enabled: true },
  { id: '3', key: 'boot.ext.network', version: '1.0', icon: '🌐', enabled: true },
  { id: '4', key: 'boot.ext.memory', version: '1.0', icon: '💾', enabled: true },
  { id: '5', key: 'boot.ext.files', version: '1.0', icon: '📁', enabled: true },
  { id: '6', key: 'boot.ext.display', version: '1.0', icon: '🖥️', enabled: true },
];

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const { t } = useI18n();
  const EXTENSIONS: ExtensionManifest[] = EXTENSION_KEYS.map((k) => ({
    id: k.id,
    name: t(k.key),
    version: k.version,
    icon: k.icon,
    enabled: k.enabled,
  }));
  const [stage, setStage] = useState<'splash' | 'extensions' | 'complete'>('splash');
  const [loadedExtensions, setLoadedExtensions] = useState<string[]>([]);
  const bootProgress =
    stage === 'splash' ? 18 : Math.min(100, Math.round((loadedExtensions.length / EXTENSIONS.length) * 100));

  useEffect(() => {
    // Play startup chime
    UISounds.startup();
    
    // Splash screen
    const splashTimer = setTimeout(() => {
      setStage('extensions');
    }, 1500);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (stage === 'extensions') {
      // Load extensions one by one using index state
      EXTENSIONS.forEach((ext, index) => {
        setTimeout(() => {
          setLoadedExtensions((prev) => [...prev, ext.id]);
        }, index * EXTENSION_DURATION);
      });

      // Complete boot after all extensions loaded
      const completeTimer = setTimeout(() => {
        setStage('complete');
        onComplete();
      }, EXTENSIONS.length * EXTENSION_DURATION + 500);

      return () => {
        clearTimeout(completeTimer);
      };
    }
  }, [stage, onComplete]);

  if (stage === 'complete') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background:
          'url("/os9-shell/wallpapers/deep-blue-crystal.svg") center/cover no-repeat, linear-gradient(160deg, #061326 0%, #123a66 48%, #07192f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        color: '#eef9ff',
        fontFamily: 'var(--font-system)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 38%, rgba(130,220,255,0.2), transparent 34%), linear-gradient(180deg, rgba(2,10,24,0.08), rgba(1,5,14,0.48))',
          pointerEvents: 'none',
        }}
      />
      {stage === 'splash' && (
        <div
          style={{
            width: 'min(420px, calc(100vw - 48px))',
            textAlign: 'center',
            position: 'relative',
            padding: '34px 32px',
            borderRadius: 18,
            background: 'rgba(4,16,34,0.42)',
            border: '1px solid rgba(170,230,255,0.24)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.16)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 18, filter: 'drop-shadow(0 0 22px rgba(120,220,255,0.65))' }}>
            🌟
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: 0 }}>
            {t('boot.welcome')}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(238,249,255,0.68)', marginBottom: 24 }}>
            Version 1.0
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${bootProgress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #70d9ff, #d7fbff)',
                boxShadow: '0 0 20px rgba(112,217,255,0.72)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {stage === 'extensions' && (
        <div
          style={{
            width: 'min(620px, calc(100vw - 48px))',
            textAlign: 'center',
            position: 'relative',
            padding: 24,
            borderRadius: 18,
            background: 'rgba(4,16,34,0.48)',
            border: '1px solid rgba(170,230,255,0.22)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.14)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 16, marginBottom: 18, fontWeight: 800, letterSpacing: 0 }}>
            {t('boot.loading')}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 16,
              padding: 18,
              background: 'rgba(1,8,18,0.34)',
              border: '1px solid rgba(170,230,255,0.16)',
              borderRadius: 14,
            }}
          >
            {EXTENSIONS.map((ext) => (
              <div
                key={ext.id}
                style={{
                  fontSize: 32,
                  opacity: loadedExtensions.includes(ext.id) ? 1 : 0.2,
                  transform: loadedExtensions.includes(ext.id) ? 'translateY(-2px) scale(1)' : 'scale(0.92)',
                  filter: loadedExtensions.includes(ext.id)
                    ? 'drop-shadow(0 0 14px rgba(130,220,255,0.65))'
                    : 'grayscale(1)',
                  transition: 'opacity 0.2s, transform 0.2s, filter 0.2s',
                }}
                title={ext.name}
              >
                {ext.icon}
              </div>
            ))}
          </div>
          <div
            style={{
              height: 6,
              marginTop: 18,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${bootProgress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #70d9ff, #d7fbff)',
                boxShadow: '0 0 20px rgba(112,217,255,0.72)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
