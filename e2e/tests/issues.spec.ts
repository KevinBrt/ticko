import { randomInt } from 'node:crypto';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

/** A key no other test has taken: desktop and phone run side by side on one database. */
function uniqueKey(): string {
  return `I${randomInt(36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')}`;
}

test('an issue is reported, moved through the workflow and closed', async ({ page, baseURL }) => {
  const key = uniqueKey();
  const created = await page.request.post('/api/v1/projects', {
    headers: { origin: baseURL ?? '' },
    data: { key, name: `Support ${key}` },
  });
  expect(created.status()).toBe(201);

  await page.goto(`/issues?project=${key}`);
  await expect(page.getByText('No issues yet')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'New issue' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'New issue' })).toBeVisible();
  await page.getByLabel('Subject').fill('Invoices fail to download');
  // Written as it reads: the shortcut turns "every" bold, no Markdown mark is typed.
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.keyboard.type('Since this morning, ');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type('every');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type(' invoice fails.');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Create the issue' }).click();

  await expect(page).toHaveURL(`/issues/${key}-1`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Invoices fail to download' }),
  ).toBeVisible();
  await expect(page.getByText('every', { exact: true })).toBeVisible();
  await expectAccessible(page);

  // Only the statuses the workflow allows next are offered.
  const status = (name: string) =>
    page
      .getByRole('main')
      .getByRole('button', { name: `Status, ${name}` })
      .first();
  await status('New').click();
  await expect(page.getByRole('menuitemradio', { name: 'Waiting' })).toHaveCount(0);
  await page.getByRole('menuitemradio', { name: 'In progress' }).click();
  await status('In progress').click();
  await page.getByRole('menuitemradio', { name: 'Resolved' }).click();
  await expect(status('Resolved')).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Activity' })
      .getByRole('listitem')
      .first()
      .filter({ hasText: 'changed the status In progress to Resolved' }),
  ).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: 'Assignee, Unassigned' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(ADMIN.name) })
    .click();
  await expect(
    page.getByRole('main').getByRole('button', { name: `Assignee, ${ADMIN.name}` }),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Issues' })
    .click();
  const row = page.getByRole('row').filter({ hasText: `${key}-1` });
  await expect(row.getByText('Resolved')).toBeVisible();
  await expectAccessible(page);

  // Given to oneself, closed or not, it is among one's issues.
  await page.goto('/my-issues');
  await expect(page.getByRole('row').filter({ hasText: `${key}-1` })).toBeVisible();
  await expectAccessible(page);
});
