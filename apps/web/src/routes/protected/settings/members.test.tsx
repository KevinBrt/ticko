import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  ADA,
  fakeServer,
  GRACE,
  memberOf,
  ROLE_BADGES,
  renderApp,
} from '../../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A former client, deactivated. */
const ELOISE = {
  id: '01a1569b-9900-7000-8000-000000000003',
  name: 'Éloïse Turing',
  email: 'eloise@client.example',
  role: ROLE_BADGES.requester,
  deactivatedAt: '2026-10-01T09:00:00.000Z',
};

/** The State column of a member's row, as shown on wide screens. */
function stateOf(name: string) {
  return page.getByRole('row').filter({ hasText: name }).getByRole('cell').nth(2);
}

describe('the members screen', () => {
  it('lists every member with their role and state', async () => {
    const server = fakeServer({ user: ADA });
    server.state.users.push(ELOISE);
    const { screen } = await renderApp({ path: '/settings/members' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    await expect.element(screen.getByText('3 members', { exact: true })).toBeVisible();
    await expect
      .element(screen.getByRole('combobox', { name: 'Role of Grace Hopper' }))
      .toHaveValue(DEFAULT_ROLE_IDS.team);
    const adaRow = screen.getByRole('row').filter({ hasText: 'Ada Lovelace' });
    await expect.element(adaRow.getByText('(you)')).toBeVisible();
    await expect.element(adaRow.getByText('Administrator')).toBeVisible();
    await expect.element(stateOf('Ada Lovelace')).toHaveTextContent('Active');
    await expect.element(stateOf('Éloïse Turing')).toHaveTextContent('Deactivated');
    await expect.element(screen.getByText('3 members shown')).toBeVisible();
  });

  it('never lets one change one’s own role or deactivate oneself', async () => {
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/members' });

    await expect
      .element(screen.getByRole('combobox', { name: 'Role of Grace Hopper' }))
      .toBeVisible();
    await expect
      .element(screen.getByRole('combobox', { name: 'Role of Ada Lovelace' }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Actions for Ada Lovelace' }))
      .not.toBeInTheDocument();
  });

  it('filters by role, with a count per tab, and by search', async () => {
    const server = fakeServer({ user: ADA });
    server.state.users.push(ELOISE);
    const { screen } = await renderApp({ path: '/settings/members' });
    const filters = screen.getByRole('group', { name: 'Filter by role' });

    await filters.getByRole('button', { name: 'Team 1' }).click();

    await expect
      .element(filters.getByRole('button', { name: 'Team 1' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByText('1 member shown')).toBeVisible();
    await expect
      .element(screen.getByRole('table').getByText('Ada Lovelace'))
      .not.toBeInTheDocument();

    await filters.getByRole('button', { name: 'All 3' }).click();
    await screen.getByRole('searchbox', { name: 'Name or email' }).fill('eloise');

    await expect.element(screen.getByText('Éloïse Turing')).toBeVisible();
    await expect.element(screen.getByText('1 member shown')).toBeVisible();

    await screen.getByRole('searchbox', { name: 'Name or email' }).fill('nobody');
    await expect.element(screen.getByText('No member matches this search.')).toBeVisible();
  });

  it('changes a role', async () => {
    const server = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/members' });
    const role = screen.getByRole('combobox', { name: 'Role of Grace Hopper' });

    await role.selectOptions('Requester');

    await expect.element(role).toHaveValue(DEFAULT_ROLE_IDS.requester);
    expect(server.requests).toContainEqual({
      method: 'PATCH',
      path: `/api/v1/users/${GRACE.id}`,
      body: { roleId: DEFAULT_ROLE_IDS.requester },
    });
  });

  it('deactivates and reactivates a member from the row menu', async () => {
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/members' });
    await screen.getByRole('button', { name: 'Actions for Grace Hopper' }).click();
    await screen.getByRole('menuitem', { name: 'Deactivate' }).click();

    await expect.element(stateOf('Grace Hopper')).toHaveTextContent('Deactivated');
    await screen.getByRole('button', { name: 'Actions for Grace Hopper' }).click();
    await screen.getByRole('menuitem', { name: 'Reactivate' }).click();

    await expect.element(stateOf('Grace Hopper')).toHaveTextContent('Active');
  });

  it('puts things back and says why when the server refuses', async () => {
    // Grace is the only administrator left: demoting her is what the server refuses.
    fakeServer({
      user: ADA,
      users: [memberOf(ADA, ROLE_BADGES.team), memberOf(GRACE, ROLE_BADGES.administrator)],
    });
    const { screen } = await renderApp({ path: '/settings/members' });
    const role = screen.getByRole('combobox', { name: 'Role of Grace Hopper' });

    await role.selectOptions('Team');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Toppo must keep at least one active administrator.');
    await expect.element(role).toHaveValue(DEFAULT_ROLE_IDS.administrator);
  });

  it('is closed to users who cannot manage members, without asking the server', async () => {
    const server = fakeServer({ user: GRACE });
    const { screen } = await renderApp({ path: '/settings/members' });

    await expect
      .element(screen.getByRole('heading', { name: 'You do not have access to this page' }))
      .toBeVisible();
    expect(server.requests.map((request) => request.path)).not.toContain('/api/v1/users');
  });

  it('fits a 320 px phone without scrolling sideways', async () => {
    await page.viewport(320, 640);
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/members' });
    await expect
      .element(screen.getByRole('button', { name: 'Actions for Grace Hopper' }))
      .toBeVisible();

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
