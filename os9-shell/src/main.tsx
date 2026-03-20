import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { novaContext } from './os/context';
import { useAppStore } from './os/stores';

// Import demo apps
import './apps/notes';
import './apps/paint';
import './apps/profiler';

// Import new game development apps
import './apps/game-launcher-app';
import './apps/game-studio-app';
import './apps/docs-app';
import './apps/sprite-editor-app';
import './apps/demoscene-app';
import './apps/hypernova';

// Initialize the OS
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log startup info
console.log('🌟 nova64 OS v1.0.0');
console.log('API available at window.novaContext');
console.log('Type: novaContext to interact with the OS');

// Log registered apps after a brief delay to ensure all imports are processed
setTimeout(() => {
  const apps = useAppStore.getState().apps;
  console.log('📱 Total registered apps:', apps.size);
  console.log('📱 Registered app IDs:', Array.from(apps.keys()));
}, 100);

// Export context for external use
export { novaContext };
