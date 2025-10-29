import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { novaContext } from './os/context';

// Import demo apps
import './apps/notes';
import './apps/paint';
import './apps/profiler';

// Import new game development apps
import './apps/game-launcher-app';
import './apps/game-studio-app';
import './apps/docs-app';

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

// Export context for external use
export { novaContext };
