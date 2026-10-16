import { defineConfig } from 'vitest/config';
// only the TypeScript tests (not compiled copies in dist/); one file at a time keeps memory low (each file has its own database)
export default defineConfig({ test: { include: ['test/**/*.test.ts'], testTimeout: 20_000, hookTimeout: 120_000 } });
