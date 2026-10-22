import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  ADA,
  type FakeRole,
  fakeProject,
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

/** A role that manages a project's members and nothing else in it. */
const LEAD: FakeRole = {
  id: '01a1569b-9900-7000-8000-000000000601',
  name: 'Lead',
  color: 'violet',
  grantsAll: false,
  permissions: ['issue.read', 'issue.create', 'project.members.manage'],
};

const KATHERINE = memberOf(
  {
    id: '01a1569b-9900-7000-8000-000000000003',
    name: 'Katherine Johnson',
    email: 'katherine@example.com',
    permissions: [],
  },
  ROLE_BADGES.requester,
);

/** The fake server, with Lead among the roles and Katherine among the members. */
function serverWith(user: typeof ADA, projects = [fakeProject('WEB', 'Website')]) {
  const server = fakeServer({ user, projects });
  server.state.roles.push(LEAD);
  server.state.users.push(KATHERINE);
  return server;
}

/** Grace leads WEB: she manages its members, within her own rights there. */
const GRACE_LEADS = () => [
  fakeProject('WEB', 'Website', {
    members: [
      { userId: ADA.id, roleId: null },
      { userId: GRACE.id, roleId: LEAD.id },
    ],
  }),
];

const roleOf = (name: string) =>
  page.getByRole('button', { name: new RegExp(`^Role of ${name} in the project, `) });

describe('the general settings of a project', () => {
  it('rename it and change its key, the address following the key', async () => {
    const server = serverWith(ADA);
    const { screen, router } = await renderApp({ path: '/projects/WEB/settings' });

    await screen.getByLabelText('Name').fill('Public website');
    await screen.getByLabelText('Key').fill('site');
    await screen.getByRole('button', { name: 'Save' }).click();

    await expect.element(screen.getByLabelText('Key')).toHaveValue('SITE');
    expect(router.state.location.pathname).toBe('/projects/SITE/settings');
    expect(server.requests).toContainEqual({
      method: 'PATCH',
      path: '/api/v1/projects/WEB',
      body: { key: 'SITE', name: 'Public website', description: '' },
    });
  });

  it('keep the key once the project has had issues', async () => {
    serverWith(ADA, [fakeProject('WEB', 'Website', { keyEditable: false })]);
    const { screen } = await renderApp({ path: '/projects/WEB/settings' });

    await expect.element(screen.getByLabelText('Key')).toHaveAttribute('readonly');
    await expect.element(screen.getByText('Fixed: the project has had issues.')).toBeVisible();
  });

  it('archive it after asking, then bring it back', async () => {
    const server = serverWith(ADA);
    const { screen } = await renderApp({ path: '/projects/WEB/settings' });

    await screen.getByRole('button', { name: 'Archive', exact: true }).click();
    const dialog = screen.getByRole('dialog', { name: 'Archive Website?' });
    await dialog.getByRole('button', { name: 'Archive the project' }).click();

    // Read-only: nothing left to edit, only the way back.
    await expect.element(screen.getByRole('button', { name: 'Unarchive' })).toBeVisible();
    await expect.element(screen.getByLabelText('Name')).not.toBeInTheDocument();
    expect(server.state.projects[0]?.archived).toBe(true);

    await screen.getByRole('button', { name: 'Unarchive' }).click();

    await expect.element(screen.getByLabelText('Name')).toHaveValue('Website');
    expect(server.state.projects[0]?.archived).toBe(false);
  });

  it('send who only manages the members to them', async () => {
    serverWith(GRACE, GRACE_LEADS());
    const { screen, router } = await renderApp({ path: '/projects/WEB/settings' });

    await expect.element(screen.getByRole('table')).toBeVisible();
    expect(router.state.location.pathname).toBe('/projects/WEB/settings/members');
    await expect
      .element(
        screen
          .getByRole('navigation', { name: 'Project settings sections' })
          .getByRole('link', { name: 'General' }),
      )
      .not.toBeInTheDocument();
  });

  it('are closed to a member who manages nothing in the project', async () => {
    serverWith(GRACE);
    const { screen } = await renderApp({ path: '/projects/WEB/settings' });

    await expect.element(screen.getByText('You do not have access to this page')).toBeVisible();
  });
});

describe('the members of a project', () => {
  it('show with the role they have there', async () => {
    serverWith(ADA, GRACE_LEADS());
    await renderApp({ path: '/projects/WEB/settings/members' });

    await expect
      .element(roleOf('Ada Lovelace'))
      .toHaveAccessibleName(/, Own role \(Administrator\)$/);
    await expect.element(roleOf('Grace Hopper')).toHaveAccessibleName(/, Lead$/);
  });

  it('get someone new, with the role chosen for the project', async () => {
    const server = serverWith(ADA);
    const { screen } = await renderApp({ path: '/projects/WEB/settings/members' });

    await screen.getByRole('button', { name: 'Add members' }).click();
    const dialog = screen.getByRole('dialog', { name: 'Add members' });
    await dialog.getByRole('checkbox', { name: /Katherine Johnson/ }).click();
    await expect.element(dialog.getByText('1 person selected')).toBeVisible();
    await dialog.getByLabelText('Role in the project').selectOptions('Lead');
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();

    await expect.element(roleOf('Katherine Johnson')).toHaveAccessibleName(/, Lead$/);
    expect(server.requests).toContainEqual({
      method: 'POST',
      path: '/api/v1/projects/WEB/members',
      body: { userIds: [KATHERINE.id], roleId: LEAD.id },
    });
  });

  it('change role in place, and leave', async () => {
    const server = serverWith(ADA);
    const { screen } = await renderApp({ path: '/projects/WEB/settings/members' });

    await roleOf('Grace Hopper').click();
    await screen.getByRole('menuitemradio', { name: 'Lead' }).click();

    await expect.element(roleOf('Grace Hopper')).toHaveAccessibleName(/, Lead$/);
    expect(server.state.projects[0]?.members).toContainEqual({ userId: GRACE.id, roleId: LEAD.id });

    await roleOf('Grace Hopper').click();
    await screen.getByRole('menuitemradio', { name: 'Own role (Team)' }).click();

    await expect.element(roleOf('Grace Hopper')).toHaveAccessibleName(/, Own role \(Team\)$/);

    await screen.getByRole('button', { name: 'Actions for Grace Hopper' }).click();
    await screen.getByRole('menuitem', { name: 'Remove from the project' }).click();

    await expect.element(screen.getByText('Grace Hopper')).not.toBeInTheDocument();
    expect(server.state.projects[0]?.members).toEqual([{ userId: ADA.id, roleId: null }]);
  });

  it('cannot get more rights than their manager holds in the project', async () => {
    serverWith(GRACE, GRACE_LEADS());
    const { screen } = await renderApp({ path: '/projects/WEB/settings/members' });

    // Lead is hers to give; Team brings creating projects, an instance right she may not hand out
    // here, and the system role is nobody's to give.
    await roleOf('Ada Lovelace').click();
    await expect.element(screen.getByRole('menuitemradio', { name: 'Lead' })).toBeVisible();
    await expect
      .element(screen.getByRole('menuitemradio', { name: 'Administrator' }))
      .not.toBeInTheDocument();
    await screen.getByRole('menuitemradio', { name: 'Lead' }).click();

    // Ada is an administrator: the server refuses, and her role comes back.
    await expect
      .element(screen.getByText('You cannot give more rights than you hold in this project.'))
      .toBeVisible();
    await expect
      .element(roleOf('Ada Lovelace'))
      .toHaveAccessibleName(/, Own role \(Administrator\)$/);
  });
});
