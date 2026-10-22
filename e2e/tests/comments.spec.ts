import { randomInt } from 'node:crypto';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

test('a comment is written, edited, then deleted', async ({ page, baseURL }) => {
  const key = `C${randomInt(36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')}`;
  const headers = { origin: baseURL ?? '' };
  expect(
    (
      await page.request.post('/api/v1/projects', { headers, data: { key, name: `Talk ${key}` } })
    ).status(),
  ).toBe(201);
  expect(
    (
      await page.request.post(`/api/v1/projects/${key}/issues`, {
        headers,
        data: { title: 'Invoices fail to download' },
      })
    ).status(),
  ).toBe(201);

  await page.goto(`/issues/${key}-1`);
  const activity = page.getByRole('region', { name: 'Activity' });
  const box = activity.getByRole('textbox', { name: 'Add a comment' });
  await expect(box).toHaveAttribute('placeholder', 'Write a comment…');
  await box.fill('Seen on **Safari**.\nNot on Firefox.');
  await activity.getByRole('button', { name: 'Send' }).click();

  const comment = activity.getByRole('listitem').filter({ hasText: `${ADMIN.name} commented` });
  const words = comment.getByText('Seen on **Safari**.');
  await expect(words).toHaveJSProperty('innerText', 'Seen on **Safari**.\nNot on Firefox.');
  await expect(comment.locator('strong')).toHaveCount(0);
  await expect(box).toHaveValue('');
  await expectAccessible(page);

  await comment.getByRole('button', { name: `Actions on the comment of ${ADMIN.name}` }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await comment
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Seen on every browser.');
  await comment.getByRole('button', { name: 'Save' }).click();
  await expect(comment.getByText('Seen on every browser.')).toBeVisible();
  await expect(comment.getByText('edited', { exact: true })).toBeVisible();

  await comment.getByRole('button', { name: `Actions on the comment of ${ADMIN.name}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this comment?' });
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Delete the comment' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(activity.getByText('Seen on every browser.')).toHaveCount(0);
  await expect(activity.getByText(`${ADMIN.name} created the issue`)).toBeVisible();
});
