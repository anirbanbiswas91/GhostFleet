import { test, expect } from '@playwright/test';

test('Play vs AI smoke: assets load, arrange starts, and one shot fires', async ({ page }) => {
  const consoleFailures = [];
  const assetResponses = new Map();

  page.on('console', message => {
    if (message.type() === 'error') consoleFailures.push(message.text());
  });
  page.on('pageerror', error => {
    consoleFailures.push(error.message);
  });
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/shared/game.css') || url.includes('/shared/game.js')) {
      assetResponses.set(url.includes('/shared/game.css') ? 'css' : 'js', response.status());
    }
  });

  await page.goto('/play?mode=ai', { waitUntil: 'networkidle' });

  await expect(page.locator('#opponentOverlay')).toBeVisible();
  await expect(page.locator('#opponentAiStep')).toHaveClass(/show/);
  expect(assetResponses.get('css')).toBe(200);
  expect(assetResponses.get('js')).toBe(200);

  await page.locator('#aiDiffEasy').click();
  await page.locator('#aiConfirmBtn').click();

  await expect(page.locator('#opponentOverlay')).not.toBeVisible();
  await page.locator('#btnShuffle').click();
  await expect(page.locator('#btnStart')).toBeEnabled();
  await page.locator('#btnStart').evaluate(button => button.click());

  await expect(page.locator('#enemyContainer .cell.clickable').first()).toBeVisible();
  await page.locator('#enemyContainer .cell.clickable').first().click();
  await expect(page.locator('#moveLog')).toContainText(/YOU fired|YOU hit|YOU sunk/);

  expect(consoleFailures).toEqual([]);
});
