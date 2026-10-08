import './style.css';
import { boot } from './ui';

boot();

// Offline support (only on a real https origin or localhost, and only in the production build)
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode is optional */ }); });
}
