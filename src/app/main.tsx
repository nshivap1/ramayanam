import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.gen.css';

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');
createRoot(el).render(<App />);

// Offline support: the service worker is only present in production builds.
declare const __SW__: boolean;
if (__SW__ && 'serviceWorker' in navigator && !location.hash.includes('e2e=1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err: unknown) => console.warn('[samskuru] service worker registration failed', err));
  });
}
