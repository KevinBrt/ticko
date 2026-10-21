import { ADMIN } from './admin.ts';
import { expect, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

test('the settings open on the members, where the administrator finds their account', async ({
  page,
}) => {
  await page.goto('/settings');

  await expect(page).toHaveURL(/\/settings\/members$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
  const own = page.getByRole('row').filter({ hasText: ADMIN.email });
  await expect(own.getByText('(you)')).toBeVisible();
  await expect(own.getByText('Administrator')).toBeVisible();
});

test('an administrator cannot change their own role or deactivate themselves', async ({ page }) => {
  await page.goto('/settings/members');
  await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();

  await expect(page.getByRole('button', { name: `Role of ${ADMIN.name}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Actions for ${ADMIN.name}` })).toHaveCount(0);
});
