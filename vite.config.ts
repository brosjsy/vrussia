import { defineConfig } from 'vitest/config';

// base './' makes the build work on GitHub Pages under /vrussia/ and when opened from any folder.
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  test: { include: ['test/**/*.test.ts'] },
});
