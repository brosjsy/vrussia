import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/cyrillic-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/cyrillic-800.css';
import './style.css';
import './theme-kit.css';
import { boot } from './ui';

boot();

// Offline support (only on a real https origin or localhost, and only in the production build)
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode is optional */ }); });
}
