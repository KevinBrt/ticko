import type { Page } from '@playwright/test';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

const PASSWORD = 'a long passphrase for the new member';
const NEW_PASSWORD = 'another long passphrase, of their own choosing';

/** Grants or withdraws "Manage members" for `role` in the matrix, and saves. */
async function setManageMembers(page: Page, role: string, granted: boolean) {
  await page.goto('/settings/roles');
  const manageMembers = page.getByRole('switch', { name: `Manage members, ${role}` });
  await (granted ? manageMembers.check() : manageMembers.uncheck());
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Permissions saved.')).toBeVisible();
}

// Desktop only: sign-ins are rate limited, and this journey signs a second person in.
test('a member’s access follows their role, from the invitation to their deletion', {
  tag: '@desktop-only',
}, async ({ page, browser, baseURL }) => {
  const role = `Coordinator ${Date.now()}`;
  const email = `invited-${Date.now()}@example.com`;

  // A role of the administrator's own making, which manages members.
  await page.goto('/settings/roles');
  await page.getByRole('button', { name: 'New role' }).click();
  const newRole = page.getByRole('dialog', { name: 'New role' });
  await newRole.getByLabel('Name').fill(role);
  await newRole.getByRole('button', { name: 'Create the role' }).click();
  await expect(page.getByRole('button', { name: `Actions for ${role}` })).toBeVisible();
  await setManageMembers(page, role, true);

  // An invitation with that role, by link.
  await page.goto('/settings/members');
  await page.getByRole('button', { name: 'Invite members' }).click();
  const invite = page.getByRole('dialog', { name: 'Invite members' });
  await invite.getByLabel('Email addresses').fill(email);
  await invite.getByLabel('Role').selectOption({ label: role });
  await invite.getByRole('button', { name: 'Create the links' }).click();
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
  const member = await visitor.newPage();
  await member.goto(link);
  await expect(
    member.getByText(`${ADMIN.name} invited you to Toppo with the address ${email}.`),
  ).toBeVisible();
  await expectAccessible(member);
  await member.getByLabel('Your name').fill('Grace Hopper');
  await member.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await member.getByRole('button', { name: 'Create my account' }).click();
  await expect(member.getByText('Your account is ready. Sign in to continue.')).toBeVisible();
  await expect(member.getByLabel('Email')).toHaveValue(email);
  await member.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await member.getByRole('button', { name: 'Sign in' }).click();
  await expect(member.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();

  // Their role lets them manage members, and nothing more of the settings.
  const navigation = member.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Settings' }).click();
  await expect(member.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
  await expect(
    member
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('link', { name: 'Roles and permissions' }),
  ).toHaveCount(0);
  await member.goto('/settings/roles');
  await expect(
    member.getByRole('heading', { name: 'You do not have access to this page' }),
  ).toBeVisible();

  // The administrator takes the permission back: it applies on the member's next request.
  await setManageMembers(page, role, false);
  await member.goto('/settings/members');
  await expect(
    member.getByRole('heading', { name: 'You do not have access to this page' }),
  ).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Settings' })).toHaveCount(0);

  // Their own account: a fuller name, and a password of their own.
  await member.getByRole('link', { name: /^My account/ }).click();
  await member.getByLabel('Name').fill('Grace Brewster Hopper');
  await member.getByRole('button', { name: 'Save' }).click();
  await expect(member.getByText('Your name is saved.')).toBeVisible();
  await member.getByLabel('Current password').fill(PASSWORD);
  await member.getByLabel('New password').fill(NEW_PASSWORD);
  await member.getByRole('button', { name: 'Change password' }).click();
  await expect(
    member.getByText('Your password is changed. Your other devices are signed out.'),
  ).toBeVisible();
  // This device carries on, in the new session.
  await member.reload();
  await expect(
    member.getByRole('link', { name: /^My account Grace Brewster Hopper/ }),
  ).toBeVisible();
  await visitor.close();

  // The role cannot be deleted while the member has it…
  await page.getByRole('button', { name: `Actions for ${role}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const blocked = page.getByRole('dialog', { name: `Delete ${role}?` });
  await expect(blocked).toContainText('Still used by 1 member.');
  await blocked.getByRole('button', { name: 'OK' }).click();

  // …so the administrator erases the member for good, after confirming…
  await page.goto('/settings/members');
  await expect(row.getByRole('cell').nth(2)).toHaveText('Active');
  await page.getByRole('button', { name: 'Actions for Grace Brewster Hopper' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: 'Delete Grace Brewster Hopper?' })
    .getByRole('button', { name: 'Delete for good' })
    .click();
  await expect(row).toHaveCount(0);

  // …then deletes the role nobody has any more.
  await page.goto('/settings/roles');
  await page.getByRole('button', { name: `Actions for ${role}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: `Delete ${role}?` })
    .getByRole('button', { name: 'Delete the role' })
    .click();
  await expect(page.getByRole('button', { name: `Actions for ${role}` })).toHaveCount(0);
});
