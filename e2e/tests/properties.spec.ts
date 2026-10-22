import { randomInt } from 'node:crypto';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

// Categories are one list for the whole instance: only one browser changes it, the desktop one.
test('an administrator adds a category, new issues get it by default, then removes it', {
  tag: '@desktop-only',
}, async ({ page, baseURL }) => {
  const suffix = randomInt(36 ** 5)
    .toString(36)
    .toUpperCase();
  const name = `Incident ${suffix}`;
  await page.goto('/settings/properties');
  await expect(page.getByRole('heading', { level: 1, name: 'Issue properties' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: /^Category/ }).click();
  const panel = page.getByRole('dialog', { name: 'Category' });
  await panel.getByRole('textbox', { name: 'New option' }).fill(name);
  await panel.getByRole('button', { name: 'Add', exact: true }).click();
  await panel.getByRole('combobox', { name: 'Default' }).selectOption(name);
  await expectAccessible(page);
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: new RegExp(`^Category .*${name}`) })).toBeVisible();

  const key = `P${suffix}`;
  const created = await page.request.post('/api/v1/projects', {
    headers: { origin: baseURL ?? '' },
    data: { key, name: `Properties ${key}` },
  });
  expect(created.status()).toBe(201);
  await page.goto(`/issues/new?project=${key}`);
  await expect(page.getByRole('radio', { name })).toBeChecked();

  // Back as it was: Request for new issues, the category gone, no issue having it.
  await page.goto('/settings/properties');
  await page.getByRole('button', { name: /^Category/ }).click();
  await panel.getByRole('combobox', { name: 'Default' }).selectOption('Request');
  await panel.getByRole('button', { name: `Remove ${name}` }).click();
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: new RegExp(name) })).toHaveCount(0);
});

test('on phones, a property opens over the whole screen', {
  tag: '@mobile-only',
}, async ({ page }) => {
  await page.goto('/settings/properties');

  await page.getByRole('button', { name: /^Priority/ }).click();
  const panel = page.getByRole('dialog', { name: 'Priority' });
  await expect(panel.getByRole('textbox', { name: 'Option 1' })).toHaveValue('Urgent');
  // Within a pixel: the phone's scale factor rounds it.
  expect((await panel.boundingBox())?.width).toBeCloseTo(page.viewportSize()?.width ?? 0, 0);
  await expectAccessible(page);

  await panel.getByRole('button', { name: 'Cancel' }).click();
  await expect(panel).toHaveCount(0);
});
