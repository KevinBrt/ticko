import { randomInt } from 'node:crypto';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

/** A key no other test has taken: desktop and phone run side by side on one database. */
function uniqueKey(): string {
  return `P${randomInt(36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')}`;
}

test('a project is created, set up, archived and brought back', async ({ page }) => {
  const key = uniqueKey();
  const name = `Customer portal ${key}`;

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Key').fill(key);
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Create the project' }).click();

  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page).toHaveURL(`/projects/${key}`);
  await expectAccessible(page);

  // Its settings: another name.
  await page.getByRole('main').getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Name').fill(`Client portal ${key}`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expectAccessible(page);

  // Its members: its creator, with their own role.
  const sections = page.getByRole('navigation', { name: 'Project settings sections' });
  await sections.getByRole('link', { name: 'Members' }).click();
  await expect(
    page.getByRole('button', {
      name: `Role of ${ADMIN.name} in the project, Own role (Administrator)`,
    }),
  ).toBeVisible();
  await expectAccessible(page);

  // Archived: read-only, out of the active projects, and back after.
  await sections.getByRole('link', { name: 'General' }).click();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await page
    .getByRole('dialog', { name: `Archive Client portal ${key}?` })
    .getByRole('button', { name: 'Archive the project' })
    .click();
  await expect(page.getByRole('button', { name: 'Unarchive' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveCount(0);

  await page.goto(`/projects?q=${key}`);
  await expect(page.getByText('No project matches this search.')).toBeVisible();
  await page.getByRole('button', { name: /^Archived/ }).click();
  await page.getByRole('link', { name: new RegExp(`^${key}`) }).click();
  await expect(page.getByText('This project is archived: it is read-only.')).toBeVisible();

  await page.getByRole('main').getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Unarchive' }).click();
  await expect(page.getByLabel('Name')).toHaveValue(`Client portal ${key}`);
});

test.describe('out of reach', () => {
  // The browser reports the 404 answer in the console; it is expected here.
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test('a project answers as if it did not exist', async ({ page }) => {
    await page.goto('/projects/NOPE404');

    await expect(
      page.getByText('This project does not exist, or you do not have access to it.'),
    ).toBeVisible();
    await expectAccessible(page);
  });
});
