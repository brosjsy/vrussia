import { defineConfig } from 'vitest/config';

// base './' makes the build work on GitHub Pages under /vrussia/ and when opened from any folder.
export default defineConfig({
  base: './',
  // the map library is a separate download that is fetched only when the player opens the real map
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200, rollupOptions: { output: { manualChunks: id => (id.includes('maplibre-gl') ? 'maplibre' : id.includes('node_modules/three') ? 'three' : undefined) } } },
  test: { include: ['test/**/*.test.ts'] },
});
