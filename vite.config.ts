import { defineConfig } from 'vitest/config';

// base './' makes the build work on GitHub Pages under /vrussia/ and when opened from any folder.
// the dev server (never the build) also lets the page talk to a game server on this computer over plain http,
// so texts and calls can be tried locally; the built page keeps https only
const localServer = {
  name: 'local-game-server',
  apply: 'serve' as const,
  transformIndexHtml: (html: string) => html.replace('connect-src \'self\' https:', 'connect-src \'self\' https: http://localhost:* http://127.0.0.1:*'),
};

export default defineConfig({
  base: './',
  plugins: [localServer],
  // the Kitchen's ingredients and steps are their own file, so the Kitchen screen stays under 40 KB
  // the map library is a separate download that is fetched only when the player opens the real map
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200, rollupOptions: { output: { manualChunks: id => (id.includes('maplibre-gl') ? 'maplibre' : id.includes('node_modules/three') ? 'three' : /src[\/]cook-data.ts$/.test(id) ? 'cook-data' : undefined) } } },
  test: { include: ['test/**/*.test.ts'], setupFiles: ['test/setup-i18n.ts'], env: { VITE_DEFAULT_LANG: 'en' } },
});
