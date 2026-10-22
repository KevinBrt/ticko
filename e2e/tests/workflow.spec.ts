import { randomInt } from 'node:crypto';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

// The instance's workflow is shared by every test: changed alone, once the other tests are done,
// and put back as it was.
test('an administrator adds a status to the workflow, issues may move to it, then it goes', {
  tag: '@instance',
}, async ({ page, baseURL }) => {
  const suffix = randomInt(36 ** 5)
    .toString(36)
    .toUpperCase();
  const name = `Review ${suffix}`;
  await page.goto('/settings/statuses');
  await expect(page.getByRole('heading', { level: 1, name: 'Statuses' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Add a status' }).click();
  const dialog = page.getByRole('dialog', { name: 'New status' });
  await dialog.getByLabel('Name').fill(name);
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('checkbox', { name: `From New to ${name}` }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Workflow saved.')).toBeVisible();

  const key = `W${suffix}`;
  const created = await page.request.post('/api/v1/projects', {
    headers: { origin: baseURL ?? '' },
    data: { key, name: `Workflow ${key}` },
  });
  expect(created.status()).toBe(201);
  const issue = await page.request.post(`/api/v1/projects/${key}/issues`, {
    headers: { origin: baseURL ?? '' },
    data: { title: 'Check the invoices' },
  });
  expect(issue.status()).toBe(201);
  await page.goto(`/issues/${key}-1`);
  await page.getByRole('main').getByRole('button', { name: 'Status, New' }).first().click();
  await expect(page.getByRole('menuitemradio', { name })).toBeVisible();
  await page.keyboard.press('Escape');

  // Back as it was: the status taken out, its issues (none) going to New.
  await page.goto('/settings/statuses');
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Remove' }).click();
  await page
    .getByRole('dialog', { name: `Remove “${name}”?` })
    .getByRole('button', { name: 'Remove the status' })
    .click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Workflow saved.')).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});

test('on phones, the moves show one status at a time', {
  tag: '@mobile-only',
}, async ({ page }) => {
  await page.goto('/settings/statuses');

  const fromNew = page.getByRole('group', { name: /^New/ });
  await expect(fromNew.getByRole('checkbox', { name: 'To do' })).toBeChecked();
  await expect(page.getByRole('columnheader')).toHaveCount(0);
  await expectAccessible(page);
});
