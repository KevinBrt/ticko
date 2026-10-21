import { ADMIN_STORAGE_STATE, SETUP_CODE } from '../playwright.config.ts';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

test('a fresh instance leads to an administrator who is signed in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Set up Toppo' })).toBeVisible();
  await expectAccessible(page);

  await page.getByLabel('Setup code').fill(SETUP_CODE);
  await page.getByLabel('Your name').fill(ADMIN.name);
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Create administrator account' }).click();

  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
  await expect(page.getByText(ADMIN.email)).toBeVisible();

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
