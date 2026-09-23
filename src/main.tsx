import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely register PWA service worker with auto-update
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch((err) => {
        console.debug('PWA registration skipped or unsupported:', err);
      });
  }
} catch (e) {
  console.debug('Service Worker initialization note:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


