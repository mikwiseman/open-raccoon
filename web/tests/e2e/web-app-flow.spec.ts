import { expect, type Page, test } from '@playwright/test';
import { seededUser, uniqueLabel } from './helpers/waiagents';

test('web app flow: auth, chat, feed, pages, marketplace, settings', async ({ page }) => {
  const alex = seededUser('alex');
  const groupTitle = uniqueLabel('pw-group');
  const messageText = uniqueLabel('ui-message');
  const editedMessageText = `${messageText}-edited`;
  const pageTitle = uniqueLabel('pw-page');
  const pageSlug = uniqueLabel('pw-page-slug');
  const pagePath = `pages/${pageSlug}/index.html`;

  await page.goto('/');
  await loginThroughUi(page, alex.email, alex.password);

  await expect(page.getByRole('heading', { name: 'WaiAgents Web' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel('New Group Title').fill(groupTitle);
  await page.getByRole('button', { name: 'Create Group' }).click();

  await expect(
    page.locator('.conversation-row.active').filter({ hasText: groupTitle }),
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Message' }).fill(messageText);
  await page.getByRole('button', { name: 'Send' }).click();

  const messageCard = page.locator('[data-message-id]').filter({ hasText: messageText }).first();
  await expect(messageCard).toBeVisible();

  await messageCard.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Edit message').fill(editedMessageText);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.locator('[data-message-id]').filter({ hasText: editedMessageText }).first(),
  ).toBeVisible();

  const editedCard = page
    .locator('[data-message-id]')
    .filter({ hasText: editedMessageText })
    .first();
  await editedCard.getByRole('button', { name: '👍' }).click();

  await editedCard.getByRole('button', { name: 'Delete' }).click();
  await expect
    .poll(async () => {
      const toastCount = await page.getByText('Message deleted').count();
      const editedCount = await page
        .locator('[data-message-id]')
        .filter({ hasText: editedMessageText })
        .count();
      return toastCount > 0 || editedCount === 0;
    })
    .toBeTruthy();

  await page.getByRole('button', { name: 'Feed' }).click();
  await expect(page.getByRole('heading', { name: 'Feed' })).toBeVisible();
  await expect(page.locator('[data-feed-id]').first()).toBeVisible();

  const likeButton = page
    .locator('[data-feed-id]')
    .first()
    .getByRole('button', { name: /Like|Unlike/ });
  const beforeText = await likeButton.textContent();
  await likeButton.click();
  if (beforeText?.includes('Like')) {
    await expect(likeButton).toContainText('Unlike');
  }

  await page.getByRole('button', { name: 'Pages' }).click();
  await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();

  const createPageForm = page.locator('form').filter({ hasText: 'Create Page' }).first();
  await createPageForm.getByLabel('Title').fill(pageTitle);
  await createPageForm.getByLabel('Slug').fill(pageSlug);
  await createPageForm.getByLabel('R2 Path').fill(pagePath);
  await createPageForm.getByRole('button', { name: 'Create Page' }).click();

  await expect
    .poll(async () => {
      const activeRowCount = await page
        .locator('.page-row.active')
        .filter({ hasText: pageSlug })
        .count();
      const createdBannerCount = await page.getByText(`Created page ${pageSlug}`).count();
      return activeRowCount > 0 || createdBannerCount > 0;
    })
    .toBeTruthy();

  const detailForm = page.locator('form').filter({ hasText: 'Page Detail' }).first();
  await detailForm.getByLabel('Description').fill('Page created in Playwright flow');
  await detailForm.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Page updated.')).toBeVisible();

  await page.getByRole('button', { name: 'Marketplace' }).click();
  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await expect(page.locator('.market-row').first()).toBeVisible();

  await page.locator('.market-row').first().click();
  await page.getByRole('button', { name: 'Try Agent' }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();
});

async function loginThroughUi(page: Page, email: string, password: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator("form.panel-form button[type='submit']").click();

    try {
      await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible({ timeout: 15_000 });
      return;
    } catch (error) {
      const isLastAttempt = attempt === 4;
      if (isLastAttempt) {
        throw error;
      }

      await page.waitForTimeout(13_000);
    }
  }
}
