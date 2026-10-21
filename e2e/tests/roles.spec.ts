import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

test('an administrator creates a role, chooses its permissions and deletes it', {
  tag: '@desktop-only',
}, async ({ page }) => {
  const name = `Auditor ${Date.now()}`;
  await page.goto('/settings/roles');

  await page.getByRole('button', { name: 'New role' }).click();
  const dialog = page.getByRole('dialog', { name: 'New role' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByText('Cyan').click();
  await dialog.getByRole('button', { name: 'Create the role' }).click();

  const comment = page.getByRole('switch', { name: `Comment, ${name}` });
  const issues = page.getByRole('combobox', { name: `See issues, ${name}` });
  await expect(comment).not.toBeChecked();
  await comment.check();
  await issues.selectOption('own');
  await expect(page.getByText('2 unsaved changes')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Permissions saved.')).toBeVisible();

  await page.reload();
  await expect(comment).toBeChecked();
  await expect(issues).toHaveValue('own');

  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: `Delete ${name}?` })
    .getByRole('button', { name: 'Delete the role' })
    .click();
  await expect(comment).toHaveCount(0);
});

test('on phones, roles show one at a time, with switches large enough for touch', {
  tag: '@mobile-only',
}, async ({ page }) => {
  await page.goto('/settings/roles');

  await page
    .getByRole('group', { name: 'Role shown' })
    .getByRole('button', { name: 'Team' })
    .click();

  const create = page.getByRole('switch', { name: 'Create issues, Team' });
  await expect(create).toBeChecked();
  expect((await create.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});
