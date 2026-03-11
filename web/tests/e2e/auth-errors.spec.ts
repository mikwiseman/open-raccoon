import { expect, test } from '@playwright/test';

test('auth verify token renders readable backend error', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Verify Token' }).click();
  await page.getByLabel('Magic Link Token').fill('invalid-token');
  await page.locator("form.panel-form button[type='submit']").click();

  const errorBanner = page.locator('.error-banner');
  await expect(errorBanner).toBeVisible();
  await expect(errorBanner).not.toContainText('[object Object]');
  await expect(errorBanner).toContainText('Token is invalid or expired');
});

test('magic link URL route renders verification page (not 404)', async ({ page }) => {
  await page.goto('/auth/magic-link/verify?token=invalid-token');

  await expect(page.getByRole('heading', { name: 'Magic Link Verification' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('404');
  await expect(page.locator('.error-banner')).toContainText(
    /Token is invalid or expired|Rate limit exceeded/,
  );
});
