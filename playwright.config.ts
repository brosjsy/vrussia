/* End-to-end tests in a real browser, against the production build served by `vite preview`.
   Locally:  npm run build && npm run e2e   (set PW_CHANNEL=chrome or msedge to use the browser already installed)
   In CI:    npx playwright install --with-deps chromium  first. The bot playthroughs (npm run balance) test the rules; these test the page. */
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PW_PORT || 4173);
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,                       // the 3D world is heavy: two games at once made the slow ones time out
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'phone', use: { ...devices['Pixel 5'], channel } },
  ],
});
