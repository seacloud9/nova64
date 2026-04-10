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
        background: '#888888',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
    >
      {stage === 'splash' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🌟</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            {t('boot.welcome')}
          </div>
          <div style={{ fontSize: 14, color: '#333' }}>
            Version 1.0
          </div>
        </div>
      )}

      {stage === 'extensions' && (
        <div style={{ width: 600, textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 24, fontWeight: 'bold' }}>
            {t('boot.loading')}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 16,
              padding: 20,
              background: '#DDDDDD',
              border: '2px solid #000',
            }}
          >
            {EXTENSIONS.map((ext) => (
              <div
                key={ext.id}
                style={{
                  fontSize: 32,
                  opacity: loadedExtensions.includes(ext.id) ? 1 : 0.2,
                  transition: 'opacity 0.2s',
                }}
                title={ext.name}
              >
                {ext.icon}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
