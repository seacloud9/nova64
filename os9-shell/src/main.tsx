import React from 'react';
import ReactDOM from 'react-dom/client';

function isMobileDevice(): boolean {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 900
  );
}

console.log('🌟 nova64 OS v1.0.0');

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isMobileDevice()) {
  // Mobile: load only the glass TV shell (separate chunk — excludes CodeMirror, GSAP, etc.)
  import('./mobile/MobileApp').then(({ MobileApp }) => {
    root.render(
      <React.StrictMode>
        <MobileApp />
      </React.StrictMode>
    );
  });
} else {
  // Desktop: load the full Mac OS 9 shell
  import('./DesktopApp').then(({ DesktopApp }) => {
    root.render(
      <React.StrictMode>
        <DesktopApp />
      </React.StrictMode>
    );
  });
}

// Export context for external use (desktop path exposes via DesktopApp)
export {};
