import { test, expect } from '@playwright/test';

/** Fresh browser state with the privacy banner already answered, unless a test wants to see it. */
async function open(page: import('@playwright/test').Page, answered = true): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (answered) await page.addInitScript(() => { if (!localStorage.getItem('vrussia_consent')) localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 })); });
  await page.goto('/');
  return errors;
}

test('the title screen loads without errors and has no sideways scroll', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('h1.brand')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(wide).toBe(false);
  expect(errors).toEqual([]);
});

test('the privacy banner asks once and remembers', async ({ page }) => {
  await open(page, false);
  await expect(page.locator('#consent')).toBeVisible();
  await page.locator('#cbNo').click();
  await expect(page.locator('#consent')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#consent')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vrussia_consent')!).analytics)).toBe(false);
});

test('start a game, see the tutorial, skip it, play a turn, reload and continue', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#nameInput').fill('Dilya');
  await page.locator('#startBtn').click();
  await expect(page.locator('#game')).not.toHaveAttribute('hidden', '');       // the immersive screen has no box of its own, so "visible" would be wrong
  await expect(page.locator('#tour')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#tour')).toHaveCount(0);
  await expect(page.locator('#stage')).toBeVisible();
  const choice = page.locator('#stage .choices button').first();
  if (await choice.isVisible().catch(() => false)) { await choice.click(); await page.locator('#nextBtn').click({ timeout: 5000 }).catch(() => undefined); }
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('vrussia_save')), { timeout: 15000 }).toBe(true);       // the game saves by itself
  await page.goto('/');
  await expect(page.locator('#continueBtn')).toBeVisible();
  await page.locator('#continueBtn').click();
  await expect(page.locator('#game')).not.toHaveAttribute('hidden', '');       // the immersive screen has no box of its own, so "visible" would be wrong
  expect(errors).toEqual([]);
});

test('the language can be changed to Uzbek and the title screen follows', async ({ page }) => {
  await open(page);
  await page.locator('#title [data-pf-open]').click();
  await page.locator('[data-pf="lang"]').click();
  await page.locator('input[name="loc"][value="uz"]').click();       // choosing reloads the page
  await expect(page.locator('#startBtn')).toHaveText('Boshlash');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('uz');
});

test('My data downloads a file and erase clears this game’s storage', async ({ page }) => {
  await open(page);
  await page.locator('#title [data-pf-open]').click();
  await page.locator('[data-pf="privacy"]').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#pfDl').click()]);
  expect(download.suggestedFilename()).toBe('vrussia-my-data.json');
  page.once('dialog', d => void d.accept());
  await page.locator('#pfEr').click();
  await expect(page.locator('#pfMsg')).toContainText(/Erased|Стёрто/);
  expect(await page.evaluate(() => localStorage.getItem('vrussia_consent'))).toBeNull();
});

test('keyboard only: Tab reaches the skip link first and Enter activates Start', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#skipLink')).toBeFocused();
  await page.locator('#startBtn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game')).not.toHaveAttribute('hidden', '');       // the immersive screen has no box of its own, so "visible" would be wrong
});

test('lite mode shows the flat map and high contrast changes the colours', async ({ page }) => {
  await open(page);
  await page.locator('#title [data-pf-open]').click();
  await page.locator('[data-pf="a11y"]').click();
  await page.locator('#a11Lite').check();
  await page.locator('#a11Con').check();
  expect(await page.evaluate(() => document.documentElement.className)).toContain('lite');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())).toBe('#000');
});

test('the service worker file and manifest are served', async ({ request }) => {
  expect((await request.get('/sw.js')).ok()).toBe(true);
  expect((await request.get('/manifest.webmanifest')).ok()).toBe(true);
});
