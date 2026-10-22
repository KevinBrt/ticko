import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

const PASSWORD = 'a long passphrase for the new member';
const NEW_PASSWORD = 'another long passphrase, of their own choosing';

// Desktop only: sign-ins are rate limited, and phones have no other path to cover here.
test('an invited member joins, cannot open the settings, sets up their account, and is deleted', {
  tag: '@desktop-only',
}, async ({ page, browser, baseURL }) => {
  const email = `invited-${Date.now()}@example.com`;

  await page.goto('/settings/members');
  await page.getByRole('button', { name: 'Invite members' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite members' });
  await dialog.getByLabel('Email addresses').fill(email);
  await dialog.getByLabel('Role').selectOption({ label: 'Team' });
  await dialog.getByRole('button', { name: 'Create the links' }).click();
  const link = await page.getByRole('textbox', { name: `Link for ${email}` }).inputValue();
  expect(link).toMatch(/\/invitation#[A-Za-z0-9_-]{43}$/);
  await page.getByRole('button', { name: 'Done' }).click();
  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row.getByRole('cell').nth(2)).toHaveText('Invited');

  // The new member, in a browser of their own.
  const visitor = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    locale: 'en-US',
    // Explicitly empty: contexts would otherwise start with the administrator's session.
    storageState: { cookies: [], origins: [] },
  });
  const invitee = await visitor.newPage();
  await invitee.goto(link);
  await expect(
    invitee.getByText(`${ADMIN.name} invited you to Toppo with the address ${email}.`),
  ).toBeVisible();
  await expectAccessible(invitee);
  await invitee.getByLabel('Your name').fill('Grace Hopper');
  await invitee.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await invitee.getByRole('button', { name: 'Create my account' }).click();

  await expect(invitee.getByText('Your account is ready. Sign in to continue.')).toBeVisible();
  await expect(invitee.getByLabel('Email')).toHaveValue(email);
  await invitee.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await invitee.getByRole('button', { name: 'Sign in' }).click();

  await expect(invitee.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
  const navigation = invitee.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link', { name: 'Settings' })).toHaveCount(0);
  await invitee.goto('/settings/members');
  await expect(
    invitee.getByRole('heading', { name: 'You do not have access to this page' }),
  ).toBeVisible();

  // Their own account: a fuller name, and a password of their own.
  await invitee.getByRole('link', { name: /^My account/ }).click();
  await invitee.getByLabel('Name').fill('Grace Brewster Hopper');
  await invitee.getByRole('button', { name: 'Save' }).click();
  await expect(invitee.getByText('Your name is saved.')).toBeVisible();
  await invitee.getByLabel('Current password').fill(PASSWORD);
  await invitee.getByLabel('New password').fill(NEW_PASSWORD);
  await invitee.getByRole('button', { name: 'Change password' }).click();
  await expect(
    invitee.getByText('Your password is changed. Your other devices are signed out.'),
  ).toBeVisible();
  // This device carries on, in the new session.
  await invitee.reload();
  await expect(
    invitee.getByRole('link', { name: /^My account Grace Brewster Hopper/ }),
  ).toBeVisible();
  await visitor.close();

  // The administrator now sees a member where the invitation was…
  await page.reload();
  await expect(row.getByRole('cell').nth(2)).toHaveText('Active');

  // …and can erase them for good, after confirming.
  await page.getByRole('button', { name: 'Actions for Grace Brewster Hopper' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: 'Delete Grace Brewster Hopper?' })
    .getByRole('button', { name: 'Delete for good' })
    .click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
  await expect(row).toHaveCount(0);
});
